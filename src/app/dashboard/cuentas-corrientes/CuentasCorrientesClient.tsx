'use client';

import { useState } from 'react';
import { formatARS, formatUSD } from '@/lib/utils';
import {
    receiveMoney,
    repayMoney,
    lendMoney,
    collectDebt,
    createCurrentAccount,
    deleteCurrentAccount
} from '@/lib/actions/current-accounts';
import { SearchableAccountSelect } from '@/components/SearchableAccountSelect';
import { Trash2 } from 'lucide-react';
import {
    Users,
    ArrowDownLeft,
    ArrowUpRight,
    History,
    Plus,
    X,
    TrendingDown,
    TrendingUp
} from 'lucide-react';

interface CurrentAccount {
    id: string;
    name: string;
    balanceARS: number;
    balanceUSD: number;
    movements: any[];
}

interface CuentasCorrientesClientProps {
    accounts: CurrentAccount[];
    physicalAccounts: any[];
}

export function CuentasCorrientesClient({ accounts, physicalAccounts }: CuentasCorrientesClientProps) {
    const [selectedAccount, setSelectedAccount] = useState<CurrentAccount | null>(null);
    const [actionType, setActionType] = useState<'BORROW' | 'REPAY' | 'LEND' | 'COLLECT' | null>(null);
    const [amount, setAmount] = useState('');
    const [description, setDescription] = useState('');
    const [selectedPhysicalAccountId, setSelectedPhysicalAccountId] = useState('');
    const [currency, setCurrency] = useState<'ARS' | 'USD'>('ARS');
    const [targetCurrency, setTargetCurrency] = useState<'ARS' | 'USD' | null>(null);
    const [exchangeRate, setExchangeRate] = useState('');
    const [loading, setLoading] = useState(false);
    const [showHistory, setShowHistory] = useState(false);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newName, setNewName] = useState('');

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await createCurrentAccount({ name: newName });
            setShowCreateModal(false);
            setNewName('');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('¿Estás seguro de eliminar esta cuenta corriente?')) return;
        setLoading(true);
        try {
            await deleteCurrentAccount(id);
        } finally {
            setLoading(false);
        }
    };

    const handleAction = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedAccount || !actionType) return;

        setLoading(true);
        const val = parseFloat(amount);
        const params = {
            currentAccountId: selectedAccount.id,
            amount: val,
            currency,
            description,
            targetAccountId: selectedPhysicalAccountId || undefined,
            targetCurrency: targetCurrency || undefined,
            exchangeRate: (currency !== (targetCurrency || currency)) ? parseFloat(exchangeRate) : undefined
        };

        try {
            if (actionType === 'BORROW') {
                await receiveMoney(params);
            } else if (actionType === 'REPAY') {
                await repayMoney(params);
            } else if (actionType === 'LEND') {
                await lendMoney(params);
            } else if (actionType === 'COLLECT') {
                await collectDebt(params);
            }
            setSelectedAccount(null);
            setActionType(null);
            setAmount('');
            setCurrency('ARS');
            setTargetCurrency(null);
            setExchangeRate('');
            setDescription('');
            setSelectedPhysicalAccountId('');
        } catch (error) {
            console.error(error);
            alert('Error al procesar la operación');
        } finally {
            setLoading(false);
        }
    };

    const getActionTitle = (type: string) => {
        switch (type) {
            case 'BORROW': return 'Recibir Préstamo (Deuda)';
            case 'REPAY': return 'Devolver Deuda';
            case 'LEND': return 'Prestar Dinero (A Favor)';
            case 'COLLECT': return 'Cobrar Deuda';
            default: return '';
        }
    };

    const totalAfavorARS = accounts.reduce((sum, acc) => acc.balanceARS > 0 ? sum + acc.balanceARS : sum, 0);
    const totalEnContraARS = accounts.reduce((sum, acc) => acc.balanceARS < 0 ? sum + acc.balanceARS : sum, 0);
    const totalAfavorUSD = accounts.reduce((sum, acc) => acc.balanceUSD > 0 ? sum + acc.balanceUSD : sum, 0);
    const totalEnContraUSD = accounts.reduce((sum, acc) => acc.balanceUSD < 0 ? sum + acc.balanceUSD : sum, 0);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white">Cuentas Corrientes</h1>
                    <p className="text-slate-400">Gestión de préstamos y liquidez con terceros</p>
                </div>
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium transition-colors"
                >
                    <Plus className="w-4 h-4" />
                    Nueva Cuenta
                </button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-slate-800 border border-slate-700">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Resumen Pesos (ARS)</p>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <p className="text-xs text-slate-400">A Favor</p>
                            <p className="text-lg font-bold text-emerald-400">{formatARS(totalAfavorARS)}</p>
                        </div>
                        <div>
                            <p className="text-xs text-slate-400">En Contra</p>
                            <p className="text-lg font-bold text-red-400">{formatARS(totalEnContraARS)}</p>
                        </div>
                    </div>
                </div>
                <div className="p-4 rounded-xl bg-slate-800 border border-slate-700">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Resumen Dólares (USD)</p>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <p className="text-xs text-slate-400">A Favor</p>
                            <p className="text-lg font-bold text-emerald-400">{formatUSD(totalAfavorUSD)}</p>
                        </div>
                        <div>
                            <p className="text-xs text-slate-400">En Contra</p>
                            <p className="text-lg font-bold text-red-400">{formatUSD(totalEnContraUSD)}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Accounts List */}
            <div className="grid gap-4">
                {accounts.map(acc => (
                    <div key={acc.id} className="p-6 rounded-xl bg-slate-800/50 border border-slate-700/50 hover:border-slate-600/50 transition-colors">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-full bg-slate-700 flex items-center justify-center">
                                    <Users className="w-6 h-6 text-slate-300" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-white text-lg">{acc.name}</h3>
                                    <div className="flex gap-2 mt-1">
                                        <span className={`text-[10px] px-2 py-0.5 rounded-full ${acc.balanceARS >= 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                                            ARS: {formatARS(acc.balanceARS)}
                                        </span>
                                        <span className={`text-[10px] px-2 py-0.5 rounded-full ${acc.balanceUSD >= 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                                            USD: {formatUSD(acc.balanceUSD)}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => handleDelete(acc.id)}
                                    className="p-2 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-400/10 transition-colors"
                                    title="Eliminar Cuenta"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                            {/* Actions if WE OWE (Negative Balance) */}
                            <button
                                onClick={() => { setSelectedAccount(acc); setActionType('BORROW'); }}
                                className="flex flex-col items-center justify-center p-3 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 transition-colors"
                            >
                                <ArrowDownLeft className="w-5 h-5 mb-1" />
                                <span className="text-xs font-medium">Recibir (Deuda)</span>
                            </button>
                            <button
                                onClick={() => { setSelectedAccount(acc); setActionType('REPAY'); }}
                                className="flex flex-col items-center justify-center p-3 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 transition-colors"
                            >
                                <ArrowUpRight className="w-5 h-5 mb-1" />
                                <span className="text-xs font-medium">Devolver (Pagar)</span>
                            </button>

                            {/* Actions if THEY OWE (Positive Balance) */}
                            <button
                                onClick={() => { setSelectedAccount(acc); setActionType('LEND'); }}
                                className="flex flex-col items-center justify-center p-3 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 transition-colors"
                            >
                                <ArrowUpRight className="w-5 h-5 mb-1" />
                                <span className="text-xs font-medium">Prestar (Dar)</span>
                            </button>
                            <button
                                onClick={() => { setSelectedAccount(acc); setActionType('COLLECT'); }}
                                className="flex flex-col items-center justify-center p-3 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20 transition-colors"
                            >
                                <ArrowDownLeft className="w-5 h-5 mb-1" />
                                <span className="text-xs font-medium">Cobrar (Recibir)</span>
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {/* Action Modal */}
            {selectedAccount && actionType && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="w-full max-w-md bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl">
                        <div className="flex items-center justify-between p-4 border-b border-slate-700">
                            <div>
                                <h2 className="text-lg font-semibold text-white">{getActionTitle(actionType)}</h2>
                                <p className="text-sm text-slate-400">{selectedAccount.name}</p>
                            </div>
                            <button onClick={() => { setSelectedAccount(null); setActionType(null); }} className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleAction} className="p-4 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-3 rounded-lg bg-slate-700/50">
                                    <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Saldo ARS</p>
                                    <p className={`font-medium ${selectedAccount.balanceARS >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                        {formatARS(selectedAccount.balanceARS)}
                                    </p>
                                </div>
                                <div className="p-3 rounded-lg bg-slate-700/50">
                                    <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Saldo USD</p>
                                    <p className={`font-medium ${selectedAccount.balanceUSD >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                        {formatUSD(selectedAccount.balanceUSD)}
                                    </p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-1">Moneda</label>
                                    <select
                                        value={currency}
                                        onChange={(e) => setCurrency(e.target.value as 'ARS' | 'USD')}
                                        className="w-full px-4 py-3 rounded-lg bg-slate-900 border border-slate-600 text-white"
                                    >
                                        <option value="ARS">ARS</option>
                                        <option value="USD">USD</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-1">Monto</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={amount}
                                        onChange={(e) => setAmount(e.target.value)}
                                        className="w-full px-4 py-3 rounded-lg bg-slate-900/50 border border-slate-600/50 text-white"
                                        required
                                        autoFocus
                                    />
                                </div>
                            </div>

                            {(actionType === 'REPAY' || actionType === 'COLLECT') && (
                                <div className="p-4 rounded-xl bg-slate-900 border border-slate-700">
                                    <label className="block text-sm font-medium text-slate-300 mb-2">
                                        {actionType === 'REPAY' ? '¿Qué deuda estás cancelando?' : '¿Qué saldo estás cobrando?'}
                                    </label>
                                    <div className="flex gap-4">
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="radio"
                                                name="targetCurrency"
                                                checked={(!targetCurrency || targetCurrency === 'ARS')}
                                                onChange={() => setTargetCurrency('ARS')}
                                                className="w-4 h-4 text-emerald-500 bg-slate-800 border-slate-600 focus:ring-emerald-500 focus:ring-2"
                                            />
                                            <span className="text-slate-300">Pesos (ARS)</span>
                                        </label>
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="radio"
                                                name="targetCurrency"
                                                checked={targetCurrency === 'USD'}
                                                onChange={() => setTargetCurrency('USD')}
                                                className="w-4 h-4 text-emerald-500 bg-slate-800 border-slate-600 focus:ring-emerald-500 focus:ring-2"
                                            />
                                            <span className="text-slate-300">Dólares (USD)</span>
                                        </label>
                                    </div>
                                    {currency !== (targetCurrency || currency) && (
                                        <div className="mt-3 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                                            <label className="block text-sm font-medium text-blue-400 mb-1">
                                                Cotización de Conversión
                                            </label>
                                            <input
                                                type="number"
                                                step="0.01"
                                                value={exchangeRate}
                                                onChange={(e) => setExchangeRate(e.target.value)}
                                                className="w-full px-4 py-2 rounded-lg bg-slate-900 border border-blue-500/30 text-white placeholder-slate-500"
                                                placeholder="Ej: 1150"
                                                required
                                            />
                                            <p className="text-xs text-blue-300 mt-2">
                                                Estás pagando con <b>{currency}</b> una deuda en <b>{targetCurrency || 'ARS'}</b>.
                                            </p>
                                        </div>
                                    )}
                                </div>
                            )}

                            <SearchableAccountSelect
                                label="Cuenta Física/Virtual (Afectada)"
                                accounts={physicalAccounts.filter(acc => acc.currency === currency)}
                                value={selectedPhysicalAccountId}
                                onValueChange={setSelectedPhysicalAccountId}
                                placeholder="Seleccionar cuenta..."
                            />

                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">Nota / Descripción</label>
                                <input
                                    type="text"
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    className="w-full px-4 py-3 rounded-lg bg-slate-900/50 border border-slate-600/50 text-white"
                                    placeholder="Opcional"
                                />
                            </div>

                            <button type="submit" disabled={loading} className="w-full py-3 rounded-lg bg-emerald-500 text-white font-semibold hover:bg-emerald-600 disabled:opacity-50">
                                {loading ? 'Procesando...' : 'Confirmar'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
            {/* Create Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="w-full max-w-md bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl">
                        <div className="flex items-center justify-between p-4 border-b border-slate-700">
                            <h2 className="text-lg font-semibold text-white">Nueva Cuenta Corriente</h2>
                            <button onClick={() => setShowCreateModal(false)} className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <form onSubmit={handleCreate} className="p-4 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">Nombre del Titular</label>
                                <input
                                    type="text"
                                    value={newName}
                                    onChange={(e) => setNewName(e.target.value)}
                                    className="w-full px-4 py-3 rounded-lg bg-slate-900/50 border border-slate-600/50 text-white"
                                    required
                                    placeholder="Ej: Juan Pérez"
                                />
                            </div>
                            <button type="submit" disabled={loading} className="w-full py-3 rounded-lg bg-emerald-500 text-white font-semibold hover:bg-emerald-600 disabled:opacity-50">
                                {loading ? 'Creando...' : 'Crear Cuenta'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
