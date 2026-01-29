'use client';

import { useState } from 'react';
import { createWithdrawalOperation } from '@/lib/actions/operations';
import { formatUSD } from '@/lib/utils';
import { SearchableAccountSelect } from '@/components/SearchableAccountSelect';

interface Account {
    id: string;
    name: string;
    currency: string;
    type: string;
    ownership: string;
    balance: number;
    isPurchasing: boolean;
}

interface WithdrawUSDFormProps {
    accounts: Account[];
    currentAccounts: any[];
    onSuccess: () => void;
    initialAccountId?: string;
}

export function WithdrawUSDForm({ accounts, currentAccounts, onSuccess, initialAccountId }: WithdrawUSDFormProps) {
    const digitalAccounts = accounts.filter(a => a.currency === 'USD' && a.type === 'VIRTUAL' && a.ownership === 'PROPIO');
    const cashAccounts = accounts.filter(a => a.currency === 'USD' && a.type === 'CASH' && a.ownership === 'PROPIO');

    // Default to 'Caja Dolares' if it exists
    const defaultToAccount = cashAccounts.find(a => a.name.toLowerCase().includes('caja dolares'))?.id || cashAccounts[0]?.id || '';

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const [formData, setFormData] = useState({
        amount: '',
        fromAccountId: initialAccountId || digitalAccounts[0]?.id || '',
        toAccountId: defaultToAccount,
        notes: '',
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            await createWithdrawalOperation({
                amount: parseFloat(formData.amount),
                fromAccountId: formData.fromAccountId,
                toAccountId: formData.toAccountId,
                notes: formData.notes || undefined,
            });
            onSuccess();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error al registrar retiro');
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

            <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                    Monto (USD)
                </label>
                <input
                    type="number"
                    step="0.01"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    className="w-full px-4 py-3 rounded-lg bg-slate-900/50 border border-slate-600/50 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                    placeholder="500"
                    required
                />
            </div>

            <SearchableAccountSelect
                label="Cuenta Digital (Origen)"
                accounts={digitalAccounts}
                value={formData.fromAccountId}
                onValueChange={(val) => setFormData({ ...formData, fromAccountId: val })}
                placeholder="Seleccionar cuenta digital..."
            />

            <SearchableAccountSelect
                label="Cuenta Efectivo (Destino)"
                accounts={cashAccounts}
                value={formData.toAccountId}
                onValueChange={(val) => setFormData({ ...formData, toAccountId: val })}
                placeholder="Seleccionar caja de dólares..."
            />

            <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                    Notas (opcional)
                </label>
                <input
                    type="text"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full px-4 py-3 rounded-lg bg-slate-900/50 border border-slate-600/50 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                    placeholder="Ej: Retiro semanal"
                />
            </div>

            <button
                type="submit"
                disabled={loading}
                className="w-full py-4 px-4 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-500 shadow-lg shadow-blue-900/20 transition-all disabled:opacity-50"
            >
                {loading ? 'Procesando...' : 'Confirmar Retiro USD'}
            </button>
        </form>
    );
}
