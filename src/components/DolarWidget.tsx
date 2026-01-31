'use client';

import { useEffect, useState } from 'react';
import { RefreshCw, TrendingUp } from 'lucide-react';

interface DolarValue {
    compra: number;
    venta: number;
    casa: string;
    nombre: string;
    moneda: string;
    fechaActualizacion: string;
}

export function DolarWidget() {
    const [prices, setPrices] = useState<DolarValue[]>([]);
    const [loading, setLoading] = useState(true);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

    const fetchPrices = async () => {
        setLoading(true);
        try {
            const response = await fetch('https://dolarapi.com/v1/dolares');
            const data = await response.json();
            const filtered = data.filter((d: DolarValue) =>
                ['oficial', 'blue', 'mep'].includes(d.casa)
            );
            setPrices(filtered);
            setLastUpdated(new Date());
        } catch (error) {
            console.error('Error fetching dolar prices:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPrices();
        const interval = setInterval(fetchPrices, 1000 * 60 * 5);
        return () => clearInterval(interval);
    }, []);

    const blue = prices.find((p) => p.casa === 'blue');
    const oficial = prices.find((p) => p.casa === 'oficial');
    const mep = prices.find((p) => p.casa === 'mep');

    const formatRate = (val?: number) => {
        if (!val) return '$ ---';
        return `$ ${val.toLocaleString('es-AR', { maximumFractionDigits: 0 })}`;
    };

    if (loading && prices.length === 0) {
        return (
            <div className="bg-slate-900/40 border border-slate-800/60 rounded-2xl p-4 animate-pulse">
                <div className="h-4 bg-slate-800 rounded w-1/3 mb-4" />
                <div className="grid grid-cols-2 gap-2">
                    <div className="h-16 bg-slate-800 rounded-xl" />
                    <div className="h-16 bg-slate-800 rounded-xl" />
                </div>
            </div>
        );
    }

    return (
        <div className="bg-[#0f172a]/40 border border-slate-800/60 rounded-2xl p-4 shadow-2xl backdrop-blur-md">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
                    <h3 className="text-[11px] font-bold text-slate-200 uppercase tracking-wider">Dólar Blue</h3>
                </div>
                <span className="text-[9px] font-bold text-slate-500 bg-slate-800/50 px-2 py-0.5 rounded border border-slate-700/50">
                    Referencia
                </span>
            </div>

            {/* Buy/Sell Cards */}
            <div className="grid grid-cols-2 gap-2 mb-3">
                <div className="bg-slate-950/40 border border-emerald-500/10 rounded-xl p-3">
                    <p className="text-[9px] font-bold text-emerald-500/60 uppercase mb-1 tracking-tighter">Compra</p>
                    <p className="text-xl font-black text-emerald-400 tabular-nums">
                        {formatRate(blue?.compra)}
                    </p>
                </div>
                <div className="bg-slate-950/40 border border-blue-500/10 rounded-xl p-3">
                    <p className="text-[9px] font-bold text-blue-500/60 uppercase mb-1 tracking-tighter">Venta</p>
                    <p className="text-xl font-black text-blue-400 tabular-nums">
                        {formatRate(blue?.venta)}
                    </p>
                </div>
            </div>

            {/* Spread and Info */}
            <div className="space-y-2.5">
                <div className="flex justify-between items-center text-[10px] font-bold border-b border-slate-800/50 pb-2">
                    <span className="text-slate-500">Spread:</span>
                    <span className="text-amber-400">$ {(blue?.venta || 0) - (blue?.compra || 0)}</span>
                </div>

                <div className="space-y-1.5 pt-0.5">
                    <div className="flex justify-between items-center text-[11px]">
                        <span className="text-slate-400 font-medium">Oficial</span>
                        <span className="text-slate-200 font-bold tabular-nums">
                            {formatRate(oficial?.venta)}
                        </span>
                    </div>
                    <div className="flex justify-between items-center text-[11px]">
                        <span className="text-slate-400 font-medium">MEP</span>
                        <span className="text-slate-200 font-bold tabular-nums">
                            {formatRate(mep?.venta)}
                        </span>
                    </div>
                </div>
            </div>

            {/* Footer with status indicator */}
            <div className="mt-4 pt-3 border-t border-slate-800/50 flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-[9px] font-medium text-slate-500">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] animate-pulse" />
                    <span>
                        {lastUpdated?.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' })}, {lastUpdated?.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: true }).toLowerCase()}
                    </span>
                </div>
                <button
                    onClick={fetchPrices}
                    disabled={loading}
                    className="text-slate-500 hover:text-slate-300 transition-colors"
                    title="Actualizar cotización"
                >
                    <RefreshCw className={`w-2.5 h-2.5 ${loading ? 'animate-spin' : ''}`} />
                </button>
            </div>
        </div>
    );
}
