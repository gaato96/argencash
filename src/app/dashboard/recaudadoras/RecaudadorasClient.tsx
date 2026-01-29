'use client';

import { useState } from 'react';
import { formatARS } from '@/lib/utils';
import { createRecaudadora, liquidateRecaudadora, recordRecaudadoraDeposit } from '@/lib/actions/recaudadoras';
import {
    PiggyBank,
    Plus,
    ArrowUpRight,
    ArrowDownLeft,
    X,
} from 'lucide-react';

interface Recaudadora {
    id: string;
    clientName: string;
    dailyAccumulated: number;
    commissionRate: number;
    movements: Array<{
        id: string;
        amount: number;
        description: string | null;
        createdAt: Date;
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

interface RecaudadorasClientProps {
    recaudadoras: Recaudadora[];
    accounts: Account[];
}

export function RecaudadorasClient({ recaudadoras, accounts }: RecaudadorasClientProps) {
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showLiquidateModal, setShowLiquidateModal] = useState(false);
    const [showDepositModal, setShowDepositModal] = useState(false);
    const [selectedRecaudadora, setSelectedRecaudadora] = useState<Recaudadora | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const [createForm, setCreateForm] = useState({
        clientName: '',
        commissionRate: '1',
    });

    const [liquidateForm, setLiquidateForm] = useState({
        amount: '',
        destinationAccountId: '',
    });

    const [depositForm, setDepositForm] = useState({
        rawInput: '',
        description: '',
        targetAccountId: '',
    });

    const [parsedDeposits, setParsedDeposits] = useState<Array<{ amount: number; confirmed: boolean }>>([]);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            await createRecaudadora({
                clientName: createForm.clientName,
                commissionRate: parseFloat(createForm.commissionRate) / 100,
            });
            setShowCreateModal(false);
            setCreateForm({ clientName: '', commissionRate: '1' });
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error');
        } finally {
            setLoading(false);
        }
    };

    const handleLiquidate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedRecaudadora) return;

        setError('');
        setLoading(true);

        try {
            await liquidateRecaudadora({
                recaudadoraId: selectedRecaudadora.id,
                destinationAccountId: liquidateForm.destinationAccountId,
            });
            setShowLiquidateModal(false);
            setLiquidateForm({ amount: '', destinationAccountId: '' });
            setSelectedRecaudadora(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error');
        } finally {
            setLoading(false);
        }
    };

    const handleParseDeposits = () => {
        const lines = depositForm.rawInput.split(/[\n+]+/).map(l => l.trim()).filter(l => l !== '');
        const newDeposits = lines.map(l => {
            const amount = parseFloat(l.replace(/,/g, ''));
            return isNaN(amount) ? null : { amount, confirmed: false };
        }).filter(d => d !== null) as Array<{ amount: number; confirmed: boolean }>;

        setParsedDeposits([...parsedDeposits, ...newDeposits]);
        setDepositForm({ ...depositForm, rawInput: '' });
    };

    const handleDeposit = async () => {
        if (!selectedRecaudadora) return;

        const depositsToSubmit = parsedDeposits.filter(d => d.confirmed);
        if (depositsToSubmit.length === 0) {
            setError('No hay depósitos confirmados para registrar');
            return;
        }

        setError('');
        setLoading(true);

        try {
            await recordRecaudadoraDeposit({
                recaudadoraId: selectedRecaudadora.id,
                deposits: depositsToSubmit.map(d => ({
                    amount: d.amount,
                    description: depositForm.description || undefined
                })),
                targetAccountId: depositForm.targetAccountId || undefined,
            });
            setShowDepositModal(false);
            setDepositForm({ rawInput: '', description: '', targetAccountId: '' });
            setParsedDeposits([]);
            setSelectedRecaudadora(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error');
        } finally {
            setLoading(false);
        }
    };

    const propioAccounts = accounts.filter(a => a.ownership === 'PROPIO');
    const totalAccumulated = recaudadoras.reduce((sum, r) => sum + r.dailyAccumulated, 0);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white">Recaudadoras</h1>
                    <p className="text-slate-400">Gestión de cobranza diaria</p>
                </div>
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500 text-white font-medium hover:bg-emerald-600 transition-colors"
                >
                    <Plus className="w-4 h-4" />
                    Nueva Recaudadora
                </button>
            </div>

            {/* Summary */}
            <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-sm text-slate-400">Total acumulado hoy</p>
                        <p className="text-2xl font-bold text-purple-400">{formatARS(totalAccumulated)}</p>
                    </div>
                    <PiggyBank className="w-10 h-10 text-purple-400" />
                </div>
            </div>

            {/* Recaudadoras list */}
            {recaudadoras.length === 0 ? (
                <div className="p-8 rounded-xl bg-slate-800/50 border border-slate-700/50 text-center">
                    <PiggyBank className="w-12 h-12 text-slate-500 mx-auto mb-4" />
                    <p className="text-slate-400">No hay recaudadoras configuradas</p>
                </div>
            ) : (
                <div className="grid gap-4">
                    {recaudadoras.map((rec) => (
                        <div
                            key={rec.id}
                            className="p-6 rounded-xl bg-slate-800/50 border border-slate-700/50 hover:border-slate-600/50 transition-colors"
                        >
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center">
                                        <PiggyBank className="w-6 h-6 text-purple-400" />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-white">{rec.clientName}</h3>
                                        <p className="text-xs text-slate-400">
                                            {(rec.commissionRate * 100).toFixed(1)}% comisión
                                        </p>
                                    </div>
                                </div>

                                <div className="text-right">
                                    <p className="text-2xl font-bold text-purple-400">{formatARS(rec.dailyAccumulated)}</p>
                                    <p className="text-xs text-slate-400 text-right">Acumulado</p>
                                </div>
                            </div>

                            <div className="flex gap-2">
                                <button
                                    onClick={() => {
                                        setSelectedRecaudadora(rec);
                                        setDepositForm({ rawInput: '', description: '', targetAccountId: '' });
                                        setParsedDeposits([]);
                                        setShowDepositModal(true);
                                    }}
                                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors"
                                >
                                    <ArrowDownLeft className="w-4 h-4" />
                                    Depósito (Masivo)
                                </button>
                                <button
                                    onClick={() => {
                                        setSelectedRecaudadora(rec);
                                        setLiquidateForm({ amount: rec.dailyAccumulated.toString(), destinationAccountId: '' });
                                        setShowLiquidateModal(true);
                                    }}
                                    disabled={rec.dailyAccumulated <= 0}
                                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <ArrowUpRight className="w-4 h-4" />
                                    Liquidar
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Create Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="w-full max-w-md bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl">
                        <div className="flex items-center justify-between p-4 border-b border-slate-700">
                            <h2 className="text-lg font-semibold text-white">Nueva Recaudadora</h2>
                            <button onClick={() => setShowCreateModal(false)} className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleCreate} className="p-4 space-y-4">
                            {error && <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}</div>}

                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">Nombre Cliente</label>
                                <input
                                    type="text"
                                    value={createForm.clientName}
                                    onChange={(e) => setCreateForm({ ...createForm, clientName: e.target.value })}
                                    className="w-full px-4 py-3 rounded-lg bg-slate-900 border border-slate-700 text-white"
                                    placeholder="Ej: Cliente Juan"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">Comisión (%)</label>
                                <input
                                    type="number"
                                    step="0.1"
                                    value={createForm.commissionRate}
                                    onChange={(e) => setCreateForm({ ...createForm, commissionRate: e.target.value })}
                                    className="w-full px-4 py-3 rounded-lg bg-slate-900 border border-slate-700 text-white"
                                    placeholder="1"
                                />
                            </div>

                            <button type="submit" disabled={loading} className="w-full py-4 rounded-xl bg-emerald-500 text-white font-bold hover:bg-emerald-600 disabled:opacity-50 shadow-lg shadow-emerald-900/20">
                                {loading ? 'Creando...' : 'Crear Recaudadora'}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Liquidate Modal */}
            {showLiquidateModal && selectedRecaudadora && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="w-full max-w-md bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl">
                        <div className="flex items-center justify-between p-4 border-b border-slate-700">
                            <div>
                                <h2 className="text-lg font-semibold text-white">Liquidar Recaudadora</h2>
                                <p className="text-sm text-slate-400">{selectedRecaudadora.clientName}</p>
                            </div>
                            <button onClick={() => { setShowLiquidateModal(false); setSelectedRecaudadora(null); }} className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleLiquidate} className="p-4 space-y-4">
                            {error && <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}</div>}

                            <div className="p-3 rounded-lg bg-slate-700/50">
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-400">Total Acumulado:</span>
                                    <span className="text-white font-medium">{formatARS(selectedRecaudadora.dailyAccumulated)}</span>
                                </div>
                                <div className="flex justify-between text-sm mt-1">
                                    <span className="text-slate-400">Comisión ({(selectedRecaudadora.commissionRate * 100).toFixed(1)}%):</span>
                                    <span className="text-emerald-400 font-medium">
                                        {formatARS(selectedRecaudadora.dailyAccumulated * selectedRecaudadora.commissionRate)}
                                    </span>
                                </div>
                                <div className="border-t border-slate-600/50 my-2 pt-2 flex justify-between font-bold">
                                    <span className="text-white">Neto a Liquidar:</span>
                                    <span className="text-emerald-400">
                                        {formatARS(selectedRecaudadora.dailyAccumulated * (1 - selectedRecaudadora.commissionRate))}
                                    </span>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">Pagar desde Cuenta (Propia)</label>
                                <select
                                    value={liquidateForm.destinationAccountId}
                                    onChange={(e) => setLiquidateForm({ ...liquidateForm, destinationAccountId: e.target.value })}
                                    className="w-full px-4 py-3 rounded-lg bg-slate-900 border border-slate-700 text-white"
                                    required
                                >
                                    <option value="">Seleccionar cuenta propia</option>
                                    {propioAccounts.filter(a => a.currency === 'ARS').map((account) => (
                                        <option key={account.id} value={account.id}>
                                            {account.name} ({formatARS(account.balance)})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <button type="submit" disabled={loading} className="w-full py-4 rounded-xl bg-amber-500 text-white font-bold hover:bg-amber-600 disabled:opacity-50">
                                {loading ? 'Procesando...' : 'Confirmar Pago Liquidación'}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Deposit Modal (Masivo) */}
            {showDepositModal && selectedRecaudadora && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="w-full max-w-xl bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden">
                        <div className="flex items-center justify-between p-4 border-b border-slate-700">
                            <div>
                                <h2 className="text-lg font-semibold text-white">Registrar Cobranzas Masivas</h2>
                                <p className="text-sm text-slate-400">{selectedRecaudadora.clientName}</p>
                            </div>
                            <button onClick={() => { setShowDepositModal(false); setSelectedRecaudadora(null); setParsedDeposits([]); }} className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-4 space-y-4 max-h-[70vh] overflow-y-auto">
                            {error && <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}</div>}

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-300 mb-2">Ingresar Montos</label>
                                        <textarea
                                            value={depositForm.rawInput}
                                            onChange={(e) => setDepositForm({ ...depositForm, rawInput: e.target.value })}
                                            className="w-full h-40 px-4 py-3 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono text-sm focus:ring-2 focus:ring-emerald-500/50 outline-none"
                                            placeholder={"1500\n2300+4500\n..."}
                                            required
                                        />
                                        <button
                                            type="button"
                                            onClick={handleParseDeposits}
                                            className="w-full mt-2 py-2 px-4 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold hover:bg-emerald-500/20 transition-all"
                                        >
                                            Procesar
                                        </button>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-slate-300 mb-1 text-xs uppercase tracking-wider">Caja Destino</label>
                                        <select
                                            value={depositForm.targetAccountId}
                                            onChange={(e) => setDepositForm({ ...depositForm, targetAccountId: e.target.value })}
                                            className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white text-sm"
                                        >
                                            <option value="">Solo registro virtual</option>
                                            {propioAccounts.filter(a => a.currency === 'ARS').map((account) => (
                                                <option key={account.id} value={account.id}>{account.name}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-slate-300 mb-1 text-xs uppercase tracking-wider">Descripción</label>
                                        <input
                                            type="text"
                                            value={depositForm.description}
                                            onChange={(e) => setDepositForm({ ...depositForm, description: e.target.value })}
                                            className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white text-sm"
                                            placeholder="Ej: Cobranzas Lunes"
                                        />
                                    </div>
                                </div>

                                <div className="flex flex-col min-h-[300px]">
                                    <label className="block text-sm font-medium text-slate-300 mb-1 text-xs uppercase tracking-wider border-b border-slate-700 pb-2">Impactados ({parsedDeposits.length})</label>
                                    <div className="flex-1 overflow-y-auto space-y-2 py-2">
                                        {parsedDeposits.length === 0 ? (
                                            <div className="flex flex-col items-center justify-center h-full text-slate-500 text-xs italic space-y-2">
                                                <ArrowDownLeft className="w-8 h-8 opacity-20" />
                                                <span>Esperando entradas...</span>
                                            </div>
                                        ) : (
                                            parsedDeposits.map((d, i) => (
                                                <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-slate-900/50 border border-slate-700/50 transition-all hover:bg-slate-900">
                                                    <span className="text-sm text-white font-medium">{formatARS(d.amount)}</span>
                                                    <div className="flex items-center gap-2">
                                                        <input
                                                            type="checkbox"
                                                            checked={d.confirmed}
                                                            onChange={(e) => {
                                                                const next = [...parsedDeposits];
                                                                next[i].confirmed = e.target.checked;
                                                                setParsedDeposits(next);
                                                            }}
                                                            className="w-4 h-4 rounded-md bg-slate-900 border-slate-700 text-emerald-500 focus:ring-emerald-500/20"
                                                        />
                                                        <button
                                                            onClick={() => setParsedDeposits(parsedDeposits.filter((_, idx) => idx !== i))}
                                                            className="p-1 rounded-md hover:bg-red-500/10 text-slate-600 hover:text-red-400"
                                                        >
                                                            <X className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>

                                    {parsedDeposits.length > 0 && (
                                        <div className="mt-4 pt-4 border-t border-slate-700">
                                            <div className="flex justify-between items-center mb-4 bg-emerald-500/5 p-3 rounded-xl border border-emerald-500/10">
                                                <span className="text-sm text-emerald-400 font-medium">Neto Confirmado:</span>
                                                <span className="text-xl font-bold text-emerald-400">
                                                    {formatARS(parsedDeposits.filter(d => d.confirmed).reduce((s, d) => s + d.amount, 0))}
                                                </span>
                                            </div>
                                            <button
                                                onClick={handleDeposit}
                                                disabled={loading || parsedDeposits.filter(d => d.confirmed).length === 0}
                                                className="w-full py-4 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-500 shadow-lg shadow-emerald-900/20 disabled:opacity-50 transition-all"
                                            >
                                                {loading ? 'Registrando...' : 'Confirmar Todo'}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

