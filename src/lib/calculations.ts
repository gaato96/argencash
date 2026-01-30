import { UsdStockEntry } from '../../prisma/client';

/**
 * Precio Promedio Ponderado (PPP)
 * Calcula el costo promedio del stock de USD
 */
export function calculatePPP(stockEntries: UsdStockEntry[]): number {
    const totalValue = stockEntries.reduce((sum, e) => sum + (e.remaining * e.rate), 0);
    const totalUsd = stockEntries.reduce((sum, e) => sum + e.remaining, 0);
    return totalUsd > 0 ? totalValue / totalUsd : 0;
}

/**
 * Ganancia Real = (Cotización Venta - PPP) * USD Vendidos - Gastos - Comisiones
 */
export function calculateRealProfit(params: {
    salesTotal: number;      // Total vendido en ARS
    usdSold: number;         // USD vendidos
    ppp: number;             // Precio promedio ponderado
    expenses: number;        // Gastos operativos generales del período
    commissionsIncome: number; // Comisiones recibidas (Recaudadoras)
    commissionsExpense: number; // Comisiones pagadas (Cuentas Digitales)
}): number {
    const costBasis = params.usdSold * params.ppp;
    const grossProfit = params.salesTotal - costBasis;
    // La ganancia real es el margen de la venta + lo ganado por recaudadoras - gastos - lo pagado por cuentas
    return grossProfit + params.commissionsIncome - params.expenses - params.commissionsExpense;
}

/**
 * Detección de sobrante en compra digital
 */
export function detectSurplus(params: {
    amountSent: number;      // ARS enviados a tercero
    usdPurchased: number;    // USD comprados
    rate: number;            // Cotización usada
}): { hasSurplus: boolean; amount: number } {
    const expectedArs = params.usdPurchased * params.rate;
    const surplus = params.amountSent - expectedArs;
    return { hasSurplus: surplus > 0, amount: surplus };
}
