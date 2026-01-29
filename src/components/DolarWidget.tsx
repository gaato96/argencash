'use client';

import { useEffect, useState } from 'react';
import { fetchDolarBlue, fetchDolarByType, formatUpdateTime } from '@/lib/dolar-api';
import { formatARS } from '@/lib/utils';

interface DolarData {
    blue: { compra: number; venta: number; fecha: string };
    oficial: { compra: number; venta: number };
    mep: { compra: number; venta: number };
}

export function DolarWidget() {
    const [data, setData] = useState<DolarData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    useEffect(() => {
        async function fetchData() {
            try {
                const [blue, oficial, mep] = await Promise.all([
                    fetchDolarBlue(),
                    fetchDolarByType('oficial'),
                    fetchDolarByType('bolsa'),
                ]);

                setData({
                    blue: {
                        compra: blue.compra,
                        venta: blue.venta,
                        fecha: blue.fechaActualizacion || '',
                    },
                    oficial: {
                        compra: oficial?.compra || 0,
                        venta: oficial?.venta || 0,
                    },
                    mep: {
                        compra: mep?.compra || 0,
                        venta: mep?.venta || 0,
                    },
                });
                setError(false);
            } catch {
                setError(true);
            } finally {
                setLoading(false);
            }
        }

        fetchData();
        // Refresh every 5 minutes
        const interval = setInterval(fetchData, 5 * 60 * 1000);
        return () => clearInterval(interval);
    }, []);

    if (loading) {
        return (
            <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/50 animate-pulse">
                <div className="h-4 bg-slate-700 rounded w-24 mb-3" />
                <div className="space-y-2">
                    <div className="h-6 bg-slate-700 rounded" />
                    <div className="h-6 bg-slate-700 rounded" />
                </div>
            </div>
        );
    }

    if (error || !data) {
        return (
            <div className="p-4 rounded-xl bg-slate-800/50 border border-red-500/30">
                <p className="text-sm text-red-400">Error al cargar cotización</p>
            </div>
        );
    }

    return (
        <div className="p-4 rounded-xl bg-gradient-to-br from-slate-800/80 to-slate-900/80 border border-slate-700/50 backdrop-blur-sm">
            <div className="flex items-center gap-2 mb-3">
                <span className="text-lg">💱</span>
                <h3 className="font-semibold text-white">Dólar Blue</h3>
                <span className="ml-auto text-[10px] text-slate-500 px-2 py-0.5 rounded-full bg-slate-700/50">
                    Referencia
                </span>
            </div>

            {/* Blue Dollar - Main */}
            <div className="grid grid-cols-2 gap-2 mb-3">
                <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                    <p className="text-[10px] text-emerald-400 uppercase tracking-wide">Compra</p>
                    <p className="text-lg font-bold text-emerald-400">{formatARS(data.blue.compra)}</p>
                </div>
                <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/20">
                    <p className="text-[10px] text-blue-400 uppercase tracking-wide">Venta</p>
                    <p className="text-lg font-bold text-blue-400">{formatARS(data.blue.venta)}</p>
                </div>
            </div>

            {/* Spread */}
            <div className="flex items-center justify-between text-xs text-slate-400 mb-3 px-1">
                <span>Spread:</span>
                <span className="font-medium text-amber-400">
                    {formatARS(data.blue.venta - data.blue.compra)}
                </span>
            </div>

            {/* Divider */}
            <div className="border-t border-slate-700/50 my-3" />

            {/* Other rates */}
            <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between text-slate-400">
                    <span>Oficial</span>
                    <span className="font-medium text-slate-300">{formatARS(data.oficial.venta)}</span>
                </div>
                <div className="flex items-center justify-between text-slate-400">
                    <span>MEP</span>
                    <span className="font-medium text-slate-300">{formatARS(data.mep.venta)}</span>
                </div>
            </div>

            {/* Update time */}
            <div className="mt-3 pt-2 border-t border-slate-700/30">
                <p className="text-[10px] text-slate-500 flex items-center gap-1">
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    {formatUpdateTime(data.blue.fecha)}
                </p>
            </div>
        </div>
    );
}
