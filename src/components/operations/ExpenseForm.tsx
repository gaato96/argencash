'use client';

import { useState } from 'react';
import { createExpenseOperation } from '@/lib/actions/operations';
import { formatARS, formatUSD } from '@/lib/utils';
import { SearchableAccountSelect } from '@/components/SearchableAccountSelect';

interface Account {
    id: string;
    name: string;
    currency: string;
    type: string;
    ownership: string;
    balance: number;
}

interface ExpenseFormProps {
    accounts: Account[];
    onSuccess: () => void;
}

export function ExpenseForm({ accounts, onSuccess }: ExpenseFormProps) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [currency, setCurrency] = useState<'ARS' | 'USD'>('ARS');

    const [formData, setFormData] = useState({
        amount: '',
        accountId: '',
        description: '',
        category: 'Varios',
    });

    const categories = ['Comisiones', 'Alquileres', 'Comida', 'Sueldos', 'Servicios', 'Otros', 'Varios'];

    const filteredAccounts = accounts.filter(a => a.currency === currency);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!formData.description.trim()) {
            setError('La descripción es requerida');
            return;
        }

        setLoading(true);

        try {
            await createExpenseOperation({
                amount: parseFloat(formData.amount),
                currency,
                accountId: formData.accountId,
                description: formData.description,
                category: formData.category,
            });
            onSuccess();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error al registrar gasto');
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
                        setFormData({ ...formData, accountId: '' });
                    }}
                    className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${currency === 'ARS' ? 'bg-red-500 text-white' : 'text-slate-400 hover:text-white'
                        }`}
                >
                    ARS
                </button>
                <button
                    type="button"
                    onClick={() => {
                        setCurrency('USD');
                        setFormData({ ...formData, accountId: '' });
                    }}
                    className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${currency === 'USD' ? 'bg-red-500 text-white' : 'text-slate-400 hover:text-white'
                        }`}
                >
                    USD
                </button>
            </div>

            {/* Description & Category */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">
                        Descripción (Notas)
                    </label>
                    <input
                        type="text"
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        className="w-full px-4 py-3 rounded-lg bg-slate-900/50 border border-slate-600/50 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-red-500/50"
                        placeholder="Ej: Pago de luz, taxi, etc."
                        required
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">
                        Categoría
                    </label>
                    <select
                        value={formData.category}
                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                        className="w-full px-4 py-3 rounded-lg bg-slate-900 border border-slate-600 text-white focus:outline-none focus:ring-2 focus:ring-red-500/50"
                    >
                        {categories.map(c => (
                            <option key={c} value={c}>{c}</option>
                        ))}
                    </select>
                </div>
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
                    className="w-full px-4 py-3 rounded-lg bg-slate-900/50 border border-slate-600/50 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-red-500/50"
                    placeholder={currency === 'ARS' ? '50000' : '100'}
                    required
                />
            </div>

            {/* Account */}
            <SearchableAccountSelect
                label="Cuenta de salida"
                accounts={filteredAccounts}
                value={formData.accountId}
                onValueChange={(val) => setFormData({ ...formData, accountId: val })}
                placeholder="Seleccionar cuenta de origen..."
            />

            {/* Submit */}
            <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 rounded-lg bg-red-500 text-white font-semibold hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {loading ? 'Registrando...' : 'Registrar Gasto'}
            </button>
        </form>
    );
}
