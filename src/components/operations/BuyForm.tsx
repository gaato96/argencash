'use client';

import { useState } from 'react';
import { createBuyOperation } from '@/lib/actions/operations';
import { formatARS } from '@/lib/utils';
import { SearchableAccountSelect } from '@/components/SearchableAccountSelect';

interface Account {
    id: string;
    name: string;
    currency: string;
    type: string;
    ownership: string;
    balance: number;
    isPurchasing?: boolean;
}

interface BuyFormProps {
    accounts: Account[];
    currentAccounts: any[];
    onSuccess: () => void;
}

export function BuyForm({ accounts, currentAccounts, onSuccess }: BuyFormProps) {
    const arsAccounts = accounts.filter((a: any) => a.currency === 'ARS' && a.ownership === 'PROPIO');
    const usdAccounts = accounts.filter((a: any) => a.currency === 'USD' && a.ownership === 'PROPIO');

    // Filter digital origins to only accounts marked as "isPurchasing"
    const digitalArsAccounts = arsAccounts.filter((a: any) => a.isPurchasing === true || a.type === 'CASH');

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [isDigital, setIsDigital] = useState(false);

    const [formData, setFormData] = useState({
        usdAmount: '',
        exchangeRate: '',
        arsAccountId: arsAccounts.find((a: any) => a.type === 'CASH')?.id || arsAccounts[0]?.id || '',
        usdAccountId: usdAccounts.find((a: any) => a.type === 'VIRTUAL')?.id || usdAccounts[0]?.id || '',
        notes: '',
    });

    const calculatedARS = formData.usdAmount && formData.exchangeRate
        ? parseFloat(formData.usdAmount) * parseFloat(formData.exchangeRate)
        : 0;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            await createBuyOperation({
                usdAmount: parseFloat(formData.usdAmount),
                exchangeRate: parseFloat(formData.exchangeRate),
                arsAccountId: formData.arsAccountId,
                usdAccountId: formData.usdAccountId,
                isDigital,
                notes: formData.notes || undefined,
            });
            onSuccess();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error al registrar operación');
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                    {error}
                </div>
            )}

            {/* Type toggle */}
            <div className="flex rounded-lg bg-slate-700/50 p-1">
                <button
                    type="button"
                    onClick={() => setIsDigital(false)}
                    className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${!isDigital ? 'bg-emerald-500 text-white' : 'text-slate-400 hover:text-white'
                        }`}
                >
                    Efectivo
                </button>
                <button
                    type="button"
                    onClick={() => setIsDigital(true)}
                    className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${isDigital ? 'bg-emerald-500 text-white' : 'text-slate-400 hover:text-white'
                        }`}
                >
                    Digital
                </button>
            </div>

            {/* USD Amount */}
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">
                        Monto USD
                    </label>
                    <input
                        type="number"
                        step="0.01"
                        value={formData.usdAmount}
                        onChange={(e) => setFormData({ ...formData, usdAmount: e.target.value })}
                        className="w-full px-4 py-3 rounded-lg bg-slate-900/50 border border-slate-600/50 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                        placeholder="1000"
                        required
                        autoFocus
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">
                        Cotización
                    </label>
                    <input
                        type="number"
                        step="0.01"
                        value={formData.exchangeRate}
                        onChange={(e) => setFormData({ ...formData, exchangeRate: e.target.value })}
                        className="w-full px-4 py-3 rounded-lg bg-slate-900/50 border border-slate-600/50 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                        placeholder="1180"
                        required
                    />
                </div>
            </div>

            {/* Calculated total */}
            {calculatedARS > 0 && (
                <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex justify-between items-center">
                    <span className="text-sm font-medium text-slate-400">Total a pagar:</span>
                    <span className="text-xl font-bold text-emerald-400">{formatARS(calculatedARS)}</span>
                </div>
            )}

            {/* ARS Source Account */}
            <SearchableAccountSelect
                label={isDigital ? "Banco Origen (Compradoras)" : "Cuenta Pago (ARS)"}
                accounts={isDigital ? digitalArsAccounts : arsAccounts}
                value={formData.arsAccountId}
                onValueChange={(val) => setFormData({ ...formData, arsAccountId: val })}
                placeholder="Seleccionar cuenta de origen..."
            />

            {/* USD Destination Account */}
            <SearchableAccountSelect
                label={isDigital ? "Cuenta Digital Destino (USD)" : "Caja Destino (USD)"}
                accounts={usdAccounts}
                value={formData.usdAccountId}
                onValueChange={(val) => setFormData({ ...formData, usdAccountId: val })}
                placeholder="Seleccionar cuenta de destino..."
            />

            {/* Notes */}
            <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                    Notas (opcional)
                </label>
                <input
                    type="text"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full px-4 py-3 rounded-lg bg-slate-900/50 border border-slate-600/50 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                    placeholder="Ej: Compra a Juan"
                />
            </div>

            {/* Submit */}
            <button
                type="submit"
                disabled={loading}
                className="w-full py-4 px-4 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-500 shadow-lg shadow-emerald-900/20 transition-all disabled:opacity-50"
            >
                {loading ? 'Procesando...' : 'Confirmar Compra USD'}
            </button>
        </form>
    );
}
