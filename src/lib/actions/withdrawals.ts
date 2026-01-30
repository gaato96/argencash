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

export async function createWithdrawal(data: {
    fromAccountId: string;   // Cuenta digital USD
    toAccountId: string;     // Caja USD efectivo
    amount: number;          // Monto USD
    cashSessionId: string;
}) {
    const session = await getSessionContext();
    const tenantId = session.user.tenantId!;

    return prisma.$transaction(async (tx: any) => {
        // 1. Create Operation
        const operation = await tx.operation.create({
            data: {
                tenantId,
                type: 'RETIRO',
                mainAmount: data.amount,
                mainCurrency: 'USD',
                createdById: session.user.id,
                cashSessionId: data.cashSessionId,
                notes: 'Retiro de saldo a caja',
            },
        });

        // 2. Debit from Digital Account
        await tx.accountMovement.create({
            data: {
                tenantId,
                accountId: data.fromAccountId,
                currency: 'USD',
                amount: -data.amount,
                type: 'WITHDRAWAL',
                referenceId: operation.id,
                description: 'Retiro a caja',
            },
        });

        // 3. Credit to Cash Account
        await tx.accountMovement.create({
            data: {
                tenantId,
                accountId: data.toAccountId,
                currency: 'USD',
                amount: data.amount,
                type: 'WITHDRAWAL', // Or TRANSFER? Withdrawal fits better visually
                referenceId: operation.id,
                description: 'Ingreso por retiro',
            },
        });

        revalidatePath('/dashboard');
        return operation;
    });
}
