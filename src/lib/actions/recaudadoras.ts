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

export async function getRecaudadoras(tenantId: string) {
    return prisma.recaudadora.findMany({
        where: { tenantId, isActive: true },
        include: {
            movements: {
                orderBy: { createdAt: 'desc' },
                take: 10,
            },
        },
        orderBy: { clientName: 'asc' },
    });
}

export async function createRecaudadora(data: {
    clientName: string;
    commissionRate?: number;
}) {
    const session = await getSessionContext();
    if (!session.user.tenantId) throw new Error('Tenant no encontrado');

    const tenant = await prisma.tenant.findUnique({
        where: { id: session.user.tenantId },
    });

    const recaudadora = await prisma.recaudadora.create({
        data: {
            tenantId: session.user.tenantId,
            clientName: data.clientName,
            commissionRate: data.commissionRate || tenant?.commissionRate || 0.01,
        },
    });

    revalidatePath('/dashboard/recaudadoras');
    return recaudadora;
}

export async function recordRecaudadoraDeposit(data: {
    recaudadoraId: string;
    deposits: Array<{ amount: number; description?: string }>;
    targetAccountId?: string; // Optional: where the money physically entered
}) {
    const session = await getSessionContext();
    if (!session.user.tenantId) throw new Error('Tenant no encontrado');
    const tenantId = session.user.tenantId;

    const recaudadora = await prisma.recaudadora.findUnique({
        where: { id: data.recaudadoraId },
    });
    if (!recaudadora) throw new Error('Recaudadora no encontrada');

    const totalAmount = data.deposits.reduce((sum, d) => sum + d.amount, 0);

    await prisma.$transaction(async (tx: any) => {
        // 1. Record movements in Recaudadora (Debt increases)
        for (const deposit of data.deposits) {
            await tx.recaudadoraMovement.create({
                data: {
                    recaudadoraId: data.recaudadoraId,
                    amount: deposit.amount,
                    description: deposit.description || 'Cobranza masiva',
                },
            });
        }

        // 2. Update Accumulated
        await tx.recaudadora.update({
            where: { id: data.recaudadoraId },
            data: { dailyAccumulated: { increment: totalAmount } },
        });

        // 3. Physical account entry (Liquidity IN)
        if (data.targetAccountId) {
            await tx.accountMovement.create({
                data: {
                    tenantId,
                    accountId: data.targetAccountId,
                    currency: 'ARS',
                    amount: totalAmount,
                    type: 'OPERATION',
                    description: `Recaudación ${recaudadora.clientName}`,
                },
            });
        }
    });

    revalidatePath('/dashboard/recaudadoras');
    revalidatePath('/dashboard/cuentas');
}

export async function liquidateRecaudadora(data: {
    recaudadoraId: string;
    destinationAccountId: string;
}) {
    const session = await getSessionContext();
    if (!session.user.tenantId) throw new Error('Tenant no encontrado');
    const tenantId = session.user.tenantId;

    const recaudadora = await prisma.recaudadora.findUnique({
        where: { id: data.recaudadoraId },
    });
    if (!recaudadora) throw new Error('Recaudadora no encontrada');

    const amountToLiquidate = recaudadora.dailyAccumulated;
    if (amountToLiquidate <= 0) throw new Error('No hay saldo acumulado');

    const cashSession = await prisma.cashSession.findFirst({
        where: { tenantId, status: 'OPEN' },
    });

    const commission = amountToLiquidate * recaudadora.commissionRate;
    const netAmount = amountToLiquidate - commission;
    const currency = 'ARS';

    const result = await prisma.$transaction(async (tx: any) => {
        // 1. Liquidation operation
        const operation = await tx.operation.create({
            data: {
                tenantId,
                type: 'LIQUIDACION_RECAUDADORA',
                mainAmount: amountToLiquidate,
                mainCurrency: currency,
                secondaryAmount: commission,
                createdById: session.user.id,
                cashSessionId: cashSession?.id,
                notes: `Liquidación ${recaudadora.clientName}`,
            },
        });

        // 2. DEBIT Net Amount (We pay client)
        await tx.accountMovement.create({
            data: {
                tenantId,
                accountId: data.destinationAccountId,
                currency,
                amount: -netAmount,
                type: 'OPERATION',
                referenceId: operation.id,
                description: `Pago Liquidación ${recaudadora.clientName} (neto)`,
            },
        });

        // 3. Commission Income (Profit)
        if (commission > 0) {
            await tx.operation.create({
                data: {
                    tenantId,
                    type: 'INGRESO_COMISION',
                    mainAmount: commission,
                    mainCurrency: currency,
                    createdById: session.user.id,
                    cashSessionId: cashSession?.id,
                    notes: `Comisión Liquidación ${recaudadora.clientName}`,
                },
            });
        }

        // 4. Update Recaudadora
        await tx.recaudadora.update({
            where: { id: data.recaudadoraId },
            data: {
                dailyAccumulated: 0,
                lastResetAt: new Date(),
            },
        });

        return operation;
    });

    revalidatePath('/dashboard');
    revalidatePath('/dashboard/recaudadoras');
    revalidatePath('/dashboard/cuentas');
    return result;
}
