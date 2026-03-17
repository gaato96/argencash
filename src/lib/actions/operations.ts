'use server';

import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { detectSurplus } from '@/lib/calculations';

// Get current session
async function getSessionContext() {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        throw new Error('No autorizado');
    }
    return session;
}

// ═══════════════════════════════════════════════════════════════
// GET OPERATIONS
// ═══════════════════════════════════════════════════════════════

export async function getOperations(tenantId: string, options?: {
    date?: Date;
    type?: string;
    limit?: number;
}) {
    const where: Record<string, unknown> = { tenantId };

    if (options?.date) {
        const startOfDay = new Date(options.date);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(options.date);
        endOfDay.setHours(23, 59, 59, 999);
        where.createdAt = { gte: startOfDay, lte: endOfDay };
    }

    if (options?.type) {
        where.type = options.type;
    }

    return prisma.operation.findMany({
        where,
        include: {
            createdBy: { select: { name: true, email: true } },
            movements: {
                include: { account: { select: { id: true, name: true, currency: true } } },
            },
        },
        orderBy: { createdAt: 'desc' },
        take: options?.limit || 50,
    });
}

// ═══════════════════════════════════════════════════════════════
// BUY USD (COMPRA)
// ═══════════════════════════════════════════════════════════════

export async function createBuyOperation(data: {
    usdAmount: number;
    exchangeRate: number;
    usdAccountId: string;        // Account we receive USD into
    payments: Array<{ accountId: string; amount: number }>; // Multiple origins
    isDigital?: boolean;         // If true, check for surplus
    thirdPartyAccountId?: string; // For digital: account we sent ARS to
    arsAmountSent?: number;
    notes?: string;
    commissionAccountId?: string; // Digital account owner
    commissionAmount?: number;
}) {
    const session = await getSessionContext();

    if (!session.user.tenantId) {
        throw new Error('Tenant no encontrado');
    }

    const tenantId = session.user.tenantId;
    const arsAmount = data.usdAmount * data.exchangeRate;

    // Get active cash session
    const cashSession = await prisma.cashSession.findFirst({
        where: { tenantId, status: 'OPEN' },
    });

    if (!cashSession) {
        throw new Error('No hay caja abierta. Debe abrir la caja primero.');
    }

    // Check for surplus in digital purchase
    let alertToCreate = null;
    if (data.isDigital && data.arsAmountSent && data.thirdPartyAccountId) {
        const surplus = detectSurplus({
            amountSent: data.arsAmountSent,
            usdPurchased: data.usdAmount,
            rate: data.exchangeRate,
        });

        if (surplus.hasSurplus) {
            alertToCreate = {
                tenantId,
                type: 'SURPLUS_PENDING',
                severity: 'HIGH' as const,
                message: `Devolución pendiente: $${surplus.amount.toLocaleString('es-AR')} en cuenta tercero`,
                metadata: JSON.stringify({
                    accountId: data.thirdPartyAccountId,
                    amount: surplus.amount,
                    operationType: 'COMPRA_USD',
                }),
            };
        }
    }

    // Validate payments total
    const totalPayments = data.payments.reduce((acc, p) => acc + p.amount, 0);
    if (Math.abs(totalPayments - arsAmount) > 1) {
        throw new Error(`La suma de los pagos (${totalPayments}) debe ser igual al total a pagar (${arsAmount})`);
    }

    // Get account details to categorize amounts (Cash vs Transfer)
    const accountIds = data.payments.map(p => p.accountId);
    const originAccounts = await prisma.account.findMany({
        where: { id: { in: accountIds } }
    });

    let totalCashAmount = 0;
    let totalTransferAmount = 0;

    data.payments.forEach(payment => {
        const acc = originAccounts.find(a => a.id === payment.accountId);
        if (acc?.type === 'CASH') {
            totalCashAmount += payment.amount;
        } else {
            totalTransferAmount += payment.amount;
        }
    });

    const result = await prisma.$transaction(async (tx: any) => {
        // Create operation
        const operation = await tx.operation.create({
            data: {
                tenantId,
                type: data.isDigital ? 'COMPRA_USD_DIGITAL' : 'COMPRA_USD',
                mainAmount: data.usdAmount,
                mainCurrency: 'USD',
                secondaryAmount: arsAmount,
                exchangeRate: data.exchangeRate,
                cashAmount: totalCashAmount,
                transferAmount: totalTransferAmount,
                createdById: session.user.id,
                cashSessionId: cashSession.id,
                notes: data.notes,
                commissionAmount: data.commissionAmount,
                commissionAccountId: data.commissionAccountId,
            },
        });

        // 1. Debit ARS based on payment lines
        for (const payment of data.payments) {
            if (payment.amount <= 0) continue;
            await tx.accountMovement.create({
                data: {
                    tenantId,
                    accountId: payment.accountId,
                    currency: 'ARS',
                    amount: -payment.amount,
                    type: 'OPERATION',
                    referenceId: operation.id,
                    description: `Compra USD ${data.usdAmount} @ ${data.exchangeRate}`,
                },
            });
        }

        // 2. Credit USD to destination account
        await tx.accountMovement.create({
            data: {
                tenantId,
                accountId: data.usdAccountId,
                currency: 'USD',
                amount: data.usdAmount,
                type: 'OPERATION',
                referenceId: operation.id,
                description: `Compra USD ${data.usdAmount} @ ${data.exchangeRate}`,
            },
        });

        // 3. Add to USD stock for PPP tracking
        await tx.usdStockEntry.create({
            data: {
                tenantId,
                amount: data.usdAmount,
                rate: data.exchangeRate,
                remaining: data.usdAmount,
                operationId: operation.id,
            },
        });

        // Create alert if surplus detected
        if (alertToCreate) {
            await tx.alert.create({ data: alertToCreate });
        }

        // 4. Record commission as debt to account owner
        if (data.commissionAccountId && data.commissionAmount) {
            const ca = await tx.currentAccount.update({
                where: { id: data.commissionAccountId },
                data: { balanceARS: { decrement: data.commissionAmount } },
            });
            await tx.currentAccountMovement.create({
                data: {
                    currentAccountId: data.commissionAccountId,
                    type: 'BORROW',
                    amount: data.commissionAmount,
                    currency: 'ARS',
                    balanceAfterARS: ca.balanceARS,
                    balanceAfterUSD: ca.balanceUSD,
                    description: `Comisión compra USD digital (Op: ${operation.id.slice(-6)})`,
                },
            });
        }

        return operation;
    });

    revalidatePath('/dashboard');
    revalidatePath('/dashboard/operaciones');
    return result;
}

// ═══════════════════════════════════════════════════════════════
// SELL USD (VENTA)
// ═══════════════════════════════════════════════════════════════

export async function createSellOperation(data: {
    usdAmount: number;
    exchangeRate: number;
    usdAccountId: string;          // Account we take USD from
    payments: Array<{ accountId: string; amount: number }>; // Multiple destination accounts for the ARS
    notes?: string;
}) {
    const session = await getSessionContext();

    if (!session.user.tenantId) {
        throw new Error('Tenant no encontrado');
    }

    const tenantId = session.user.tenantId;
    const totalARS = data.usdAmount * data.exchangeRate;

    // Get active cash session
    const cashSession = await prisma.cashSession.findFirst({
        where: { tenantId, status: 'OPEN' },
    });

    if (!cashSession) {
        throw new Error('No hay caja abierta. Debe abrir la caja primero.');
    }

    // Validate payments total
    const totalPayments = data.payments.reduce((acc, p) => acc + p.amount, 0);
    if (Math.abs(totalPayments - totalARS) > 1) {
        throw new Error(`La suma de los cobros (${totalPayments}) debe ser igual al total a cobrar (${totalARS})`);
    }

    // Categorize
    const accountIds = data.payments.map(p => p.accountId);
    const destinationAccounts = await prisma.account.findMany({
        where: { id: { in: accountIds } }
    });

    let totalCashAmount = 0;
    let totalTransferAmount = 0;

    data.payments.forEach(payment => {
        const acc = destinationAccounts.find(a => a.id === payment.accountId);
        if (acc?.type === 'CASH') {
            totalCashAmount += payment.amount;
        } else {
            totalTransferAmount += payment.amount;
        }
    });

    const result = await prisma.$transaction(async (tx: any) => {
        // Create operation
        const operation = await tx.operation.create({
            data: {
                tenantId,
                type: data.payments.length > 1 ? 'VENTA_HIBRIDA' : 'VENTA_USD',
                mainAmount: data.usdAmount,
                mainCurrency: 'USD',
                secondaryAmount: totalARS,
                exchangeRate: data.exchangeRate,
                cashAmount: totalCashAmount,
                transferAmount: totalTransferAmount,
                createdById: session.user.id,
                cashSessionId: cashSession.id,
                notes: data.notes,
            },
        });

        // 1. Debit USD from source account
        await tx.accountMovement.create({
            data: {
                tenantId,
                accountId: data.usdAccountId,
                currency: 'USD',
                amount: -data.usdAmount,
                type: 'OPERATION',
                referenceId: operation.id,
                description: `Venta USD ${data.usdAmount} @ ${data.exchangeRate}`,
            },
        });

        // 2. Credit ARS to destination accounts
        for (const payment of data.payments) {
            if (payment.amount <= 0) continue;
            await tx.accountMovement.create({
                data: {
                    tenantId,
                    accountId: payment.accountId,
                    currency: 'ARS',
                    amount: payment.amount,
                    type: 'OPERATION',
                    referenceId: operation.id,
                    description: `Venta USD ${data.usdAmount} @ ${data.exchangeRate}`,
                },
            });
        }

        // 3. Update USD stock (reduce remaining using FIFO)
        const stockEntries = await tx.usdStockEntry.findMany({
            where: { tenantId, remaining: { gt: 0 } },
            orderBy: { createdAt: 'asc' },
        });

        let remainingToDeduct = data.usdAmount;
        for (const entry of stockEntries) {
            if (remainingToDeduct <= 0) break;

            const toDeduct = Math.min(entry.remaining, remainingToDeduct);
            await tx.usdStockEntry.update({
                where: { id: entry.id },
                data: { remaining: entry.remaining - toDeduct },
            });
            remainingToDeduct -= toDeduct;
        }

        return operation;
    });

    revalidatePath('/dashboard');
    revalidatePath('/dashboard/operaciones');
    return result;
}

// ═══════════════════════════════════════════════════════════════
// TRANSFER
// ═══════════════════════════════════════════════════════════════

export async function createTransferOperation(data: {
    amount: number;
    currency: 'ARS' | 'USD';
    fromPayments: Array<{ accountId: string; amount: number }>;
    toAccountId: string;
    notes?: string;
}) {
    const session = await getSessionContext();

    if (!session.user.tenantId) {
        throw new Error('Tenant no encontrado');
    }

    const tenantId = session.user.tenantId;

    const cashSession = await prisma.cashSession.findFirst({
        where: { tenantId, status: 'OPEN' },
    });

    const totalFromPayments = data.fromPayments.reduce((acc, p) => acc + p.amount, 0);
    if (Math.abs(totalFromPayments - data.amount) > 1) {
        throw new Error(`La suma de los orígenes (${totalFromPayments}) debe ser igual al monto a transferir (${data.amount})`);
    }

    const result = await prisma.$transaction(async (tx: any) => {
        const operation = await tx.operation.create({
            data: {
                tenantId,
                type: 'TRANSFERENCIA',
                mainAmount: data.amount,
                mainCurrency: data.currency,
                createdById: session.user.id,
                cashSessionId: cashSession?.id,
                notes: data.notes,
            },
        });

        // Debit from sources
        for (const payment of data.fromPayments) {
            if (payment.amount <= 0) continue;
            await tx.accountMovement.create({
                data: {
                    tenantId,
                    accountId: payment.accountId,
                    currency: data.currency,
                    amount: -payment.amount,
                    type: 'TRANSFER',
                    referenceId: operation.id,
                    description: `Transferencia saliente`,
                },
            });
        }

        // Credit to destination
        await tx.accountMovement.create({
            data: {
                tenantId,
                accountId: data.toAccountId,
                currency: data.currency,
                amount: data.amount,
                type: 'TRANSFER',
                referenceId: operation.id,
                description: `Transferencia entrante`,
            },
        });

        return operation;
    });

    revalidatePath('/dashboard');
    revalidatePath('/dashboard/operaciones');
    revalidatePath('/dashboard/cuentas');
    return result;
}

// ═══════════════════════════════════════════════════════════════
// EXPENSE (GASTO)
// ═══════════════════════════════════════════════════════════════

export async function createExpenseOperation(data: {
    amount: number;
    currency: 'ARS' | 'USD';
    accountId: string;
    description: string;
    category?: string;
}) {
    const session = await getSessionContext();

    if (!session.user.tenantId) {
        throw new Error('Tenant no encontrado');
    }

    const tenantId = session.user.tenantId;

    const cashSession = await prisma.cashSession.findFirst({
        where: { tenantId, status: 'OPEN' },
    });

    const result = await prisma.$transaction(async (tx: any) => {
        const operation = await tx.operation.create({
            data: {
                tenantId,
                type: 'GASTO',
                mainAmount: data.amount,
                mainCurrency: data.currency,
                createdById: session.user.id,
                cashSessionId: cashSession?.id,
                notes: data.description,
                category: data.category,
            },
        });

        await tx.accountMovement.create({
            data: {
                tenantId,
                accountId: data.accountId,
                currency: data.currency,
                amount: -data.amount,
                type: 'OPERATION',
                referenceId: operation.id,
                description: `Gasto: ${data.description}`,
            },
        });

        return operation;
    });

    revalidatePath('/dashboard');
    revalidatePath('/dashboard/operaciones');
    return result;
}

// ═══════════════════════════════════════════════════════════════
// WITHDRAWAL (RETIRO) - USD Digital to Cash
// ═══════════════════════════════════════════════════════════════

export async function createWithdrawalOperation(data: {
    amount: number;
    fromAccountId: string; // Digital USD account
    toAccountId: string;   // Cash USD account
    notes?: string;
    commissionAccountId?: string;
    commissionAmount?: number;
}) {
    const session = await getSessionContext();

    if (!session.user.tenantId) {
        throw new Error('Tenant no encontrado');
    }

    const tenantId = session.user.tenantId;

    const cashSession = await prisma.cashSession.findFirst({
        where: { tenantId, status: 'OPEN' },
    });

    if (!cashSession) {
        throw new Error('No hay caja abierta');
    }

    const result = await prisma.$transaction(async (tx: any) => {
        const operation = await tx.operation.create({
            data: {
                tenantId,
                type: 'RETIRO',
                mainAmount: data.amount,
                mainCurrency: 'USD',
                createdById: session.user.id,
                cashSessionId: cashSession.id,
                notes: data.notes,
                commissionAmount: data.commissionAmount,
                commissionAccountId: data.commissionAccountId,
            },
        });

        // Debit from digital account
        await tx.accountMovement.create({
            data: {
                tenantId,
                accountId: data.fromAccountId,
                currency: 'USD',
                amount: -data.amount,
                type: 'WITHDRAWAL',
                referenceId: operation.id,
                description: 'Retiro a efectivo',
            },
        });

        // Credit to cash account
        await tx.accountMovement.create({
            data: {
                tenantId,
                accountId: data.toAccountId,
                currency: 'USD',
                amount: data.amount,
                type: 'WITHDRAWAL',
                referenceId: operation.id,
                description: 'Retiro desde cuenta digital',
            },
        });

        // 4. Record commission as debt to account owner
        if (data.commissionAccountId && data.commissionAmount) {
            const ca = await tx.currentAccount.update({
                where: { id: data.commissionAccountId },
                data: { balanceARS: { decrement: data.commissionAmount } },
            });
            await tx.currentAccountMovement.create({
                data: {
                    currentAccountId: data.commissionAccountId,
                    type: 'BORROW',
                    amount: data.commissionAmount,
                    currency: 'ARS',
                    balanceAfterARS: ca.balanceARS,
                    balanceAfterUSD: ca.balanceUSD,
                    description: `Comisión retiro USD digital (Op: ${operation.id.slice(-6)})`,
                },
            });
        }

        return operation;
    });

    revalidatePath('/dashboard');
    revalidatePath('/dashboard/operaciones');
    revalidatePath('/dashboard/cuentas');
    return result;
}

// ═══════════════════════════════════════════════════════════════
// CANCEL OPERATION
// ═══════════════════════════════════════════════════════════════

export async function cancelOperation(operationId: string) {
    const session = await getSessionContext();

    // Get the operation with movements
    const operation = await prisma.operation.findUnique({
        where: { id: operationId },
        include: { movements: true },
    });

    if (!operation) {
        throw new Error('Operación no encontrada');
    }

    if (operation.status === 'CANCELLED') {
        throw new Error('La operación ya está cancelada');
    }

    await prisma.$transaction(async (tx: any) => {
        // Mark operation as cancelled
        await tx.operation.update({
            where: { id: operationId },
            data: { status: 'CANCELLED' },
        });

        // Create reverse movements
        for (const movement of operation.movements) {
            await tx.accountMovement.create({
                data: {
                    tenantId: movement.tenantId,
                    accountId: movement.accountId,
                    currency: movement.currency,
                    amount: -movement.amount, // Reverse the amount
                    type: 'ADJUSTMENT',
                    referenceId: operationId,
                    description: `Cancelación: ${movement.description}`,
                },
            });
        }

        // If it was a buy operation, remove from stock
        if (operation.type.startsWith('COMPRA_USD')) {
            const stockEntry = await tx.usdStockEntry.findFirst({
                where: { operationId },
            });
            if (stockEntry) {
                await tx.usdStockEntry.delete({ where: { id: stockEntry.id } });
            }
        }
    });

    revalidatePath('/dashboard');
    revalidatePath('/dashboard/operaciones');
    return { success: true };
}

export async function createCommissionExpense(data: {
    amount: number;
    currency: 'ARS' | 'USD';
    accountId: string;
    description: string;
}) {
    const session = await getServerSession(authOptions);

    if (!session?.user.tenantId) {
        throw new Error('Tenant no encontrado');
    }

    const tenantId = session.user.tenantId;

    const cashSession = await prisma.cashSession.findFirst({
        where: { tenantId, status: 'OPEN' },
    });

    const account = await prisma.account.findUnique({
        where: { id: data.accountId },
    });
    if (!account) {
        throw new Error('Cuenta no encontrada');
    }

    const result = await prisma.$transaction(async (tx: any) => {
        const operation = await tx.operation.create({
            data: {
                tenantId,
                type: 'GASTO_COMISION',
                mainAmount: data.amount,
                mainCurrency: data.currency,
                createdById: session.user.id,
                cashSessionId: cashSession?.id,
                notes: data.description,
            },
        });

        await tx.accountMovement.create({
            data: {
                tenantId,
                accountId: data.accountId,
                currency: data.currency,
                amount: -data.amount,
                type: 'OPERATION',
                referenceId: operation.id,
                description: `Comisión Digital: ${data.description}`,
            },
        });

        return operation;
    });

    revalidatePath('/dashboard');
    revalidatePath('/dashboard/operaciones');
    revalidatePath('/dashboard/caja');
    return result;
}

// ═══════════════════════════════════════════════════════════════
// INCOME (INGRESO) - Non-profit direct income
// ═══════════════════════════════════════════════════════════════

export async function createIncomeOperation(data: {
    amount: number;
    currency: 'ARS' | 'USD';
    accountId: string;
    description: string;
    date?: string; // ISO date string, defaults to now
}) {
    const session = await getSessionContext();

    if (!session.user.tenantId) {
        throw new Error('Tenant no encontrado');
    }

    const tenantId = session.user.tenantId;

    // NO cash session required — incomes are isolated from daily operations
    const cashSession = await prisma.cashSession.findFirst({
        where: { tenantId, status: 'OPEN' },
    });

    const createdAt = data.date ? new Date(data.date) : new Date();

    const result = await prisma.$transaction(async (tx: any) => {
        const operation = await tx.operation.create({
            data: {
                tenantId,
                type: 'INGRESO',
                mainAmount: data.amount,
                mainCurrency: data.currency,
                createdById: session.user.id,
                cashSessionId: cashSession?.id || null,
                notes: data.description,
                createdAt,
            },
        });

        // Credit the selected account (positive movement)
        await tx.accountMovement.create({
            data: {
                tenantId,
                accountId: data.accountId,
                currency: data.currency,
                amount: data.amount,
                type: 'OPERATION',
                referenceId: operation.id,
                description: `Ingreso: ${data.description}`,
                createdAt,
            },
        });

        return operation;
    });

    revalidatePath('/dashboard');
    revalidatePath('/dashboard/operaciones');
    revalidatePath('/dashboard/cuentas');
    revalidatePath('/dashboard/ingresos');
    return result;
}

export async function getIncomes(tenantId: string, limit: number = 30) {
    return prisma.operation.findMany({
        where: { tenantId, type: 'INGRESO', status: { not: 'CANCELLED' } },
        include: {
            createdBy: { select: { name: true } },
            movements: {
                include: { account: { select: { id: true, name: true, currency: true } } },
            },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
    });
}
