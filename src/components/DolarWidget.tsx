'use client';

import { useEffect, useState } from 'react';
import { RefreshCw, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { formatARS } from '@/lib/utils';

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
            // We only care about Oficial, Blue, MEP, and maybe CCL
            const filtered = data.filter((d: DolarValue) =>
                ['oficial', 'blue', 'mep', 'contadoconliqui'].includes(d.casa)
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
        const interval = setInterval(fetchPrices, 1000 * 60 * 5); // Refrescar cada 5 min
        return () => clearInterval(interval);
    }, []);

    if (loading && prices.length === 0) {
        return (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-pulse">
                {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="h-20 bg-slate-800 rounded-xl" />
                ))}
            </div>
        );
    }

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                    <TrendingUp className="w-3 h-3 text-emerald-500/50" />
                    Mercado USD
                </div>
                <button
                    onClick={fetchPrices}
                    disabled={loading}
                    className="text-slate-500 hover:text-white transition-colors p-1 rounded-md hover:bg-slate-700/50"
                >
                    <RefreshCw className={`w-2.5 h-2.5 ${loading ? 'animate-spin' : ''}`} />
                </button>
            </div>

            <div className="grid grid-cols-1 gap-2">
                {prices.map((price) => (
                    <div key={price.casa} className="bg-slate-900/40 border border-slate-700/30 rounded-lg p-2 hover:border-slate-600 transition-colors group">
                        <div className="flex justify-between items-center">
                            <span className="text-[10px] font-medium text-slate-400 uppercase tracking-tight">{price.nombre === 'Contado con Liqui' ? 'CCL' : price.nombre}</span>
                            <span className="text-xs font-bold text-emerald-400/90 tabular-nums">
                                {formatARS(price.venta).replace('$', '').trim()}
                            </span>
                        </div>
                    </div>
                ))}
            </div>
            {lastUpdated && (
                <p className="text-[8px] text-slate-600 text-right italic mr-1">
                    {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
            )}
        </div>
    );
}
