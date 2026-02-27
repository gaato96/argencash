'use client';

import { useState } from 'react';
import { formatARS, formatUSD } from '@/lib/utils';
import { createIncomeOperation } from '@/lib/actions/operations';
import { SearchableAccountSelect } from '@/components/SearchableAccountSelect';
import {
    DollarSign,
    Plus,
    X,
    Calendar,
    FileText,
    Wallet,
    ArrowDownLeft,
} from 'lucide-react';

interface Income {
    id: string;
    mainAmount: number;
    mainCurrency: string;
    notes: string | null;
    createdAt: Date;
    createdBy: { name: string | null };
    movements: Array<{
        account: { id: string; name: string; currency: string };
        amount: number;
    }>;
}

interface Account {
    id: string;
    name: string;
    currency: string;
    type: string;
    ownership: string;
    balance: number;
}

interface IngresosClientProps {
    incomes: Income[];
    accounts: Account[];
}

export function IngresosClient({ incomes, accounts }: IngresosClientProps) {
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const [form, setForm] = useState({
        amount: '',
        currency: 'ARS' as 'ARS' | 'USD',
        accountId: '',
        description: '',
        date: new Date().toISOString().split('T')[0],
    });

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            await createIncomeOperation({
                amount: parseFloat(form.amount),
                currency: form.currency,
                accountId: form.accountId,
                description: form.description,
                date: form.date,
            });
            setShowCreateModal(false);
            setForm({
                amount: '',
                currency: 'ARS',
                accountId: '',
                description: '',
                date: new Date().toISOString().split('T')[0],
            });
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error al registrar ingreso');
        } finally {
            setLoading(false);
        }
    };

    const filteredAccounts = accounts.filter((a: any) => a.currency === form.currency);

    const totalARS = incomes
        .filter((i: any) => i.mainCurrency === 'ARS')
        .reduce((sum: number, i: any) => sum + i.mainAmount, 0);
    const totalUSD = incomes
        .filter((i: any) => i.mainCurrency === 'USD')
        .reduce((sum: number, i: any) => sum + i.mainAmount, 0);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white">Ingresos</h1>
                    <p className="text-slate-400">Ingresos directos sin operaciones relacionadas</p>
                </div>
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500 text-white font-medium hover:bg-emerald-600 transition-colors"
                >
                    <Plus className="w-4 h-4" />
                    Nuevo Ingreso
                </button>
            </div>

            {/* Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 sm:p-5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs sm:text-sm text-slate-400">Total Ingresos ARS</p>
                            <p className="text-xl sm:text-2xl font-bold text-emerald-400 tabular-nums">{formatARS(totalARS)}</p>
                        </div>
                        <DollarSign className="w-8 h-8 sm:w-10 sm:h-10 text-emerald-400 opacity-50" />
                    </div>
                </div>
                <div className="p-4 sm:p-5 rounded-xl bg-blue-500/10 border border-blue-500/20">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs sm:text-sm text-slate-400">Total Ingresos USD</p>
                            <p className="text-xl sm:text-2xl font-bold text-blue-400 tabular-nums">{formatUSD(totalUSD)}</p>
                        </div>
                        <DollarSign className="w-8 h-8 sm:w-10 sm:h-10 text-blue-400 opacity-50" />
                    </div>
                </div>
            </div>

            {/* Incomes list */}
            {incomes.length === 0 ? (
                <div className="p-8 rounded-xl bg-slate-800/50 border border-slate-700/50 text-center">
                    <DollarSign className="w-10 h-10 sm:w-12 sm:h-12 text-slate-500 mx-auto mb-4" />
                    <p className="text-sm sm:text-base text-slate-400">No hay ingresos registrados</p>
                    <p className="text-xs text-slate-500 mt-1">Registra tu primer ingreso con el botón de arriba</p>
                </div>
            ) : (
                <div className="space-y-3">
                    <h2 className="text-sm font-bold text-slate-500 uppercase tracking-widest">Últimos Ingresos</h2>
                    <div className="space-y-2">
                        {incomes.map((income: any) => {
                            const account = income.movements?.[0]?.account;
                            const isARS = income.mainCurrency === 'ARS';
                            const formattedDate = new Date(income.createdAt).toLocaleDateString('es-AR', {
                                day: '2-digit',
                                month: '2-digit',
                                year: '2-digit',
                                hour: '2-digit',
                                minute: '2-digit',
                            });

                            return (
                                <div
                                    key={income.id}
                                    className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/50 hover:border-slate-600/50 transition-colors"
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center shrink-0">
                                                <ArrowDownLeft className="w-5 h-5 text-emerald-400" />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-sm font-medium text-white truncate">
                                                    {income.notes || 'Ingreso'}
                                                </p>
                                                <div className="flex items-center gap-2 mt-0.5">
                                                    <span className="text-[10px] text-slate-500 flex items-center gap-1">
                                                        <Wallet className="w-3 h-3" />
                                                        {account?.name || 'Sin cuenta'}
                                                    </span>
                                                    <span className="text-[10px] text-slate-500 flex items-center gap-1">
                                                        <Calendar className="w-3 h-3" />
                                                        {formattedDate}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-right shrink-0 ml-3">
                                            <p className={`text-lg font-bold tabular-nums ${isARS ? 'text-emerald-400' : 'text-blue-400'}`}>
                                                {isARS ? formatARS(income.mainAmount) : formatUSD(income.mainAmount)}
                                            </p>
                                            <span className={`text-[10px] px-2 py-0.5 rounded-full ${isARS ? 'bg-emerald-500/10 text-emerald-400' : 'bg-blue-500/10 text-blue-400'}`}>
                                                {income.mainCurrency}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Create Income Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="w-full max-w-md bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl">
                        <div className="flex items-center justify-between p-4 border-b border-slate-700">
                            <h2 className="text-lg font-semibold text-white">Nuevo Ingreso</h2>
                            <button onClick={() => { setShowCreateModal(false); setError(''); }} className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleCreate} className="p-4 space-y-4">
                            {error && <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}</div>}

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-1">Moneda</label>
                                    <select
                                        value={form.currency}
                                        onChange={(e) => setForm({ ...form, currency: e.target.value as 'ARS' | 'USD', accountId: '' })}
                                        className="w-full px-4 py-3 rounded-lg bg-slate-900 border border-slate-700 text-white"
                                    >
                                        <option value="ARS">ARS (Pesos)</option>
                                        <option value="USD">USD (Dólares)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-1">Monto</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={form.amount}
                                        onChange={(e) => setForm({ ...form, amount: e.target.value })}
                                        className="w-full px-4 py-3 rounded-lg bg-slate-900 border border-slate-700 text-white"
                                        placeholder="0.00"
                                        required
                                        autoFocus
                                    />
                                </div>
                            </div>

                            <SearchableAccountSelect
                                label="Cuenta Destino"
                                accounts={filteredAccounts}
                                value={form.accountId}
                                onValueChange={(val: string) => setForm({ ...form, accountId: val })}
                                placeholder="Seleccionar cuenta..."
                            />

                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">Fecha</label>
                                <input
                                    type="date"
                                    value={form.date}
                                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                                    className="w-full px-4 py-3 rounded-lg bg-slate-900 border border-slate-700 text-white"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">
                                    Descripción <span className="text-slate-500 text-xs">(¿Por qué ingresa este dinero?)</span>
                                </label>
                                <input
                                    type="text"
                                    value={form.description}
                                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                                    className="w-full px-4 py-3 rounded-lg bg-slate-900 border border-slate-700 text-white"
                                    placeholder="Ej: Cobro de alquiler, Devolución préstamo..."
                                    required
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={loading || !form.accountId}
                                className="w-full py-4 rounded-xl bg-emerald-500 text-white font-bold hover:bg-emerald-600 disabled:opacity-50 shadow-lg shadow-emerald-900/20 transition-all"
                            >
                                {loading ? 'Registrando...' : 'Registrar Ingreso'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
