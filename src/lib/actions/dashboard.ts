'use server';

import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { calculateRealProfit } from '@/lib/calculations';

// Get current session with tenant context
async function getSessionContext() {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        throw new Error('No autorizado');
    }
    return session;
}

// ═══════════════════════════════════════════════════════════════
// NOTEBOOK / SCRATCHPAD ACTIONS
// ═══════════════════════════════════════════════════════════════

export async function getNotebookEntries(tenantId: string) {
    return prisma.notebookEntry.findMany({
        where: {
            tenantId,
            isProcessed: false,
        },
        orderBy: { createdAt: 'desc' },
        take: 20,
    });
}

export async function addNotebookEntry(content: string) {
    const session = await getSessionContext();

    if (!session.user.tenantId) {
        throw new Error('Tenant no encontrado');
    }

    const entry = await prisma.notebookEntry.create({
        data: {
            tenantId: session.user.tenantId,
            content,
            createdById: session.user.id,
        },
    });

    revalidatePath('/dashboard');
    return entry;
}

export async function processNotebookEntry(id: string) {
    const session = await getSessionContext();

    await prisma.notebookEntry.update({
        where: { id },
        data: { isProcessed: true },
    });

    revalidatePath('/dashboard');
}

export async function deleteNotebookEntry(id: string) {
    await getSessionContext();

    await prisma.notebookEntry.delete({
        where: { id },
    });

    revalidatePath('/dashboard');
}

// ═══════════════════════════════════════════════════════════════
// DASHBOARD DATA
// ═══════════════════════════════════════════════════════════════

export async function getDashboardData(tenantId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get accounts with balances
    const accounts = await prisma.account.findMany({
        where: { tenantId, isActive: true },
        include: {
            movements: {
                select: { amount: true },
            },
        },
    });

    // Calculate liquidity and balances
    const balances = {
        propio: { ARS: 0, USD: 0 }, // This will represent ASSETS (Caja, Bank, CC A favor)
        tercero: { ARS: 0, USD: 0 }, // This will represent LIABILITIES (Recaudadoras, CC Deuda)
        liquidity: {
            cash: { ARS: 0, USD: 0 },
            virtual: { ARS: 0, USD: 0 }
        }
    };

    accounts.forEach((account: any) => {
        const balance = account.movements.reduce((sum: number, m: any) => sum + (m.amount || 0), 0);
        // All "Accounts" (Physical/Virtual) are part of our Assets
        balances.propio[account.currency as 'ARS' | 'USD'] += balance;

        // Categorize for Total Liquidity view
        if (account.type === 'CASH') {
            balances.liquidity.cash[account.currency as 'ARS' | 'USD'] += balance;
        } else {
            balances.liquidity.virtual[account.currency as 'ARS' | 'USD'] += balance;
        }
    });

    // Add Current Account balances
    const currentAccounts = await prisma.currentAccount.findMany({
        where: { tenantId, isActive: true },
    });

    currentAccounts.forEach((ca: any) => {
        // Handle ARS balance
        if (ca.balanceARS > 0) {
            balances.propio.ARS += ca.balanceARS;
        } else if (ca.balanceARS < 0) {
            balances.tercero.ARS += Math.abs(ca.balanceARS);
        }

        // Handle USD balance
        if (ca.balanceUSD > 0) {
            balances.propio.USD += ca.balanceUSD;
        } else if (ca.balanceUSD < 0) {
            balances.tercero.USD += Math.abs(ca.balanceUSD);
        }
    });

    // Recaudadora balances (LIABILITIES - Money collected to be returned)
    const recaudadoras = await prisma.recaudadora.findMany({
        where: { tenantId, isActive: true },
    });

    recaudadoras.forEach((r: any) => {
        const balance = r.dailyAccumulated || 0;
        // Recaudadoras are always ARS and they represent OTHERS' money we currently have
        balances.tercero.ARS += balance;
    });

    const currentAccountNetARS = currentAccounts.reduce((sum: number, ca: any) => sum + (ca.balanceARS || 0), 0);
    const currentAccountNetUSD = currentAccounts.reduce((sum: number, ca: any) => sum + (ca.balanceUSD || 0), 0);
    const todayOperations = await prisma.operation.findMany({
        where: {
            tenantId,
            createdAt: { gte: today },
            status: 'COMPLETED',
        },
    });

    // Calculate profit inputs
    const buys = todayOperations.filter((op: any) => op.type.startsWith('COMPRA') || (op.type === 'COLLECT_CC' && op.mainCurrency === 'USD'));
    const sales = todayOperations.filter((op: any) => op.type.startsWith('VENTA') || (op.type === 'REPAY_CC' && op.mainCurrency === 'USD'));
    const expenses = todayOperations.filter((op: any) => op.type === 'GASTO');

    // Totals for Profit Calculation
    const totalSalesARS = sales.reduce((sum: number, op: any) => sum + (op.secondaryAmount || 0), 0);
    const totalUsdSold = sales.reduce((sum: number, op: any) => sum + op.mainAmount, 0);
    const totalExpenses = expenses.reduce((sum: number, op: any) => sum + op.mainAmount, 0);

    // Get PPP for accurate profit
    const usdStock = await prisma.usdStockEntry.findMany({
        where: { tenantId, remaining: { gt: 0 } },
    });

    const ppp = usdStock.length > 0
        ? usdStock.reduce((sum: number, e: any) => sum + e.remaining * e.rate, 0) /
        usdStock.reduce((sum: number, e: any) => sum + e.remaining, 0)
        : 0;

    // Safety check: if PPP is 0 (no stock history), we assume Cost = Sale Price (0 profit) to avoid showing massive fake profit
    const costBasis = ppp > 0 ? totalUsdSold * ppp : totalSalesARS;

    const commissionsIncomeOps = await prisma.operation.findMany({
        where: {
            tenantId,
            type: 'INGRESO_COMISION',
            createdAt: { gte: today },
        },
    });
    const totalCommissionsIncome = commissionsIncomeOps.reduce((sum: number, op: any) => sum + op.mainAmount, 0);

    const commissionsExpenseOps = await prisma.operation.findMany({
        where: {
            tenantId,
            type: 'GASTO_COMISION',
            createdAt: { gte: today },
        },
    });
    const totalCommissionsExpense = commissionsExpenseOps.reduce((sum: number, op: any) => sum + op.mainAmount, 0);

    const todayProfit = calculateRealProfit({
        salesTotal: totalSalesARS,
        usdSold: totalUsdSold,
        ppp,
        expenses: totalExpenses,
        commissionsIncome: totalCommissionsIncome,
        commissionsExpense: totalCommissionsExpense,
    });



    // Get active alerts
    const alerts = await prisma.alert.findMany({
        where: { tenantId, status: 'ACTIVE' },
        orderBy: { createdAt: 'desc' },
        take: 5,
    });

    // Get active cash session
    const activeCashSession = await prisma.cashSession.findFirst({
        where: { tenantId, status: 'OPEN' },
        include: { openedBy: true },
    });

    return {
        balances,
        todayProfit,
        ppp,
        currentAccountNet: { ARS: currentAccountNetARS, USD: currentAccountNetUSD },
        currentAccounts, // Added this
        alerts,
        activeCashSession,
        operationsToday: todayOperations.length,
    };
}

// ═══════════════════════════════════════════════════════════════
// ACCOUNTS
// ═══════════════════════════════════════════════════════════════

export async function getAccounts(tenantId: string) {
    const accounts = await prisma.account.findMany({
        where: { tenantId, isActive: true },
        include: {
            movements: {
                select: { amount: true },
            },
        },
        orderBy: [{ ownership: 'asc' }, { currency: 'asc' }, { name: 'asc' }],
    });

    return accounts.map((account: any) => ({
        ...account,
        balance: account.movements.reduce((sum: number, m: any) => sum + m.amount, 0),
        movements: undefined, // Don't send all movements to client
    }));
}

export async function createAccount(data: {
    name: string;
    currency: 'ARS' | 'USD';
    type: 'CASH' | 'BANK' | 'VIRTUAL';
    bank?: string;
    alias?: string;
    cbu?: string;
    notes?: string;
    isPurchasing?: boolean;
    username?: string;
    password?: string;
    initialBalance?: number;
}) {
    const session = await getSessionContext();

    if (!session.user.tenantId) {
        throw new Error('Tenant no encontrado');
    }

    const tenantId = session.user.tenantId;

    return prisma.$transaction(async (tx: any) => {
        const account = await tx.account.create({
            data: {
                tenantId,
                name: data.name,
                currency: data.currency,
                type: data.type,
                bank: data.bank,
                alias: data.alias,
                cbu: data.cbu,
                notes: data.notes,
                isPurchasing: data.isPurchasing || false,
                username: data.username,
                password: data.password,
                initialBalance: data.initialBalance || 0,
                ownership: 'PROPIO',
            },
        });

        if (data.initialBalance && data.initialBalance !== 0) {
            await tx.accountMovement.create({
                data: {
                    tenantId,
                    accountId: account.id,
                    currency: account.currency,
                    amount: data.initialBalance,
                    type: 'ADJUSTMENT',
                    description: 'Saldo inicial',
                },
            });
        }

        revalidatePath('/dashboard/cuentas');
        return account;
    });
}

export async function updateAccount(id: string, data: any) {
    await getSessionContext();

    const account = await prisma.account.update({
        where: { id },
        data: {
            name: data.name,
            currency: data.currency,
            type: data.type,
            bank: data.bank,
            alias: data.alias,
            cbu: data.cbu,
            notes: data.notes,
            isPurchasing: data.isPurchasing ?? undefined,
            username: data.username ?? undefined,
            password: data.password ?? undefined,
        } as any,
    });

    revalidatePath('/dashboard/cuentas');
    return account;
}

export async function deleteAccount(id: string) {
    await getSessionContext();

    // Soft delete or check for movements?
    // User asked to "eliminar". We'll do a soft delete by setting isActive to false
    // to preserve ledger history.
    await prisma.account.update({
        where: { id },
        data: { isActive: false },
    });

    revalidatePath('/dashboard/cuentas');
}

export async function importAccountsCSV(accountsData: any[]) {
    const session = await getSessionContext();
    const tenantId = session.user.tenantId;

    if (!tenantId) throw new Error('No tenant context');

    // Filter out invalid/empty rows and create many
    const validAccounts = accountsData
        .filter(a => a.name && a.currency)
        .map(a => ({
            tenantId,
            name: a.name,
            currency: a.currency.toUpperCase() === 'USD' ? 'USD' : 'ARS',
            type: a.type?.toUpperCase() || 'VIRTUAL',
            bank: a.bank || null,
            alias: a.alias || null,
            cbu: a.cbu || null,
            notes: a.notes || null,
            ownership: 'PROPIO',
        }));

    const result = await prisma.account.createMany({
        data: validAccounts,
    });

    revalidatePath('/dashboard/cuentas');
    return result;
}

// ═══════════════════════════════════════════════════════════════
// CURRENT ACCOUNTS (Cuentas Corrientes)
// ═══════════════════════════════════════════════════════════════

export async function getCurrentAccounts(tenantId: string) {
    return prisma.currentAccount.findMany({
        where: { tenantId, isActive: true },
        orderBy: { name: 'asc' },
    });
}

export async function createCurrentAccount(data: { name: string; phone?: string; notes?: string; currency?: 'ARS' | 'USD' }) {
    const session = await getSessionContext();

    if (!session.user.tenantId) {
        throw new Error('Tenant no encontrado');
    }

    const account = await prisma.currentAccount.create({
        data: {
            ...data,
            tenantId: session.user.tenantId,
        },
    });

    revalidatePath('/dashboard/cuentas-corrientes');
    return account;
}

export async function recordCurrentAccountMovement(data: {
    currentAccountId: string;
    type: 'BORROW' | 'REPAY' | 'LEND' | 'COLLECT';
    amount: number;
    currency: 'ARS' | 'USD';
    description?: string;
    referenceId?: string; // Optional operation ID
    targetCurrency?: 'ARS' | 'USD'; // If paying mixed currencies
    exchangeRate?: number; // If needed for conversion
}) {
    const session = await getSessionContext();

    // Get current account
    const currentAccount = await prisma.currentAccount.findUnique({
        where: { id: data.currentAccountId },
    });

    if (!currentAccount) {
        throw new Error('Cuenta corriente no encontrada');
    }

    const movementCurrency = data.currency;
    const targetCurrency = data.targetCurrency || movementCurrency;

    let balanceChangeARS = 0;
    let balanceChangeUSD = 0;

    // Determine effective amount applied to balance
    let appliedAmount = data.amount;

    // Convert if needed
    if (movementCurrency !== targetCurrency) {
        if (!data.exchangeRate) throw new Error('Se requiere cotización para pagos multimonedas');

        if (movementCurrency === 'USD' && targetCurrency === 'ARS') {
            appliedAmount = data.amount * data.exchangeRate;
        } else if (movementCurrency === 'ARS' && targetCurrency === 'USD') {
            appliedAmount = data.amount / data.exchangeRate;
        }
    }

    switch (data.type) {
        case 'BORROW': // We receive value, debt increases (Balance decreases)
            if (targetCurrency === 'ARS') balanceChangeARS = -appliedAmount;
            else balanceChangeUSD = -appliedAmount;
            break;
        case 'REPAY': // We pay back, debt decreases (Balance increases)
            if (targetCurrency === 'ARS') balanceChangeARS = appliedAmount;
            else balanceChangeUSD = appliedAmount;
            break;
        case 'LEND': // We give value, they owe us (Balance increases)
            if (targetCurrency === 'ARS') balanceChangeARS = appliedAmount;
            else balanceChangeUSD = appliedAmount;
            break;
        case 'COLLECT': // They pay us, they owe less (Balance decreases)
            if (targetCurrency === 'ARS') balanceChangeARS = -appliedAmount;
            else balanceChangeUSD = -appliedAmount;
            break;
    }

    const newBalanceARS = currentAccount.balanceARS + balanceChangeARS;
    const newBalanceUSD = currentAccount.balanceUSD + balanceChangeUSD;

    // Create movement and update balance in transaction
    await prisma.$transaction([
        prisma.currentAccountMovement.create({
            data: {
                currentAccountId: data.currentAccountId,
                type: data.type,
                amount: data.amount, // Record original amount
                currency: movementCurrency, // Record original currency
                balanceAfterARS: newBalanceARS,
                balanceAfterUSD: newBalanceUSD,
                description: data.description,
                operationId: data.referenceId,
            } as any,
        }),
        prisma.currentAccount.update({
            where: { id: data.currentAccountId },
            data: {
                balanceARS: newBalanceARS,
                balanceUSD: newBalanceUSD
            } as any,
        }),
    ]);

    revalidatePath('/dashboard/cuentas-corrientes');
    revalidatePath('/dashboard');
}

// ═══════════════════════════════════════════════════════════════
// ALERTS
// ═══════════════════════════════════════════════════════════════

export async function resolveAlert(alertId: string) {
    await getSessionContext();

    await prisma.alert.update({
        where: { id: alertId },
        data: {
            status: 'RESOLVED',
            resolvedAt: new Date(),
        },
    });

    revalidatePath('/dashboard');
}

export async function createAlert(data: {
    tenantId: string;
    type: string;
    severity: 'LOW' | 'MEDIUM' | 'HIGH';
    message: string;
    metadata?: string;
}) {
    return prisma.alert.create({ data });
}
