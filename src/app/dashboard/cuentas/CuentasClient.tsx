'use client';

import { useState } from 'react';
import { formatARS, formatUSD } from '@/lib/utils';
import { createAccount } from '@/lib/actions/dashboard';
import {
    History,
    ArrowUpRight,
    ArrowDownLeft,
    Wallet,
    Building2,
    Landmark,
    Smartphone,
    Search,
    Copy,
    Plus,
    X,
    ChevronRight,
    Edit2,
    Trash2,
    Download,
    Upload
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { updateAccount, deleteAccount, importAccountsCSV } from '@/lib/actions/dashboard';

interface Account {
    id: string;
    name: string;
    currency: string;
    type: string;
    ownership: string;
    balance: number;
    bank?: string | null;
    alias?: string | null;
    cbu?: string | null;
    notes?: string | null;
    isPurchasing?: boolean;
    username?: string;
    password?: string;
    initialBalance?: number;
}

interface CuentasClientProps {
    accounts: Account[];
}

const typeIcons = {
    CASH: Wallet,
    BANK: Landmark,
    VIRTUAL: Smartphone,
};

const typeLabels = {
    CASH: 'Efectivo',
    BANK: 'Virtual',
    VIRTUAL: 'Virtual',
};

export function CuentasClient({ accounts }: CuentasClientProps) {
    const router = useRouter();
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
    const [editingAccount, setEditingAccount] = useState<Account | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [currencyFilter, setCurrencyFilter] = useState<'ALL' | 'ARS' | 'USD'>('ALL');
    const [typeFilter, setTypeFilter] = useState<'ALL' | 'CASH' | 'VIRTUAL'>('ALL');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const [form, setForm] = useState({
        name: '',
        currency: 'ARS' as 'ARS' | 'USD',
        type: 'CASH' as 'CASH' | 'VIRTUAL',
        bank: '',
        alias: '',
        cbu: '',
        notes: '',
        isPurchasing: false,
        username: '',
        password: '',
        initialBalance: 0,
    });

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            await createAccount({
                ...form,
                type: form.type as 'CASH' | 'BANK' | 'VIRTUAL',
            });
            setShowCreateModal(false);
            setForm({
                name: '',
                currency: 'ARS',
                type: 'CASH',
                bank: '',
                alias: '',
                cbu: '',
                notes: '',
                isPurchasing: false,
                username: '',
                password: '',
                initialBalance: 0,
            });
            router.refresh();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error al crear cuenta');
        } finally {
            setLoading(false);
        }
    };

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingAccount) return;
        setError('');
        setLoading(true);

        try {
            await updateAccount(editingAccount.id, form);
            setShowEditModal(false);
            setEditingAccount(null);
            router.refresh();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error al actualizar cuenta');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('¿Estás seguro de eliminar esta cuenta?')) return;
        try {
            await deleteAccount(id);
            router.refresh();
        } catch (err) {
            alert('Error al eliminar cuenta');
        }
    };

    const handleDownloadSample = () => {
        const headers = 'Nombre,Moneda,Tipo,Banco,Alias,CBU,Notas';
        const sample = 'Caja Pesos,ARS,CASH,,,\nBanco Galicia USD,USD,VIRTUAL,Galicia,MI.ALIAS.USD,2222222222222222222222,Nota opcional';
        const blob = new Blob([`${headers}\n${sample}`], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'cuentas_ejemplo.csv';
        a.click();
    };

    const handleImportCSV = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (event) => {
            const text = event.target?.result as string;
            const lines = text.split('\n');
            const data = lines.slice(1).map((line: any) => {
                const parts = line.split(',');
                return {
                    name: parts[0]?.trim(),
                    currency: parts[1]?.trim(),
                    type: parts[2]?.trim(),
                    bank: parts[3]?.trim(),
                    alias: parts[4]?.trim(),
                    cbu: parts[5]?.trim(),
                    notes: parts[6]?.trim(),
                };
            }).filter((row: any) => row.name);

            try {
                await importAccountsCSV(data);
                router.refresh();
                alert('Importación completada');
            } catch (err) {
                alert('Error en la importación');
            }
        };
        reader.readAsText(file);
    };

    const filteredAllAccounts = accounts.filter((a: any) => {
        const matchesSearch = a.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (a.bank && a.bank.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (a.alias && a.alias.toLowerCase().includes(searchTerm.toLowerCase()));

        const matchesCurrency = currencyFilter === 'ALL' || a.currency === currencyFilter;
        const matchesType = typeFilter === 'ALL' || a.type === typeFilter;

        return matchesSearch && matchesCurrency && matchesType;
    });

    const totalARS = accounts.filter((a: any) => a.currency === 'ARS').reduce((s: number, a: any) => s + a.balance, 0);
    const totalUSD = accounts.filter((a: any) => a.currency === 'USD').reduce((s: number, a: any) => s + a.balance, 0);
    const cashARS = accounts.filter((a: any) => a.type === 'CASH' && a.currency === 'ARS').reduce((s: number, a: any) => s + a.balance, 0);
    const digitalARS = accounts.filter((a: any) => a.type !== 'CASH' && a.currency === 'ARS').reduce((s: number, a: any) => s + a.balance, 0);

    const renderAccountList = (accountList: Account[], title: string, color: string) => (
        <div className={`rounded-xl bg-slate-800/50 border border-${color}-500/20 overflow-hidden`}>
            <div className={`p-4 border-b border-slate-700/50 bg-${color}-500/5`}>
                <h2 className={`font-semibold text-${color}-400`}>{title}</h2>
            </div>

            {accountList.length === 0 ? (
                <p className="p-4 text-center text-slate-400">No hay cuentas</p>
            ) : (
                <div className="divide-y divide-slate-700/50">
                    {[...accountList]
                        .sort((a, b) => b.balance - a.balance)
                        .map((account: any) => {
                            const Icon = typeIcons[account.type as keyof typeof typeIcons] || Wallet;
                            const formatFn = account.currency === 'USD' ? formatUSD : formatARS;

                            return (
                                <div
                                    key={account.id}
                                    onClick={() => setSelectedAccount(account)}
                                    className="p-4 hover:bg-slate-700/20 transition-colors cursor-pointer group"
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-10 h-10 rounded-xl bg-${color}-500/20 flex items-center justify-center`}>
                                                <Icon className={`w-5 h-5 text-${color}-400`} />
                                            </div>
                                            <div>
                                                <p className="font-medium text-white">{account.name}</p>
                                                <div className="flex items-center gap-2 text-xs text-slate-400">
                                                    <span>{typeLabels[account.type as keyof typeof typeLabels]}</span>
                                                    {(account.bank || account.alias) && <span>•</span>}
                                                    <span>{account.currency}</span>
                                                    {account.bank && (
                                                        <>
                                                            <span>•</span>
                                                            <span className="flex items-center gap-1">
                                                                {account.bank}
                                                            </span>
                                                        </>
                                                    )}
                                                    {account.alias && (
                                                        <>
                                                            <span>•</span>
                                                            <span className="flex items-center gap-1 opacity-70">
                                                                {account.alias}
                                                            </span>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <p className={`text-lg font-bold ${account.balance >= 0 ? `text-${color}-400` : 'text-red-400'}`}>
                                                {formatFn(account.balance)}
                                            </p>
                                            <div className="flex items-center gap-1">
                                                {account.currency === 'USD' && account.type === 'VIRTUAL' && (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            // Redirect to operations or open withdrawal form
                                                            router.push(`/dashboard/operaciones?action=retiro&fromAccountId=${account.id}`);
                                                        }}
                                                        title="Retiro USD (Virtual -> Efectivo)"
                                                        className="p-1.5 rounded-lg text-blue-400 hover:bg-blue-500/10 transition-colors"
                                                    >
                                                        <Download className="w-3.5 h-3.5" />
                                                    </button>
                                                )}
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setEditingAccount(account);
                                                        setForm({
                                                            name: account.name,
                                                            currency: account.currency as 'ARS' | 'USD',
                                                            type: account.type as 'CASH' | 'VIRTUAL',
                                                            bank: account.bank || '',
                                                            alias: account.alias || '',
                                                            cbu: account.cbu || '',
                                                            notes: account.notes || '',
                                                            isPurchasing: account.isPurchasing || false,
                                                            username: account.username || '',
                                                            password: account.password || '',
                                                            initialBalance: account.initialBalance || 0,
                                                        });
                                                        setShowEditModal(true);
                                                    }}
                                                    className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-slate-700 transition-colors"
                                                >
                                                    <Edit2 className="w-3.5 h-3.5" />
                                                </button>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleDelete(account.id);
                                                    }}
                                                    className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                                <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-slate-400 transition-colors ml-1" />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                </div>
            )}
        </div>
    );

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white">Cuentas</h1>
                    <p className="text-slate-400">Gestión de cuentas y saldos</p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={handleDownloadSample}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800 text-slate-300 text-sm hover:bg-slate-700 border border-slate-700 transition-colors"
                    >
                        <Download className="w-4 h-4" />
                        Ejemplo CSV
                    </button>
                    <label className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800 text-slate-300 text-sm hover:bg-slate-700 border border-slate-700 cursor-pointer transition-colors">
                        <Upload className="w-4 h-4" />
                        Importar CSV
                        <input type="file" accept=".csv" onChange={handleImportCSV} className="hidden" />
                    </label>
                    <button
                        onClick={() => {
                            setForm({
                                name: '',
                                currency: 'ARS',
                                type: 'CASH',
                                bank: '',
                                alias: '',
                                cbu: '',
                                notes: '',
                                isPurchasing: false,
                                username: '',
                                password: '',
                                initialBalance: 0,
                            });
                            setShowCreateModal(true);
                        }}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500 text-white font-medium hover:bg-emerald-600 transition-colors"
                    >
                        <Plus className="w-4 h-4" />
                        Nueva Cuenta
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                    <input
                        type="text"
                        placeholder="Buscar por nombre, banco, alias..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-800/50 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                    />
                </div>
                <div className="flex flex-wrap gap-2">
                    <div className="flex bg-slate-800/50 p-1 rounded-xl border border-slate-700">
                        {['ALL', 'ARS', 'USD'].map((curr: any) => (
                            <button
                                key={curr}
                                onClick={() => setCurrencyFilter(curr as any)}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${currencyFilter === curr
                                    ? 'bg-emerald-500 text-white'
                                    : 'text-slate-400 hover:text-white'
                                    }`}
                            >
                                {curr === 'ALL' ? 'Todas' : curr}
                            </button>
                        ))}
                    </div>
                    <div className="flex bg-slate-800/50 p-1 rounded-xl border border-slate-700">
                        {['ALL', 'CASH', 'VIRTUAL'].map((type: any) => (
                            <button
                                key={type}
                                onClick={() => setTypeFilter(type as any)}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${typeFilter === type
                                    ? 'bg-blue-500 text-white'
                                    : 'text-slate-400 hover:text-white'
                                    }`}
                            >
                                {type === 'ALL' ? 'Todos' : type === 'CASH' ? 'Efectivo' : 'Virtual'}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Summary */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                    <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Total ARS</p>
                    <p className="text-xl font-bold text-emerald-400">{formatARS(totalARS)}</p>
                </div>
                <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                    <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Total USD</p>
                    <p className="text-xl font-bold text-emerald-400">{formatUSD(totalUSD)}</p>
                </div>
                <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
                    <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">ARS Efectivo</p>
                    <p className="text-xl font-bold text-blue-400">{formatARS(cashARS)}</p>
                </div>
                <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20">
                    <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">ARS Virtual</p>
                    <p className="text-xl font-bold text-purple-400">{formatARS(digitalARS)}</p>
                </div>
            </div>

            {/* Accounts List */}
            {renderAccountList(filteredAllAccounts, 'Listado de Cuentas', 'emerald')}

            {/* Create Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="w-full max-w-md bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl">
                        <div className="flex items-center justify-between p-4 border-b border-slate-700">
                            <h2 className="text-lg font-semibold text-white">Nueva Cuenta</h2>
                            <button
                                onClick={() => setShowCreateModal(false)}
                                className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleCreate} className="p-4 space-y-4">
                            {error && (
                                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                                    {error}
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">Nombre</label>
                                <input
                                    type="text"
                                    value={form.name}
                                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                                    className="w-full px-4 py-3 rounded-lg bg-slate-900/50 border border-slate-600/50 text-white"
                                    placeholder="Ej: Caja Principal"
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-1">Moneda</label>
                                    <select
                                        value={form.currency}
                                        onChange={(e) => setForm({ ...form, currency: e.target.value as 'ARS' | 'USD' })}
                                        className="w-full px-4 py-3 rounded-lg bg-slate-900/50 border border-slate-600/50 text-white"
                                    >
                                        <option value="ARS">ARS</option>
                                        <option value="USD">USD</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-1">Tipo</label>
                                    <select
                                        value={form.type}
                                        onChange={(e) => setForm({ ...form, type: e.target.value as 'CASH' | 'VIRTUAL' })}
                                        className="w-full px-4 py-3 rounded-lg bg-slate-900/50 border border-slate-600/50 text-white"
                                    >
                                        <option value="CASH">Efectivo</option>
                                        <option value="VIRTUAL">Virtual (Banco/Digital)</option>
                                    </select>
                                </div>
                            </div>

                            {form.type === 'VIRTUAL' && (
                                <>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-slate-300 mb-1">Banco / Plataforma</label>
                                            <input
                                                type="text"
                                                value={form.bank}
                                                onChange={(e) => setForm({ ...form, bank: e.target.value })}
                                                className="w-full px-4 py-3 rounded-lg bg-slate-900/50 border border-slate-600/50 text-white"
                                                placeholder="Ej: Santander, MP"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-slate-300 mb-1">Alias</label>
                                            <input
                                                type="text"
                                                value={form.alias}
                                                onChange={(e) => setForm({ ...form, alias: e.target.value })}
                                                className="w-full px-4 py-3 rounded-lg bg-slate-900/50 border border-slate-600/50 text-white"
                                                placeholder="Ej: MI.ALIAS"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-slate-300 mb-1">CBU / CVU</label>
                                        <input
                                            type="text"
                                            value={form.cbu}
                                            onChange={(e) => setForm({ ...form, cbu: e.target.value })}
                                            className="w-full px-4 py-3 rounded-lg bg-slate-900/50 border border-slate-600/50 text-white"
                                            placeholder="22 dígitos..."
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-slate-300 mb-1">Usuario</label>
                                            <input
                                                type="text"
                                                value={form.username}
                                                onChange={(e) => setForm({ ...form, username: e.target.value })}
                                                className="w-full px-4 py-3 rounded-lg bg-slate-900/50 border border-slate-600/50 text-white"
                                                placeholder="Usuario..."
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-300 mb-1">Clave</label>
                                            <input
                                                type="text"
                                                value={form.password}
                                                onChange={(e) => setForm({ ...form, password: e.target.value })}
                                                className="w-full px-4 py-3 rounded-lg bg-slate-900/50 border border-slate-600/50 text-white"
                                                placeholder="Clave..."
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={form.isPurchasing}
                                                onChange={(e) => setForm({ ...form, isPurchasing: e.target.checked })}
                                                className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-emerald-500 focus:ring-emerald-500/50"
                                            />
                                            <span className="text-sm font-medium text-slate-300">Es cuenta compradora (Apta compras USD)</span>
                                        </label>
                                    </div>
                                </>
                            )}

                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">Saldo Inicial</label>
                                <input
                                    type="number"
                                    value={form.initialBalance}
                                    onChange={(e) => setForm({ ...form, initialBalance: parseFloat(e.target.value) || 0 })}
                                    className="w-full px-4 py-3 rounded-lg bg-slate-900/50 border border-slate-600/50 text-white"
                                    placeholder="0.00"
                                    step="0.01"
                                />
                                <p className="text-[10px] text-slate-500 mt-1">Este saldo generará un movimiento de ajuste inicial.</p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">Notas (Opcional)</label>
                                <textarea
                                    value={form.notes}
                                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                                    className="w-full px-4 py-2 rounded-lg bg-slate-900/50 border border-slate-600/50 text-white resize-none"
                                    rows={2}
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-3 rounded-lg bg-emerald-500 text-white font-semibold hover:bg-emerald-600 disabled:opacity-50"
                            >
                                {loading ? 'Creando...' : 'Crear Cuenta'}
                            </button>
                        </form>
                    </div>
                </div>
            )
            }

            {/* Edit Modal */}
            {
                showEditModal && editingAccount && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                        <div className="w-full max-w-md bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl">
                            <div className="flex items-center justify-between p-4 border-b border-slate-700">
                                <h2 className="text-lg font-semibold text-white">Editar Cuenta</h2>
                                <button
                                    onClick={() => {
                                        setShowEditModal(false);
                                        setEditingAccount(null);
                                    }}
                                    className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <form onSubmit={handleUpdate} className="p-4 space-y-4">
                                {error && (
                                    <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                                        {error}
                                    </div>
                                )}

                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-1">Nombre</label>
                                    <input
                                        type="text"
                                        value={form.name}
                                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                                        className="w-full px-4 py-3 rounded-lg bg-slate-900/50 border border-slate-600/50 text-white"
                                        required
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-300 mb-1">Moneda</label>
                                        <select
                                            value={form.currency}
                                            onChange={(e) => setForm({ ...form, currency: e.target.value as 'ARS' | 'USD' })}
                                            className="w-full px-4 py-3 rounded-lg bg-slate-900/50 border border-slate-600/50 text-white"
                                        >
                                            <option value="ARS">ARS</option>
                                            <option value="USD">USD</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-slate-300 mb-1">Tipo</label>
                                        <select
                                            value={form.type}
                                            onChange={(e) => setForm({ ...form, type: e.target.value as 'CASH' | 'VIRTUAL' })}
                                            className="w-full px-4 py-3 rounded-lg bg-slate-900/50 border border-slate-600/50 text-white"
                                        >
                                            <option value="CASH">Efectivo</option>
                                            <option value="VIRTUAL">Virtual (Banco/Digital)</option>
                                        </select>
                                    </div>
                                </div>

                                {form.type === 'VIRTUAL' && (
                                    <>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-slate-300 mb-1">Banco / Plataforma</label>
                                                <input
                                                    type="text"
                                                    value={form.bank}
                                                    onChange={(e) => setForm({ ...form, bank: e.target.value })}
                                                    className="w-full px-4 py-3 rounded-lg bg-slate-900/50 border border-slate-600/50 text-white"
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium text-slate-300 mb-1">Alias</label>
                                                <input
                                                    type="text"
                                                    value={form.alias}
                                                    onChange={(e) => setForm({ ...form, alias: e.target.value })}
                                                    className="w-full px-4 py-3 rounded-lg bg-slate-900/50 border border-slate-600/50 text-white"
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-slate-300 mb-1">CBU / CVU</label>
                                            <input
                                                type="text"
                                                value={form.cbu}
                                                onChange={(e) => setForm({ ...form, cbu: e.target.value })}
                                                className="w-full px-4 py-3 rounded-lg bg-slate-900/50 border border-slate-600/50 text-white"
                                            />
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-slate-300 mb-1">Usuario</label>
                                                <input
                                                    type="text"
                                                    value={form.username}
                                                    onChange={(e) => setForm({ ...form, username: e.target.value })}
                                                    className="w-full px-4 py-3 rounded-lg bg-slate-900/50 border border-slate-600/50 text-white"
                                                    placeholder="Usuario..."
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-slate-300 mb-1">Clave</label>
                                                <input
                                                    type="text"
                                                    value={form.password}
                                                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                                                    className="w-full px-4 py-3 rounded-lg bg-slate-900/50 border border-slate-600/50 text-white"
                                                    placeholder="Clave..."
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={form.isPurchasing}
                                                    onChange={(e) => setForm({ ...form, isPurchasing: e.target.checked })}
                                                    className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-emerald-500 focus:ring-emerald-500/50"
                                                />
                                                <span className="text-sm font-medium text-slate-300">Es cuenta compradora (Apta compras USD)</span>
                                            </label>
                                        </div>
                                    </>
                                )}

                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-1">Notas (Opcional)</label>
                                    <textarea
                                        value={form.notes}
                                        onChange={(e) => setForm({ ...form, notes: e.target.value })}
                                        className="w-full px-4 py-2 rounded-lg bg-slate-900/50 border border-slate-600/50 text-white resize-none"
                                        rows={2}
                                    />
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full py-3 rounded-lg bg-emerald-500 text-white font-semibold hover:bg-emerald-600 disabled:opacity-50"
                                >
                                    {loading ? 'Sincronizando...' : 'Guardar Cambios'}
                                </button>
                            </form>
                        </div>
                    </div>
                )
            }
            {/* Detail Modal */}
            {selectedAccount && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="w-full max-w-lg bg-slate-800 border border-slate-700 rounded-3xl shadow-2xl overflow-hidden">
                        <div className="relative p-6 bg-gradient-to-br from-slate-700/50 to-slate-800/50 border-b border-slate-700">
                            <button
                                onClick={() => setSelectedAccount(null)}
                                className="absolute top-4 right-4 p-2 rounded-xl bg-slate-900/50 text-slate-400 hover:text-white"
                            >
                                <X className="w-5 h-5" />
                            </button>

                            <div className="flex items-center gap-4 mb-4">
                                <div className={`w-14 h-14 rounded-2xl bg-emerald-500/20 flex items-center justify-center`}>
                                    {(() => {
                                        const Icon = typeIcons[selectedAccount.type as keyof typeof typeIcons] || Wallet;
                                        return <Icon className="w-7 h-7 text-emerald-400" />;
                                    })()}
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-white">{selectedAccount.name}</h3>
                                    <div className="flex items-center gap-2">
                                        <p className="text-slate-400 text-sm">
                                            {typeLabels[selectedAccount.type as keyof typeof typeLabels]} • {selectedAccount.currency}
                                        </p>
                                        {selectedAccount.isPurchasing && (
                                            <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold">COMPRADORA</span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="mt-2">
                                <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Saldo Actual</p>
                                <p className={`text-3xl font-black ${selectedAccount.balance >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                    {selectedAccount.currency === 'USD' ? formatUSD(selectedAccount.balance) : formatARS(selectedAccount.balance)}
                                </p>
                            </div>
                        </div>

                        <div className="p-6 space-y-6">
                            {(selectedAccount.type === 'BANK' || selectedAccount.type === 'VIRTUAL') && (
                                <div className="space-y-4">
                                    <h4 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                                        <Building2 className="w-4 h-4 text-emerald-400" />
                                        Información de la Cuenta
                                    </h4>
                                    <div className="grid grid-cols-1 gap-3">
                                        {selectedAccount.bank && (
                                            <div className="p-3 rounded-xl bg-slate-900/50 border border-slate-700 flex justify-between items-center">
                                                <div>
                                                    <p className="text-[10px] text-slate-500 uppercase font-bold">Entidad</p>
                                                    <p className="text-sm text-white font-medium">{selectedAccount.bank}</p>
                                                </div>
                                            </div>
                                        )}
                                        {selectedAccount.cbu && (
                                            <div className="p-3 rounded-xl bg-slate-900/50 border border-slate-700 flex justify-between items-center group">
                                                <div>
                                                    <p className="text-[10px] text-slate-500 uppercase font-bold">CBU / CVU</p>
                                                    <p className="text-sm text-white font-mono">{selectedAccount.cbu}</p>
                                                </div>
                                                <button onClick={() => navigator.clipboard.writeText(selectedAccount.cbu!)} className="p-2 text-slate-500 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-colors">
                                                    <Copy className="w-4 h-4" />
                                                </button>
                                            </div>
                                        )}
                                        {selectedAccount.alias && (
                                            <div className="p-3 rounded-xl bg-slate-900/50 border border-slate-700 flex justify-between items-center group">
                                                <div>
                                                    <p className="text-[10px] text-slate-500 uppercase font-bold">Alias</p>
                                                    <p className="text-sm text-white font-medium">{selectedAccount.alias}</p>
                                                </div>
                                                <button onClick={() => navigator.clipboard.writeText(selectedAccount.alias!)} className="p-2 text-slate-500 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-colors">
                                                    <Copy className="w-4 h-4" />
                                                </button>
                                            </div>
                                        )}
                                        {(selectedAccount.username || selectedAccount.password) && (
                                            <div className="p-3 rounded-xl bg-slate-900/50 border border-slate-700 space-y-2">
                                                <p className="text-[10px] text-slate-500 uppercase font-bold">Credenciales</p>
                                                {selectedAccount.username && (
                                                    <div className="flex justify-between items-center">
                                                        <p className="text-xs text-slate-400">Usuario: {selectedAccount.username}</p>
                                                        <button onClick={() => navigator.clipboard.writeText(selectedAccount.username!)} className="text-slate-500 hover:text-white"><Copy className="w-3 h-3" /></button>
                                                    </div>
                                                )}
                                                {selectedAccount.password && (
                                                    <div className="flex justify-between items-center">
                                                        <p className="text-xs text-slate-400">Clave: {selectedAccount.password}</p>
                                                        <button onClick={() => navigator.clipboard.writeText(selectedAccount.password!)} className="text-slate-500 hover:text-white"><Copy className="w-3 h-3" /></button>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            <div className="grid grid-cols-1 gap-3">
                                <button
                                    onClick={() => router.push(`/dashboard/operaciones?accountId=${selectedAccount.id}`)}
                                    className="flex items-center justify-center gap-2 py-3 rounded-xl bg-slate-700 text-slate-200 hover:bg-slate-600 font-medium transition-colors w-full"
                                >
                                    <History className="w-4 h-4" />
                                    Ver Historial
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
