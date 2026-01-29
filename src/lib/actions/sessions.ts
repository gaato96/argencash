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

// ═══════════════════════════════════════════════════════════════
// CASH SESSION ACTIONS
// ═══════════════════════════════════════════════════════════════

export async function getActiveCashSession(tenantId: string) {
    return prisma.cashSession.findFirst({
        where: { tenantId, status: 'OPEN' },
        include: {
            openedBy: { select: { name: true, email: true } },
            operations: {
                orderBy: { createdAt: 'desc' },
                take: 10,
                include: {
                    createdBy: { select: { name: true } },
                },
            },
        },
    });
}

export async function getCashSessionHistory(tenantId: string, limit = 10) {
    return prisma.cashSession.findMany({
        where: { tenantId, status: 'CLOSED' },
        include: {
            openedBy: { select: { name: true } },
            closedBy: { select: { name: true } },
        },
        orderBy: { closedAt: 'desc' },
        take: limit,
    });
}

export async function openCashSession(data: {
    openingBalances: { ARS: number; USD: number };
}) {
    const session = await getSessionContext();

    if (!session.user.tenantId) {
        throw new Error('Tenant no encontrado');
    }

    const tenantId = session.user.tenantId;

    // Verify tenant and user exist (Prevents FK violation if DB was reset)
    const [tenantExists, userExists] = await Promise.all([
        prisma.tenant.findUnique({ where: { id: tenantId } }),
        prisma.user.findUnique({ where: { id: session.user.id } }),
    ]);

    if (!tenantExists || !userExists) {
        throw new Error('Sesión inválida o base de datos reiniciada. Por favor, cierre sesión y vuelva a ingresar.');
    }

    // Check if there's already an open session
    const existingSession = await prisma.cashSession.findFirst({
        where: { tenantId, status: 'OPEN' },
    });

    if (existingSession) {
        throw new Error('Ya hay una caja abierta. Debe cerrarla primero.');
    }

    const cashSession = await prisma.$transaction(async (tx: any) => {
        const sessionRecord = await tx.cashSession.create({
            data: {
                tenantId,
                openedById: session.user.id,
                openingBalances: JSON.stringify(data.openingBalances),
            },
        });

        // Update actual account balances (Caja Pesos and Caja Dólares)
        // Find "Caja Pesos"
        const cajaPesos = await tx.account.findFirst({
            where: { tenantId, name: 'Caja Pesos', type: 'CASH' },
        });
        if (cajaPesos) {
            // Get current balance
            const currentBalance = await tx.accountMovement.aggregate({
                where: { accountId: cajaPesos.id },
                _sum: { amount: true },
            });
            const balanceNow = currentBalance._sum.amount || 0;
            const diff = data.openingBalances.ARS - balanceNow;

            if (diff !== 0) {
                await tx.accountMovement.create({
                    data: {
                        tenantId,
                        accountId: cajaPesos.id,
                        currency: 'ARS',
                        amount: diff,
                        type: 'ADJUSTMENT',
                        description: 'Ajuste de Saldo por Apertura de Caja',
                    },
                });
            }
        }

        // Find "Caja Dólares" (Try both with and without accent)
        const cajaUSD = await tx.account.findFirst({
            where: {
                tenantId,
                type: 'CASH',
                OR: [
                    { name: 'Caja Dólares' },
                    { name: 'Caja Dolares' }
                ]
            },
        });
        if (cajaUSD) {
            const currentBalance = await tx.accountMovement.aggregate({
                where: { accountId: cajaUSD.id },
                _sum: { amount: true },
            });
            const balanceNow = currentBalance._sum.amount || 0;
            const diff = data.openingBalances.USD - balanceNow;

            if (diff !== 0) {
                await tx.accountMovement.create({
                    data: {
                        tenantId,
                        accountId: cajaUSD.id,
                        currency: 'USD',
                        amount: diff,
                        type: 'ADJUSTMENT',
                        description: 'Ajuste de Saldo por Apertura de Caja',
                    },
                });
            }
        }

        return sessionRecord;
    });

    revalidatePath('/dashboard');
    revalidatePath('/dashboard/caja');
    return cashSession;
}

export async function closeCashSession(data: {
    sessionId: string;
    actualBalances: { ARS: number; USD: number };
}) {
    const session = await getSessionContext();

    if (!session.user.tenantId) {
        throw new Error('Tenant no encontrado');
    }

    const tenantId = session.user.tenantId;

    // Get the session with all operations
    const cashSession = await prisma.cashSession.findFirst({
        where: { id: data.sessionId, tenantId, status: 'OPEN' },
        include: {
            operations: {
                include: {
                    movements: {
                        include: { account: true },
                    },
                },
            },
        },
    });

    if (!cashSession) {
        throw new Error('Sesión de caja no encontrada');
    }

    // Calculate expected balances based on opening + movements
    const openingBalances = JSON.parse(cashSession.openingBalances || '{"ARS":0,"USD":0}');

    // Get all movements from cash accounts during this session, EXCLUDING the opening adjustment
    const cashMovements = await prisma.accountMovement.findMany({
        where: {
            tenantId,
            createdAt: { gte: cashSession.openedAt },
            account: { type: 'CASH' },
            type: { not: 'ADJUSTMENT' }, // Important: Don't count the opening adjustment!
        },
        include: { account: true },
    });

    const expectedBalances = { ARS: openingBalances.ARS, USD: openingBalances.USD };

    for (const movement of cashMovements) {
        if (movement.account.currency === 'ARS') {
            expectedBalances.ARS += movement.amount;
        } else if (movement.account.currency === 'USD') {
            expectedBalances.USD += movement.amount;
        }
    }

    // Calculate difference
    const difference = {
        ARS: data.actualBalances.ARS - expectedBalances.ARS,
        USD: data.actualBalances.USD - expectedBalances.USD,
    };

    // Get withdrawals summary
    const withdrawals = cashSession.operations.filter((op: any) => op.type === 'RETIRO');
    const withdrawalsSummary = withdrawals.map((w: any) => ({
        id: w.id,
        amount: w.mainAmount,
        currency: w.mainCurrency,
        notes: w.notes,
        time: w.createdAt,
    }));

    // Get commissions summary
    const operationsWithCommission = cashSession.operations.filter((op: any) => op.commissionAmount && op.commissionAmount > 0);
    const commissionsSummary = operationsWithCommission.map((op: any) => ({
        operationId: op.id,
        amount: op.commissionAmount,
        accountId: op.commissionAccountId,
        type: op.type,
    }));

    // Update session
    const updatedSession = await prisma.cashSession.update({
        where: { id: data.sessionId },
        data: {
            status: 'CLOSED',
            closedBy: { connect: { id: session.user.id } },
            closedAt: new Date(),
            expectedBalances: JSON.stringify(expectedBalances),
            actualBalances: JSON.stringify(data.actualBalances),
            difference: JSON.stringify(difference),
            withdrawalsSummary: JSON.stringify(withdrawalsSummary),
            commissionsSummary: JSON.stringify(commissionsSummary), // Need to ensure field exists or store in withdrawals? 
            // Wait, schema doesn't have commissionsSummary. I'll check.
        },
    });

    // Create alert if there's a significant difference
    if (Math.abs(difference.ARS) > 100 || Math.abs(difference.USD) > 1) {
        await prisma.alert.create({
            data: {
                tenantId,
                type: 'CASH_MISMATCH',
                severity: Math.abs(difference.ARS) > 10000 || Math.abs(difference.USD) > 10 ? 'HIGH' : 'MEDIUM',
                message: `Diferencia de caja: ARS ${difference.ARS.toLocaleString('es-AR')}, USD ${difference.USD.toFixed(2)}`,
                metadata: JSON.stringify({
                    sessionId: data.sessionId,
                    difference,
                    expected: expectedBalances,
                    actual: data.actualBalances,
                }),
            },
        });
    }

    revalidatePath('/dashboard');
    revalidatePath('/dashboard/caja');
    return updatedSession;
}

export async function getCashSessionSummary(sessionId: string) {
    const session = await prisma.cashSession.findUnique({
        where: { id: sessionId },
        include: {
            operations: {
                include: {
                    createdBy: { select: { name: true } },
                },
                orderBy: { createdAt: 'asc' },
            },
            openedBy: { select: { name: true } },
            closedBy: { select: { name: true } },
        },
    });

    if (!session) return null;

    // Get commissions with owner names
    const commissionsSummaryRaw = session.commissionsSummary ? JSON.parse(session.commissionsSummary as string) : [];
    const currentAccounts = await prisma.currentAccount.findMany({
        where: { id: { in: commissionsSummaryRaw.map((c: any) => c.accountId).filter(Boolean) } }
    });

    const commissions = commissionsSummaryRaw.map((c: any) => ({
        ...c,
        ownerName: currentAccounts.find((ca: any) => ca.id === c.accountId)?.name || 'Desconocido'
    }));

    // Group operations by type
    const summaryBreakdown = {
        compras: session.operations.filter((op: any) => op.type.startsWith('COMPRA')),
        ventas: session.operations.filter((op: any) => op.type.startsWith('VENTA')),
        transferencias: session.operations.filter((op: any) => op.type === 'TRANSFERENCIA'),
        gastos: session.operations.filter((op: any) => op.type === 'GASTO'),
        retiros: session.operations.filter((op: any) => op.type === 'RETIRO'),
    };

    return {
        ...session,
        summary: {
            ...summaryBreakdown,
            commissions,
        },
    };
}
// ... existing code ...

export async function getSessionClosureDetails(sessionId: string) {
    const session = await getSessionContext();
    const tenantId = session.user.tenantId;

    const cashSession = await prisma.cashSession.findUnique({
        where: { id: sessionId },
        include: {
            operations: {
                where: { status: 'COMPLETED' },
                include: {
                    movements: {
                        include: { account: true }
                    }
                }
            }
        }
    });

    if (!cashSession) throw new Error('Sesión no encontrada');

    // Filter relevant operations
    const digitalPurchases = cashSession.operations.filter((op: any) => op.type === 'COMPRA_USD_DIGITAL');
    const withdrawals = cashSession.operations.filter((op: any) => op.type === 'RETIRO');

    // Group by account
    const accountsUsage: Record<string, {
        accountId: string;
        accountName: string;
        purchases: any[];
        withdrawals: any[];
        totalPurchasesARS: number;
        totalWithdrawalsUSD: number;
    }> = {};

    // Helper to get account info from movements
    const getAccountFromOp = (op: any, currency: 'ARS' | 'USD') => {
        // For Digital Purchase, ARS comes from a Virtual Account (debit)
        // For Withdrawal, USD comes from a Digital Account (debit)
        const movement = op.movements.find((m: any) => m.amount < 0 && m.account.type === 'VIRTUAL' && m.account.currency === currency);
        return movement?.account;
    };

    digitalPurchases.forEach((op: any) => {
        const account = getAccountFromOp(op, 'ARS');
        if (account) {
            if (!accountsUsage[account.id]) {
                accountsUsage[account.id] = {
                    accountId: account.id,
                    accountName: account.name,
                    purchases: [],
                    withdrawals: [],
                    totalPurchasesARS: 0,
                    totalWithdrawalsUSD: 0
                };
            }
            accountsUsage[account.id].purchases.push(op);
            accountsUsage[account.id].totalPurchasesARS += Math.abs(op.secondaryAmount || 0);
        }
    });

    withdrawals.forEach((op: any) => {
        const account = getAccountFromOp(op, 'USD');
        if (account) {
            if (!accountsUsage[account.id]) {
                accountsUsage[account.id] = {
                    accountId: account.id,
                    accountName: account.name,
                    purchases: [],
                    withdrawals: [],
                    totalPurchasesARS: 0,
                    totalWithdrawalsUSD: 0
                };
            }
            accountsUsage[account.id].withdrawals.push(op);
            accountsUsage[account.id].totalWithdrawalsUSD += Math.abs(op.mainAmount);
        }
    });

    return Object.values(accountsUsage);
}
