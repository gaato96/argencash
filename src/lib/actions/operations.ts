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
    arsAccountId: string;        // Account we pay ARS from
    usdAccountId: string;        // Account we receive USD into
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

    // Create operation with movements in transaction
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
                createdById: session.user.id,
                cashSessionId: cashSession.id,
                notes: data.notes,
                commissionAmount: data.commissionAmount,
                commissionAccountId: data.commissionAccountId,
            },
        });

        // Create movements
        // 1. Debit ARS from source account
        await tx.accountMovement.create({
            data: {
                tenantId,
                accountId: data.arsAccountId,
                currency: 'ARS',
                amount: -arsAmount,
                type: 'OPERATION',
                referenceId: operation.id,
                description: `Compra USD ${data.usdAmount} @ ${data.exchangeRate}`,
            },
        });

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
                data: { balance: { decrement: data.commissionAmount } },
            });
            await tx.currentAccountMovement.create({
                data: {
                    currentAccountId: data.commissionAccountId,
                    type: 'BORROW', // We owe money (commission)
                    amount: data.commissionAmount,
                    balanceAfter: ca.balance,
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
    paymentType: 'CASH' | 'TRANSFER' | 'HYBRID';
    // For CASH or HYBRID
    cashAccountId?: string;
    cashAmount?: number;
    // For TRANSFER or HYBRID
    transferAccountId?: string;
    transferAmount?: number;
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

    // Validate amounts for hybrid
    if (data.paymentType === 'HYBRID') {
        const cashAmt = data.cashAmount || 0;
        const transferAmt = data.transferAmount || 0;
        if (Math.abs((cashAmt + transferAmt) - totalARS) > 1) {
            throw new Error('La suma del efectivo y transferencia debe ser igual al total');
        }
    }

    const result = await prisma.$transaction(async (tx: any) => {
        // Create operation
        const operation = await tx.operation.create({
            data: {
                tenantId,
                type: data.paymentType === 'HYBRID' ? 'VENTA_HIBRIDA' : 'VENTA_USD',
                mainAmount: data.usdAmount,
                mainCurrency: 'USD',
                secondaryAmount: totalARS,
                exchangeRate: data.exchangeRate,
                cashAmount: data.cashAmount,
                transferAmount: data.transferAmount,
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

        // 2. Credit ARS based on payment type
        if (data.paymentType === 'CASH' && data.cashAccountId) {
            await tx.accountMovement.create({
                data: {
                    tenantId,
                    accountId: data.cashAccountId,
                    currency: 'ARS',
                    amount: totalARS,
                    type: 'OPERATION',
                    referenceId: operation.id,
                    description: `Venta USD ${data.usdAmount} (efectivo)`,
                },
            });
        } else if (data.paymentType === 'TRANSFER' && data.transferAccountId) {
            await tx.accountMovement.create({
                data: {
                    tenantId,
                    accountId: data.transferAccountId,
                    currency: 'ARS',
                    amount: totalARS,
                    type: 'OPERATION',
                    referenceId: operation.id,
                    description: `Venta USD ${data.usdAmount} (transferencia)`,
                },
            });
        } else if (data.paymentType === 'HYBRID') {
            // Cash portion
            if (data.cashAccountId && data.cashAmount) {
                await tx.accountMovement.create({
                    data: {
                        tenantId,
                        accountId: data.cashAccountId,
                        currency: 'ARS',
                        amount: data.cashAmount,
                        type: 'OPERATION',
                        referenceId: operation.id,
                        description: `Venta USD ${data.usdAmount} (parte efectivo)`,
                    },
                });
            }
            // Transfer portion
            if (data.transferAccountId && data.transferAmount) {
                await tx.accountMovement.create({
                    data: {
                        tenantId,
                        accountId: data.transferAccountId,
                        currency: 'ARS',
                        amount: data.transferAmount,
                        type: 'OPERATION',
                        referenceId: operation.id,
                        description: `Venta USD ${data.usdAmount} (parte transferencia)`,
                    },
                });
            }
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
    fromAccountId: string;
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

        // Debit from source
        await tx.accountMovement.create({
            data: {
                tenantId,
                accountId: data.fromAccountId,
                currency: data.currency,
                amount: -data.amount,
                type: 'TRANSFER',
                referenceId: operation.id,
                description: `Transferencia saliente`,
            },
        });

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
                data: { balance: { decrement: data.commissionAmount } },
            });
            await tx.currentAccountMovement.create({
                data: {
                    currentAccountId: data.commissionAccountId,
                    type: 'BORROW',
                    amount: data.commissionAmount,
                    balanceAfter: ca.balance,
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
