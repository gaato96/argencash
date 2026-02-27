'use server';

import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import bcrypt from 'bcryptjs';

async function checkSuperAdmin() {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'SUPERADMIN') {
        throw new Error('Unauthorized');
    }
    return session;
}

export async function getTenants() {
    await checkSuperAdmin();

    return prisma.tenant.findMany({
        orderBy: { createdAt: 'desc' },
        include: {
            _count: {
                select: { users: true, accounts: true }
            }
        }
    });
}

export async function getTenant(id: string) {
    await checkSuperAdmin();
    return prisma.tenant.findUnique({
        where: { id },
    });
}

export async function createTenant(data: {
    name: string;
    slug: string;
    plan: string;
    commissionRate: number;
    enabledModules: string;
    adminEmail: string;
    adminName: string;
    adminPassword: string;
}) {
    await checkSuperAdmin();

    // 1. Validate Slug Uniqueness
    const existingTenant = await prisma.tenant.findUnique({
        where: { slug: data.slug },
    });
    if (existingTenant) {
        throw new Error('Tenant slug already exists');
    }

    // 2. Validate Admin Email Uniqueness
    const existingUser = await prisma.user.findUnique({
        where: { email: data.adminEmail },
    });
    if (existingUser) {
        throw new Error('User email already exists');
    }

    // 3. Create Tenant and Admin User transactionally
    const hashedPassword = await bcrypt.hash(data.adminPassword, 10);

    return prisma.$transaction(async (tx: any) => {
        const newTenant = await tx.tenant.create({
            data: {
                name: data.name,
                slug: data.slug,
                plan: data.plan,
                commissionRate: data.commissionRate,
                enabledModules: data.enabledModules,
                isActive: true,
            },
        });

        await tx.user.create({
            data: {
                name: data.adminName,
                email: data.adminEmail,
                password: hashedPassword,
                role: 'ADMIN',
                tenantId: newTenant.id,
            },
        });

        return JSON.parse(JSON.stringify(newTenant));
    });
}

export async function toggleTenantStatus(tenantId: string, isActive: boolean) {
    await checkSuperAdmin();
    return prisma.tenant.update({
        where: { id: tenantId },
        data: { isActive },
    });
}

export async function updateTenantModules(tenantId: string, enabledModules: string) {
    await checkSuperAdmin();
    return prisma.tenant.update({
        where: { id: tenantId },
        data: { enabledModules },
    });
}

export async function getGlobalUsers() {
    await checkSuperAdmin();
    return prisma.user.findMany({
        orderBy: { createdAt: 'desc' },
        include: {
            tenant: {
                select: { name: true, slug: true }
            }
        }
    });
}

export async function deleteTenant(tenantId: string) {
    await checkSuperAdmin();

    // Manual cascade delete in correct dependency order
    const deleted = await prisma.$transaction(async (tx: any) => {
        // 1. Delete movements that reference operations (AccountMovement.referenceId -> Operation.id)
        await tx.accountMovement.deleteMany({ where: { tenantId } });

        // 2. Delete operations
        await tx.operation.deleteMany({ where: { tenantId } });

        // 3. Delete cash sessions
        await tx.cashSession.deleteMany({ where: { tenantId } });

        // 4. Delete accounts
        await tx.account.deleteMany({ where: { tenantId } });

        // 5. Delete recaudadora movements (depend on recaudadoras)
        const recaudadoras = await tx.recaudadora.findMany({ where: { tenantId }, select: { id: true } });
        const recaudadoraIds = recaudadoras.map((r: any) => r.id);
        if (recaudadoraIds.length > 0) {
            await tx.recaudadoraMovement.deleteMany({ where: { recaudadoraId: { in: recaudadoraIds } } });
        }
        await tx.recaudadora.deleteMany({ where: { tenantId } });

        // 6. Delete current account movements (depend on current accounts)
        const currentAccounts = await tx.currentAccount.findMany({ where: { tenantId }, select: { id: true } });
        const currentAccountIds = currentAccounts.map((ca: any) => ca.id);
        if (currentAccountIds.length > 0) {
            await tx.currentAccountMovement.deleteMany({ where: { currentAccountId: { in: currentAccountIds } } });
        }
        await tx.currentAccount.deleteMany({ where: { tenantId } });

        // 7. Delete other tenant-level records
        await tx.usdStockEntry.deleteMany({ where: { tenantId } });
        await tx.notebookEntry.deleteMany({ where: { tenantId } });
        await tx.alert.deleteMany({ where: { tenantId } });

        // 8. Delete users
        await tx.user.deleteMany({ where: { tenantId } });

        // 9. Finally delete the tenant itself
        const tenant = await tx.tenant.delete({ where: { id: tenantId } });
        return tenant;
    });

    return JSON.parse(JSON.stringify(deleted));
}

export async function getUser(userId: string) {
    await checkSuperAdmin();
    return prisma.user.findUnique({
        where: { id: userId },
        include: {
            tenant: { select: { id: true, name: true } }
        }
    });
}

export async function createUser(data: {
    name: string;
    email: string;
    password: string;
    role: 'SUPERADMIN' | 'ADMIN' | 'USER';
    tenantId?: string;
}) {
    await checkSuperAdmin();

    const existingUser = await prisma.user.findUnique({
        where: { email: data.email },
    });
    if (existingUser) {
        throw new Error('El email ya está uso');
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);

    return prisma.user.create({
        data: {
            name: data.name,
            email: data.email,
            password: hashedPassword,
            role: data.role as any,
            tenantId: data.tenantId || null,
        },
    });
}

export async function updateUser(userId: string, data: {
    name?: string;
    email?: string;
    password?: string;
    role?: 'SUPERADMIN' | 'ADMIN' | 'USER';
    tenantId?: string | null;
}) {
    await checkSuperAdmin();

    const updateData: any = { ...data };

    if (data.password) {
        updateData.password = await bcrypt.hash(data.password, 10);
    } else {
        delete updateData.password;
    }

    return prisma.user.update({
        where: { id: userId },
        data: updateData,
    });
}

export async function deleteUser(userId: string) {
    await checkSuperAdmin();

    // Handle FK references before deleting
    await prisma.$transaction(async (tx: any) => {
        // Nullify cash session closedById references
        await tx.cashSession.updateMany({
            where: { closedById: userId },
            data: { closedById: null },
        });

        // Delete cash sessions opened by this user
        await tx.cashSession.deleteMany({
            where: { openedById: userId },
        });

        // Delete notebook entries by this user
        await tx.notebookEntry.deleteMany({
            where: { createdById: userId },
        });

        // Delete operations created by this user (and their movements first)
        const operations = await tx.operation.findMany({
            where: { createdById: userId },
            select: { id: true },
        });
        const operationIds = operations.map((op: any) => op.id);
        if (operationIds.length > 0) {
            await tx.accountMovement.deleteMany({
                where: { referenceId: { in: operationIds } },
            });
            await tx.operation.deleteMany({
                where: { createdById: userId },
            });
        }

        // Finally delete the user
        await tx.user.delete({ where: { id: userId } });
    });

    return { success: true };
}

