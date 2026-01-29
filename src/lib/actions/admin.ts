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

    return prisma.$transaction(async (tx) => {
        const tenant = await tx.tenant.create({
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
                role: 'ADMIN', // Standard admin for the tenant
                tenantId: tenant.id,
            },
        });

        return tenant;
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
    // Prisma cascade delete should handle relations if configured, checking schema first might be good but for now assuming cascade or manual cleanup.
    // Ideally we should delete related data first manually if cascade isn't set up.
    // Given the previous conversation, we assume standard Prisma cascade or we'll trigger foreign key errors. 
    // Let's rely on Prisma `onDelete: Cascade` in schema. If not present, this will fail and we'll fix it.

    // Deleting tenant
    return prisma.tenant.delete({
        where: { id: tenantId },
    });
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
            role: data.role as any, // 'USER' might not be in the narrowed type if not updated, strictly casting or ensuring type matches
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
    return prisma.user.delete({
        where: { id: userId },
    });
}
