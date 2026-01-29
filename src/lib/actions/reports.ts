'use server';

import prisma from '@/lib/prisma';
import { calculateRealProfit } from '@/lib/calculations';

export async function getReportData(tenantId: string, options: {
    period: 'today' | 'week' | 'month' | 'custom';
    startDate?: Date;
    endDate?: Date;
}) {
    let startDate: Date;
    let endDate = new Date();
    endDate.setHours(23, 59, 59, 999);

    switch (options.period) {
        case 'today':
            startDate = new Date();
            startDate.setHours(0, 0, 0, 0);
            break;
        case 'week':
            startDate = new Date();
            startDate.setDate(startDate.getDate() - 7);
            startDate.setHours(0, 0, 0, 0);
            break;
        case 'month':
            startDate = new Date();
            startDate.setMonth(startDate.getMonth() - 1);
            startDate.setHours(0, 0, 0, 0);
            break;
        case 'custom':
            startDate = options.startDate || new Date();
            if (options.endDate) {
                endDate = options.endDate;
            }
            break;
        default:
            startDate = new Date();
            startDate.setHours(0, 0, 0, 0);
    }

    // Get operations in period
    const operations = await prisma.operation.findMany({
        where: {
            tenantId,
            status: 'COMPLETED',
            createdAt: {
                gte: startDate,
                lte: endDate,
            },
        },
        include: {
            createdBy: { select: { name: true } },
        },
        orderBy: { createdAt: 'desc' },
    });

    // Separate by type
    const buys = operations.filter((op: any) => op.type.startsWith('COMPRA') || (op.type === 'COLLECT_CC' && op.mainCurrency === 'USD'));
    const sales = operations.filter((op: any) => op.type.startsWith('VENTA') || (op.type === 'REPAY_CC' && op.mainCurrency === 'USD'));
    const expenses = operations.filter((op: any) => op.type === 'GASTO');
    const withdrawals = operations.filter((op: any) => op.type === 'RETIRO');

    // Calculate totals
    const totalBuysUSD = buys.reduce((sum: number, op: any) => sum + op.mainAmount, 0);
    const totalBuysARS = buys.reduce((sum: number, op: any) => sum + (op.secondaryAmount || 0), 0);
    const totalSalesUSD = sales.reduce((sum: number, op: any) => sum + op.mainAmount, 0);
    const totalSalesARS = sales.reduce((sum: number, op: any) => sum + (op.secondaryAmount || 0), 0);
    const totalExpenses = expenses.reduce((sum: number, op: any) => sum + op.mainAmount, 0);
    const totalWithdrawals = withdrawals.reduce((sum: number, op: any) => sum + op.mainAmount, 0);

    // Get commissions income (from recaudadora operations)
    const commissionsIncomeOps = await prisma.operation.findMany({
        where: {
            tenantId,
            type: 'INGRESO_COMISION',
            createdAt: {
                gte: startDate,
                lte: endDate,
            },
        },
    });
    const totalCommissionsIncome = commissionsIncomeOps.reduce((sum: number, op: any) => sum + op.mainAmount, 0);

    // Get commissions expense (from digital account operations)
    const commissionsExpenseOps = await prisma.operation.findMany({
        where: {
            tenantId,
            type: 'GASTO_COMISION',
            createdAt: {
                gte: startDate,
                lte: endDate,
            },
        },
    });
    const totalCommissionsExpense = commissionsExpenseOps.reduce((sum: number, op: any) => sum + op.mainAmount, 0);

    // Get PPP for the period
    // Get Stock-based PPP (Weighted Average of Remaining Stock)
    // This matches Dashboard logic exactly
    const usdStock = await prisma.usdStockEntry.findMany({
        where: {
            tenantId,
            remaining: { gt: 0 }, // Get all currently remaining stock
        },
    });

    const currentPPP = usdStock.length > 0
        ? usdStock.reduce((sum: number, e: any) => sum + e.remaining * e.rate, 0) /
        usdStock.reduce((sum: number, e: any) => sum + e.remaining, 0)
        : 0;

    // Calculate average buy rate (informative)
    const avgBuyRate = totalBuysUSD > 0 ? totalBuysARS / totalBuysUSD : 0;
    // Calculate average sell rate (informative)
    const avgSellRate = totalSalesUSD > 0 ? totalSalesARS / totalSalesUSD : 0;
    // Spread (informative)
    const spread = avgSellRate - avgBuyRate;

    // Calculate profit using Stock PPP as cost basis
    // We ignore avgBuyRate of the period because we sell from STOCK, not necessarily from today's buys
    const profitResult = calculateRealProfit({
        salesTotal: totalSalesARS,
        usdSold: totalSalesUSD,
        ppp: currentPPP, // Always use stock PPP
        expenses: totalExpenses,
        commissionsIncome: totalCommissionsIncome,
        commissionsExpense: totalCommissionsExpense,
    });

    // Operations by day (for chart)
    const operationsByDay: Record<string, { buys: number; sales: number; profit: number }> = {};

    operations.forEach((op: any) => {
        const day = new Date(op.createdAt).toISOString().split('T')[0];
        if (!operationsByDay[day]) {
            operationsByDay[day] = { buys: 0, sales: 0, profit: 0 };
        }

        if (op.type.startsWith('COMPRA')) {
            operationsByDay[day].buys += op.mainAmount;
        } else if (op.type.startsWith('VENTA')) {
            operationsByDay[day].sales += op.mainAmount;
        }
    });

    return {
        period: {
            start: startDate,
            end: endDate,
        },
        summary: {
            totalOperations: operations.length,
            buys: {
                count: buys.length,
                totalUSD: totalBuysUSD,
                totalARS: totalBuysARS,
                avgRate: avgBuyRate,
            },
            sales: {
                count: sales.length,
                totalUSD: totalSalesUSD,
                totalARS: totalSalesARS,
                avgRate: avgSellRate,
            },
            expenses: {
                count: expenses.length,
                total: totalExpenses,
            },
            withdrawals: {
                count: withdrawals.length,
                total: totalWithdrawals,
            },
            commissionsIncome: totalCommissionsIncome,
            commissionsExpense: totalCommissionsExpense,
            spread,
            ppp: currentPPP,
        },
        profit: profitResult,
        operationsByDay,
        recentOperations: operations.slice(0, 20),
    };
}
