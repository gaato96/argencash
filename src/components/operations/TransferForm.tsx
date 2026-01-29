'use client';

import { useState } from 'react';
import { createTransferOperation } from '@/lib/actions/operations';
import { formatARS, formatUSD } from '@/lib/utils';
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

interface TransferFormProps {
    accounts: Account[];
    onSuccess: () => void;
    initialCurrency?: 'ARS' | 'USD';
    initialFromAccountId?: string;
    initialToAccountId?: string;
}

export function TransferForm({ accounts, onSuccess, initialCurrency = 'ARS', initialFromAccountId = '', initialToAccountId = '' }: TransferFormProps) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [currency, setCurrency] = useState<'ARS' | 'USD'>(initialCurrency);

    const [formData, setFormData] = useState({
        amount: '',
        fromAccountId: initialFromAccountId,
        toAccountId: initialToAccountId,
        notes: '',
    });

    const filteredAccounts = accounts.filter(a => a.currency === currency);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (formData.fromAccountId === formData.toAccountId) {
            setError('Las cuentas de origen y destino deben ser diferentes');
            return;
        }

        setLoading(true);

        try {
            await createTransferOperation({
                amount: parseFloat(formData.amount),
                currency,
                fromAccountId: formData.fromAccountId,
                toAccountId: formData.toAccountId,
                notes: formData.notes || undefined,
            });
            onSuccess();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error al registrar operación');
        } finally {
            setLoading(false);
        }
    };

    const formatAmount = currency === 'ARS' ? formatARS : formatUSD;

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                    {error}
                </div>
            )}

            {/* Currency toggle */}
            <div className="flex rounded-lg bg-slate-700/50 p-1">
                <button
                    type="button"
                    onClick={() => {
                        setCurrency('ARS');
                        setFormData({ ...formData, fromAccountId: '', toAccountId: '' });
                    }}
                    className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${currency === 'ARS' ? 'bg-purple-500 text-white' : 'text-slate-400 hover:text-white'
                        }`}
                >
                    ARS
                </button>
                <button
                    type="button"
                    onClick={() => {
                        setCurrency('USD');
                        setFormData({ ...formData, fromAccountId: '', toAccountId: '' });
                    }}
                    className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${currency === 'USD' ? 'bg-purple-500 text-white' : 'text-slate-400 hover:text-white'
                        }`}
                >
                    USD
                </button>
            </div>

            {/* Amount */}
            <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                    Monto
                </label>
                <input
                    type="number"
                    step="0.01"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    className="w-full px-4 py-3 rounded-lg bg-slate-900/50 border border-slate-600/50 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                    placeholder={currency === 'ARS' ? '100000' : '500'}
                    required
                />
            </div>

            {/* From Account */}
            <SearchableAccountSelect
                label="Cuenta origen"
                accounts={filteredAccounts}
                value={formData.fromAccountId}
                onValueChange={(val) => setFormData({ ...formData, fromAccountId: val })}
                placeholder="Seleccionar cuenta de origen..."
            />

            {/* To Account */}
            <SearchableAccountSelect
                label="Cuenta destino"
                accounts={filteredAccounts.filter(a => a.id !== formData.fromAccountId)}
                value={formData.toAccountId}
                onValueChange={(val) => setFormData({ ...formData, toAccountId: val })}
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
                    className="w-full px-4 py-3 rounded-lg bg-slate-900/50 border border-slate-600/50 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                    placeholder="Ej: Transferencia interna"
                />
            </div>

            {/* Submit */}
            <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 rounded-lg bg-purple-500 text-white font-semibold hover:bg-purple-600 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {loading ? 'Registrando...' : 'Registrar Transferencia'}
            </button>
        </form>
    );
}
