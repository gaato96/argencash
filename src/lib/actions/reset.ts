'use server';

import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { revalidatePath } from 'next/cache';

async function getSessionContext() {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        throw new Error('No autorizado');
    }
    return session;
}

export async function resetTenantData() {
    const session = await getSessionContext();
    const tenantId = session.user.tenantId;

    if (!tenantId) {
        throw new Error('Tenant no encontrado');
    }

    if (session.user.role !== 'SUPERADMIN' && session.user.role !== 'ADMIN') {
        throw new Error('Solo los administradores pueden resetear los datos');
    }

    await prisma.$transaction(async (tx: any) => {
        // 1. Delete all AccountMovements (physical/virtual balances)
        await tx.accountMovement.deleteMany({
            where: { tenantId }
        });

        // 2. Delete all CurrentAccountMovements
        const currentAccounts = await tx.currentAccount.findMany({
            where: { tenantId },
            select: { id: true }
        });
        const currentAccountIds = currentAccounts.map((c: any) => c.id);
        if (currentAccountIds.length > 0) {
            await tx.currentAccountMovement.deleteMany({
                where: { currentAccountId: { in: currentAccountIds } }
            });
        }

        // 3. Delete all Recaudadora Movements
        const recaudadoras = await tx.recaudadora.findMany({
            where: { tenantId },
            select: { id: true }
        });
        const recaudadoraIds = recaudadoras.map((r: any) => r.id);
        if (recaudadoraIds.length > 0) {
            await tx.recaudadoraMovement.deleteMany({
                where: { recaudadoraId: { in: recaudadoraIds } }
            });
        }

        // 4. Delete Operations
        await tx.operation.deleteMany({
            where: { tenantId }
        });

        // 5. Delete Cash Sessions
        await tx.cashSession.deleteMany({
            where: { tenantId }
        });

        // 6. Delete Notebook Entries
        await tx.notebookEntry.deleteMany({
            where: { tenantId }
        });

        // 7. Delete Alerts
        await tx.alert.deleteMany({
            where: { tenantId }
        });

        // 8. Delete UsdStock
        await tx.usdStockEntry.deleteMany({
            where: { tenantId }
        });

        // Reset balances on Accounts
        await tx.account.updateMany({
            where: { tenantId },
            data: { initialBalance: 0 }
        });

        // Reset balances on CurrentAccounts
        await tx.currentAccount.updateMany({
            where: { tenantId },
            data: { balanceARS: 0, balanceUSD: 0 }
        });

        // Reset daily accumulated on Recaudadoras
        await tx.recaudadora.updateMany({
            where: { tenantId },
            data: { dailyAccumulated: 0, lastResetAt: new Date() }
        });
    });

    revalidatePath('/', 'layout');
    return { success: true };
}
