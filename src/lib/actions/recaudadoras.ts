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

export async function getPendingDeposits(recaudadoraId: string) {
    await getSessionContext();
    return prisma.recaudadoraMovement.findMany({
        where: {
            recaudadoraId,
            isVerified: false,
        },
        orderBy: { createdAt: 'desc' },
    });
}

export async function getPendingDepositCounts(tenantId: string) {
    await getSessionContext();
    const recaudadoras = await prisma.recaudadora.findMany({
        where: { tenantId, isActive: true },
        select: { id: true },
    });

    const counts: Record<string, number> = {};
    for (const rec of recaudadoras) {
        const count = await prisma.recaudadoraMovement.count({
            where: { recaudadoraId: rec.id, isVerified: false },
        });
        if (count > 0) counts[rec.id] = count;
    }
    return counts;
}

export async function createRecaudadora(data: {
    clientName: string;
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
            commissionRate: tenant?.commissionRate || 0.01,
        },
    });

    revalidatePath('/dashboard/recaudadoras');
    return recaudadora;
}

export async function recordRecaudadoraDeposit(data: {
    recaudadoraId: string;
    deposits: Array<{ amount: number; description?: string; paymentDate?: string; confirmed: boolean }>;
    targetAccountId?: string;
}) {
    const session = await getSessionContext();
    if (!session.user.tenantId) throw new Error('Tenant no encontrado');
    const tenantId = session.user.tenantId;

    const recaudadora = await prisma.recaudadora.findUnique({
        where: { id: data.recaudadoraId },
    });
    if (!recaudadora) throw new Error('Recaudadora no encontrada');

    const confirmedDeposits = data.deposits.filter(d => d.confirmed);
    const pendingDeposits = data.deposits.filter(d => !d.confirmed);
    const confirmedTotal = confirmedDeposits.reduce((sum, d) => sum + d.amount, 0);

    await prisma.$transaction(async (tx: any) => {
        // 1. Record confirmed movements
        for (const deposit of confirmedDeposits) {
            await tx.recaudadoraMovement.create({
                data: {
                    recaudadoraId: data.recaudadoraId,
                    amount: deposit.amount,
                    description: deposit.description || 'Cobranza masiva',
                    paymentDate: deposit.paymentDate ? new Date(deposit.paymentDate) : null,
                    isVerified: true,
                },
            });
        }

        // 2. Record pending (unverified) movements
        for (const deposit of pendingDeposits) {
            await tx.recaudadoraMovement.create({
                data: {
                    recaudadoraId: data.recaudadoraId,
                    amount: deposit.amount,
                    description: deposit.description || 'Cobranza masiva (pendiente)',
                    paymentDate: deposit.paymentDate ? new Date(deposit.paymentDate) : null,
                    isVerified: false,
                },
            });

            // Create alert for pending deposit
            await tx.alert.create({
                data: {
                    tenantId,
                    type: 'PENDING_DEPOSIT',
                    severity: 'WARNING',
                    message: `Depósito pendiente de verificar: ${deposit.amount.toLocaleString('es-AR', { style: 'currency', currency: 'ARS' })} en ${recaudadora.clientName}`,
                    metadata: JSON.stringify({
                        recaudadoraId: data.recaudadoraId,
                        amount: deposit.amount,
                        paymentDate: deposit.paymentDate,
                    }),
                    status: 'ACTIVE',
                },
            });
        }

        // 3. Update Accumulated (only confirmed)
        if (confirmedTotal > 0) {
            await tx.recaudadora.update({
                where: { id: data.recaudadoraId },
                data: { dailyAccumulated: { increment: confirmedTotal } },
            });
        }

        // 4. Physical account entry (only confirmed total)
        if (data.targetAccountId && confirmedTotal > 0) {
            await tx.accountMovement.create({
                data: {
                    tenantId,
                    accountId: data.targetAccountId,
                    currency: 'ARS',
                    amount: confirmedTotal,
                    type: 'OPERATION',
                    description: `Recaudación ${recaudadora.clientName}`,
                },
            });
        }
    });

    revalidatePath('/dashboard/recaudadoras');
    revalidatePath('/dashboard/cuentas');
}

export async function verifyRecaudadoraDeposit(movementId: string) {
    const session = await getSessionContext();
    if (!session.user.tenantId) throw new Error('Tenant no encontrado');
    const tenantId = session.user.tenantId;

    const movement = await prisma.recaudadoraMovement.findUnique({
        where: { id: movementId },
        include: { recaudadora: true },
    });

    if (!movement) throw new Error('Movimiento no encontrado');
    if (movement.isVerified) throw new Error('Ya fue verificado');

    await prisma.$transaction(async (tx: any) => {
        // 1. Mark as verified
        await tx.recaudadoraMovement.update({
            where: { id: movementId },
            data: { isVerified: true },
        });

        // 2. Add to accumulated
        await tx.recaudadora.update({
            where: { id: movement.recaudadoraId },
            data: { dailyAccumulated: { increment: movement.amount } },
        });

        // 3. Resolve related alerts
        const alerts = await tx.alert.findMany({
            where: {
                tenantId,
                type: 'PENDING_DEPOSIT',
                status: 'ACTIVE',
            },
        });

        for (const alert of alerts) {
            try {
                const metadata = JSON.parse(alert.metadata || '{}');
                if (metadata.recaudadoraId === movement.recaudadoraId && metadata.amount === movement.amount) {
                    await tx.alert.update({
                        where: { id: alert.id },
                        data: { status: 'RESOLVED', resolvedAt: new Date() },
                    });
                    break;
                }
            } catch { /* skip invalid metadata */ }
        }
    });

    revalidatePath('/dashboard/recaudadoras');
    revalidatePath('/dashboard/cuentas');
}

export async function liquidateRecaudadora(data: {
    recaudadoraId: string;
    payments: Array<{ accountId: string; amount: number }>;
    commissionRate: number;
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

    const commission = amountToLiquidate * data.commissionRate;
    const netAmount = amountToLiquidate - commission;
    const currency = 'ARS';

    // Validate payments sum
    const paymentsTotal = data.payments.reduce((sum, p) => sum + p.amount, 0);
    if (Math.abs(paymentsTotal - netAmount) > 0.01) {
        throw new Error(`La suma de pagos (${paymentsTotal.toFixed(2)}) no coincide con el neto a liquidar (${netAmount.toFixed(2)})`);
    }

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

        // 2. DEBIT each payment from corresponding account
        for (const payment of data.payments) {
            await tx.accountMovement.create({
                data: {
                    tenantId,
                    accountId: payment.accountId,
                    currency,
                    amount: -payment.amount,
                    type: 'OPERATION',
                    referenceId: operation.id,
                    description: `Pago Liquidación ${recaudadora.clientName} (neto parcial)`,
                },
            });
        }

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
