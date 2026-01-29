'use client';

import { useState } from 'react';
import { formatARS, formatUSD } from '@/lib/utils';
import {
    Calendar,
    TrendingUp,
    TrendingDown,
    DollarSign,
    CreditCard,
    ArrowUpRight,
    ArrowDownLeft
} from 'lucide-react';

interface ReportData {
    period: { start: Date; end: Date };
    summary: {
        totalOperations: number;
        buys: { count: number; totalUSD: number; totalARS: number; avgRate: number };
        sales: { count: number; totalUSD: number; totalARS: number; avgRate: number };
        expenses: { count: number; total: number };
        withdrawals: { count: number; total: number };
        commissionsIncome: number;
        commissionsExpense: number;
        spread: number;
        ppp: number;
    };
    profit: number;
    operationsByDay: Record<string, { buys: number; sales: number; profit: number }>;
}

export function ReportesClient({ initialData }: { initialData: ReportData }) {
    // Ideally we would fetch data based on selected period. 
    // For this MVP, we receive initialData (likely 'today') and could add client-side fetching or router refresh with params.
    // Simplifying to display the provided data.

    // Formatting helper
    const fmt = (n: number) => n.toLocaleString('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 });
    const fmtUSD = (n: number) => n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

    const { summary, profit } = initialData;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white">Reportes de Ganancia</h1>
                    <p className="text-slate-400">Análisis de rentabilidad y operaciones</p>
                </div>
                <div className="flex bg-slate-800 rounded-lg p-1">
                    <button className="px-4 py-1.5 rounded-md text-sm font-medium bg-slate-700 text-white shadow-sm">Hoy</button>
                    <button className="px-4 py-1.5 rounded-md text-sm font-medium text-slate-400 hover:text-white transition-colors">Semana</button>
                    <button className="px-4 py-1.5 rounded-md text-sm font-medium text-slate-400 hover:text-white transition-colors">Mes</button>
                </div>
            </div>

            {/* Main Profit Card */}
            <div className="p-6 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 shadow-xl">
                <div className="flex flex-col md:flex-row justify-between gap-6">
                    <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                            <TrendingUp className="w-5 h-5 text-emerald-400" />
                            <h2 className="text-lg font-semibold text-white">Ganancia Real del Período</h2>
                        </div>
                        <p className={`text-4xl font-bold ${profit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                            {fmt(profit)}
                        </p>
                        <p className="text-sm text-slate-400 mt-1">
                            Calculado como: (Ventas - Costo PPP) + Ingresos Comisiones - Gastos - Comisiones Pagadas
                        </p>
                    </div>

                    <div className="flex gap-4 p-4 rounded-xl bg-slate-800/50 border border-slate-700/50">
                        <div>
                            <p className="text-xs text-slate-400 font-medium uppercase">PPP Promedio</p>
                            <p className="text-xl font-bold text-white">{fmt(summary.ppp)}</p>
                        </div>
                        <div className="w-px bg-slate-700/50 mx-2"></div>
                        <div>
                            <p className="text-xs text-slate-400 font-medium uppercase">Spread Promedio</p>
                            <p className="text-xl font-bold text-emerald-400">{fmt(summary.spread)}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Detailed Breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Sales Section */}
                <div className="p-6 rounded-xl bg-slate-800/50 border border-slate-700/50">
                    <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
                        <ArrowUpRight className="w-4 h-4 text-emerald-400" />
                        Ventas (Ingresos)
                    </h3>
                    <div className="space-y-3">
                        <div className="flex justify-between p-3 rounded-lg bg-slate-700/30">
                            <span className="text-slate-400">Total USD Vendidos</span>
                            <span className="text-white font-medium">{fmtUSD(summary.sales.totalUSD)}</span>
                        </div>
                        <div className="flex justify-between p-3 rounded-lg bg-slate-700/30">
                            <span className="text-slate-400">Total ARS Recibidos</span>
                            <span className="text-white font-medium">{fmt(summary.sales.totalARS)}</span>
                        </div>
                        <div className="flex justify-between p-3 rounded-lg bg-slate-700/30">
                            <span className="text-slate-400">Cotización Promedio</span>
                            <span className="text-emerald-400 font-medium">{fmt(summary.sales.avgRate)}</span>
                        </div>
                        <div className="flex justify-between p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                            <span className="text-emerald-400 font-medium">Ingresos por Comisiones (Recaudadoras)</span>
                            <span className="text-emerald-400 font-bold">{fmt(summary.commissionsIncome)}</span>
                        </div>
                    </div>
                </div>

                {/* Deductions Section */}
                <div className="p-6 rounded-xl bg-slate-800/50 border border-slate-700/50">
                    <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
                        <ArrowDownLeft className="w-4 h-4 text-red-400" />
                        Deducciones y Gastos
                    </h3>
                    <div className="space-y-3">
                        <div className="flex justify-between p-3 rounded-lg bg-slate-700/30">
                            <span className="text-slate-400">Costo de Mercadería (PPP)</span>
                            <span className="text-white font-medium">{fmt(summary.sales.totalUSD * summary.ppp)}</span>
                        </div>
                        <div className="flex justify-between p-3 rounded-lg bg-slate-700/30">
                            <span className="text-slate-400">Gastos Operativos</span>
                            <span className="text-red-400 font-medium">-{fmt(summary.expenses.total)}</span>
                        </div>
                        <div className="flex justify-between p-3 rounded-lg bg-slate-700/30">
                            <span className="text-slate-400">Comisiones Cuentas Digitales</span>
                            <span className="text-red-400 font-medium">-{fmt(summary.commissionsExpense)}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Additional Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 rounded-xl bg-slate-800/30 border border-slate-700/30 text-center">
                    <p className="text-slate-500 text-xs uppercase mb-1">Operaciones Total</p>
                    <p className="text-lg font-bold text-white">{summary.totalOperations}</p>
                </div>
                <div className="p-4 rounded-xl bg-slate-800/30 border border-slate-700/30 text-center">
                    <p className="text-slate-500 text-xs uppercase mb-1">Compras USD</p>
                    <p className="text-lg font-bold text-white">{fmtUSD(summary.buys.totalUSD)}</p>
                </div>
                <div className="p-4 rounded-xl bg-slate-800/30 border border-slate-700/30 text-center">
                    <p className="text-slate-500 text-xs uppercase mb-1">Ventas USD</p>
                    <p className="text-lg font-bold text-white">{fmtUSD(summary.sales.totalUSD)}</p>
                </div>
                <div className="p-4 rounded-xl bg-slate-800/30 border border-slate-700/30 text-center">
                    <p className="text-slate-500 text-xs uppercase mb-1">Retiros</p>
                    <p className="text-lg font-bold text-white">{fmtUSD(summary.withdrawals.total)}</p>
                </div>
            </div>
        </div>
    );
}
