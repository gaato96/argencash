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

export async function createCurrentAccount(data: {
    name: string;
    phone?: string;
    notes?: string;
}) {
    const session = await getSessionContext();
    if (!session.user.tenantId) throw new Error('Tenant no encontrado');

    const account = await prisma.currentAccount.create({
        data: {
            ...data,
            tenantId: session.user.tenantId,
            balanceARS: 0,
            balanceUSD: 0,
        },
    });

    revalidatePath('/dashboard/cuentas-corrientes');
    return account;
}

export async function deleteCurrentAccount(id: string) {
    await getSessionContext();
    await prisma.currentAccount.delete({ where: { id } });
    revalidatePath('/dashboard/cuentas-corrientes');
}

export async function getCurrentAccounts(tenantId: string) {
    return prisma.currentAccount.findMany({
        where: { tenantId, isActive: true },
        include: {
            movements: {
                orderBy: { createdAt: 'desc' },
                take: 10,
            },
        },
        orderBy: { name: 'asc' },
    });
}

/**
 * Registrar dinero recibido (nos prestan liquidez)
 * Balance se vuelve negativo (debemos)
 * currency: 'ARS' | 'USD'
 */
export async function receiveMoney(params: {
    currentAccountId: string;
    amount: number;
    currency: 'ARS' | 'USD';
    description?: string;
    targetAccountId?: string; // Cuenta física donde se acredita la liquidez
}) {
    const session = await getSessionContext();
    const tenantId = session.user.tenantId!;

    return prisma.$transaction(async (tx: any) => {
        // 0. Get active cash session
        const cashSession = await tx.cashSession.findFirst({
            where: { tenantId, status: 'OPEN' },
        });

        // 1. Create Operation
        const operation = await tx.operation.create({
            data: {
                tenantId,
                type: 'RECEIVE_CC',
                mainAmount: params.amount,
                mainCurrency: params.currency,
                createdById: session.user.id,
                cashSessionId: cashSession?.id,
                notes: params.description || `Recibido CC: ${params.currency}`,
            },
        });

        // 2. Update Current Account (Decrease balance = We owe)
        const updateData: any = {};
        if (params.currency === 'ARS') {
            updateData.balanceARS = { decrement: params.amount };
        } else {
            updateData.balanceUSD = { decrement: params.amount };
        }

        const ca = await tx.currentAccount.update({
            where: { id: params.currentAccountId },
            data: updateData,
        });

        // 3. Register CC Movement
        await tx.currentAccountMovement.create({
            data: {
                currentAccountId: params.currentAccountId,
                type: 'BORROW',
                amount: params.amount,
                currency: params.currency,
                balanceAfterARS: ca.balanceARS,
                balanceAfterUSD: ca.balanceUSD,
                description: params.description || `Recibido ${params.currency}`,
                operationId: operation.id,
            },
        });

        // 4. Physical account entry (Liquidez de tercero en cuenta propia)
        if (params.targetAccountId) {
            await tx.accountMovement.create({
                data: {
                    tenantId: ca.tenantId,
                    accountId: params.targetAccountId,
                    currency: params.currency,
                    amount: params.amount,
                    type: 'OPERATION',
                    referenceId: operation.id,
                    description: `Liquidez CC: ${ca.name}`,
                },
            });
        }

        revalidatePath('/dashboard/cuentas-corrientes');
        revalidatePath('/dashboard/cuentas');
        return ca;
    });
}

/**
 * Devolver dinero (pagamos lo que debemos)
 * Si devolvemos USD, se considera una "Venta Especial"
 */
export async function repayMoney(params: {
    currentAccountId: string;
    amount: number;
    currency: 'ARS' | 'USD';
    targetCurrency?: 'ARS' | 'USD';
    exchangeRate?: number;
    description?: string;
    targetAccountId?: string;
}) {
    const session = await getSessionContext();
    const tenantId = session.user.tenantId!;

    return prisma.$transaction(async (tx: any) => {
        const ca = await tx.currentAccount.findUnique({ where: { id: params.currentAccountId } });
        if (!ca) throw new Error('Cuenta corriente no encontrada');

        const movementCurrency = params.currency;
        const targetCurrency = params.targetCurrency || movementCurrency;

        // 0. Get active cash session
        const cashSession = await tx.cashSession.findFirst({
            where: { tenantId, status: 'OPEN' },
        });

        // Profit Logic: Calculate secondary amount (ARS value)
        let secondaryAmount = null;

        if (movementCurrency !== targetCurrency && params.exchangeRate) {
            if (movementCurrency === 'USD' && targetCurrency === 'ARS') {
                secondaryAmount = params.amount * params.exchangeRate;
            }
        }

        // 1. Create Operation
        const operation = await tx.operation.create({
            data: {
                tenantId,
                type: 'REPAY_CC',
                mainAmount: params.amount,
                mainCurrency: movementCurrency,
                secondaryAmount: secondaryAmount,
                exchangeRate: params.exchangeRate,
                createdById: session.user.id,
                cashSessionId: cashSession?.id,
                notes: params.description || `Pago CC: ${movementCurrency} -> Deuda ${targetCurrency}`,
            },
        });

        // 2. Physical Withdrawal
        if (params.targetAccountId) {
            await tx.accountMovement.create({
                data: {
                    tenantId,
                    accountId: params.targetAccountId,
                    currency: movementCurrency,
                    amount: -params.amount,
                    type: 'OPERATION',
                    referenceId: operation.id,
                    description: `Pago a CC: ${ca.name}`,
                },
            });
        }

        // 3. Determine Impact on Current Account
        let balanceUpdateRequired: any = {};
        let appliedAmount = params.amount;
        let description = params.description || `Devolución ${movementCurrency}`;

        if (movementCurrency !== targetCurrency) {
            if (!params.exchangeRate) throw new Error('Se requiere cotización para conversión cruzada');

            if (movementCurrency === 'USD' && targetCurrency === 'ARS') {
                appliedAmount = params.amount * params.exchangeRate;
                description += ` (Cancela ARS @ ${params.exchangeRate})`;
            } else if (movementCurrency === 'ARS' && targetCurrency === 'USD') {
                appliedAmount = params.amount / params.exchangeRate;
                description += ` (Cancela USD @ ${params.exchangeRate})`;
            }
        }

        // Update Balance Logic
        if (targetCurrency === 'ARS') {
            balanceUpdateRequired.balanceARS = { increment: appliedAmount };
        } else {
            balanceUpdateRequired.balanceUSD = { increment: appliedAmount };
        }

        const updatedCa = await tx.currentAccount.update({
            where: { id: params.currentAccountId },
            data: balanceUpdateRequired,
        });

        // 4. Register CC Movement
        await tx.currentAccountMovement.create({
            data: {
                currentAccountId: params.currentAccountId,
                type: 'REPAY',
                amount: params.amount,
                currency: movementCurrency,
                balanceAfterARS: updatedCa.balanceARS,
                balanceAfterUSD: updatedCa.balanceUSD,
                description: description,
                operationId: operation.id,
            } as any,
        });

        revalidatePath('/dashboard/cuentas-corrientes');
        revalidatePath('/dashboard/cuentas');
        return updatedCa;
    });
}

/**
 * Prestar dinero a tercero (nos deben)
 * Balance se vuelve positivo (a favor)
 */
export async function lendMoney(params: {
    currentAccountId: string;
    amount: number;
    currency: 'ARS' | 'USD';
    description?: string;
    targetAccountId?: string;
}) {
    const session = await getSessionContext();
    const tenantId = session.user.tenantId!;

    return prisma.$transaction(async (tx: any) => {
        // 0. Get active cash session
        const cashSession = await tx.cashSession.findFirst({
            where: { tenantId, status: 'OPEN' },
        });

        // 1. Create Operation
        const operation = await tx.operation.create({
            data: {
                tenantId,
                type: 'LEND_CC',
                mainAmount: params.amount,
                mainCurrency: params.currency,
                createdById: session.user.id,
                cashSessionId: cashSession?.id,
                notes: params.description || `Préstamo CC: ${params.currency}`,
            },
        });

        const updateData: any = {};
        if (params.currency === 'ARS') {
            updateData.balanceARS = { increment: params.amount };
        } else {
            updateData.balanceUSD = { increment: params.amount };
        }

        const ca = await tx.currentAccount.update({
            where: { id: params.currentAccountId },
            data: updateData,

        });

        await tx.currentAccountMovement.create({
            data: {
                currentAccountId: params.currentAccountId,
                type: 'LEND',
                amount: params.amount,
                currency: params.currency,
                balanceAfterARS: ca.balanceARS,
                balanceAfterUSD: ca.balanceUSD,
                description: params.description || `Préstamo otorgado ${params.currency}`,
                operationId: operation.id,
            },
        });

        if (params.targetAccountId) {
            await tx.accountMovement.create({
                data: {
                    tenantId: ca.tenantId,
                    accountId: params.targetAccountId,
                    currency: params.currency,
                    amount: -params.amount,
                    type: 'OPERATION',
                    referenceId: operation.id,
                    description: `Préstamo CC: ${ca.name}`,
                },
            });
        }

        revalidatePath('/dashboard/cuentas-corrientes');
        revalidatePath('/dashboard/cuentas');
        return ca;
    });
}

/**
 * Cobrar deuda (Recibimos pago de ellos)
 */
export async function collectDebt(params: {
    currentAccountId: string;
    amount: number;
    currency: 'ARS' | 'USD';
    targetCurrency?: 'ARS' | 'USD';
    exchangeRate?: number;
    description?: string;
    targetAccountId?: string;
}) {
    const session = await getSessionContext();
    const tenantId = session.user.tenantId!;

    return prisma.$transaction(async (tx: any) => {
        const ca = await tx.currentAccount.findUnique({ where: { id: params.currentAccountId } });
        if (!ca) throw new Error('Cuenta corriente no encontrada');

        const movementCurrency = params.currency;
        const targetCurrency = params.targetCurrency || movementCurrency;

        // 0. Get active cash session
        const cashSession = await tx.cashSession.findFirst({
            where: { tenantId, status: 'OPEN' },
        });

        // 1. Create Operation
        const operation = await tx.operation.create({
            data: {
                tenantId,
                type: 'COLLECT_CC',
                mainAmount: params.amount,
                mainCurrency: movementCurrency,
                createdById: session.user.id,
                cashSessionId: cashSession?.id,
                notes: params.description || `Cobro CC: ${movementCurrency} -> Saldo ${targetCurrency}`,
            },
        });

        // 2. Physical Entry
        if (params.targetAccountId) {
            await tx.accountMovement.create({
                data: {
                    tenantId,
                    accountId: params.targetAccountId,
                    currency: movementCurrency,
                    amount: params.amount,
                    type: 'OPERATION',
                    referenceId: operation.id,
                    description: `Cobro de CC: ${ca.name}`,
                },
            });
        }

        // 3. Determine Impact on Current Account
        let balanceUpdateRequired: any = {};
        let appliedAmount = params.amount;
        let description = params.description || `Cobro ${movementCurrency}`;

        if (movementCurrency !== targetCurrency) {
            if (!params.exchangeRate) throw new Error('Se requiere cotización para conversión cruzada');

            if (movementCurrency === 'USD' && targetCurrency === 'ARS') {
                appliedAmount = params.amount * params.exchangeRate;
                description += ` (Cobra ARS @ ${params.exchangeRate})`;
            } else if (movementCurrency === 'ARS' && targetCurrency === 'USD') {
                appliedAmount = params.amount / params.exchangeRate;
                description += ` (Cobra USD @ ${params.exchangeRate})`;
            }
        }

        // Update Balance
        if (targetCurrency === 'ARS') {
            balanceUpdateRequired.balanceARS = { decrement: appliedAmount };
        } else {
            balanceUpdateRequired.balanceUSD = { decrement: appliedAmount };
        }

        const updatedCa = await tx.currentAccount.update({
            where: { id: params.currentAccountId },
            data: balanceUpdateRequired,
        });

        // 4. Register CC Movement
        await tx.currentAccountMovement.create({
            data: {
                currentAccountId: params.currentAccountId,
                type: 'COLLECT',
                amount: params.amount,
                currency: movementCurrency,
                balanceAfterARS: updatedCa.balanceARS,
                balanceAfterUSD: updatedCa.balanceUSD,
                description: description,
                operationId: operation.id,
            } as any,
        });

        revalidatePath('/dashboard/cuentas-corrientes');
        revalidatePath('/dashboard/cuentas');
        return updatedCa;
    });
}
