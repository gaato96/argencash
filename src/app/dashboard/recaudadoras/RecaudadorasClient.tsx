'use client';

import { useState } from 'react';
import { formatARS } from '@/lib/utils';
import { createRecaudadora, liquidateRecaudadora, recordRecaudadoraDeposit, getPendingDeposits, verifyRecaudadoraDeposit } from '@/lib/actions/recaudadoras';
import { SearchableAccountSelect } from '@/components/SearchableAccountSelect';
import {
    PiggyBank,
    Plus,
    ArrowUpRight,
    ArrowDownLeft,
    X,
    AlertTriangle,
    CheckCircle2,
    Clock,
    Trash2,
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
        paymentDate: Date | null;
        isVerified: boolean;
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
    pendingCounts: Record<string, number>;
}

interface PaymentLine {
    accountId: string;
    amount: string;
}

interface PendingMovement {
    id: string;
    amount: number;
    description: string | null;
    paymentDate: Date | null;
    createdAt: Date;
}

export function RecaudadorasClient({ recaudadoras, accounts, pendingCounts }: RecaudadorasClientProps) {
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showLiquidateModal, setShowLiquidateModal] = useState(false);
    const [showDepositModal, setShowDepositModal] = useState(false);
    const [showPendingModal, setShowPendingModal] = useState(false);
    const [selectedRecaudadora, setSelectedRecaudadora] = useState<Recaudadora | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const [createForm, setCreateForm] = useState({
        clientName: '',
    });

    // Multi-payment liquidation
    const [liquidateForm, setLiquidateForm] = useState({
        commissionRate: '1',
    });
    const [paymentLines, setPaymentLines] = useState<PaymentLine[]>([{ accountId: '', amount: '' }]);

    const [depositForm, setDepositForm] = useState({
        rawInput: '',
        description: '',
        targetAccountId: '',
    });

    const [parsedDeposits, setParsedDeposits] = useState<Array<{ amount: number; confirmed: boolean; paymentDate: string }>>([]);

    // Pending deposits
    const [pendingMovements, setPendingMovements] = useState<PendingMovement[]>([]);
    const [pendingLoading, setPendingLoading] = useState(false);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            await createRecaudadora({
                clientName: createForm.clientName,
            });
            setShowCreateModal(false);
            setCreateForm({ clientName: '' });
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error');
        } finally {
            setLoading(false);
        }
    };

    const handleLiquidate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedRecaudadora) return;

        // Validate all payments have accountId and amount
        const payments = paymentLines.map(p => ({
            accountId: p.accountId,
            amount: parseFloat(p.amount) || 0,
        })).filter(p => p.accountId && p.amount > 0);

        if (payments.length === 0) {
            setError('Debes agregar al menos una forma de pago');
            return;
        }

        const netAmount = selectedRecaudadora.dailyAccumulated * (1 - (parseFloat(liquidateForm.commissionRate) || 0) / 100);
        const paymentsTotal = payments.reduce((s, p) => s + p.amount, 0);

        if (Math.abs(paymentsTotal - netAmount) > 0.01) {
            setError(`La suma de pagos ($${paymentsTotal.toFixed(2)}) no coincide con el neto ($${netAmount.toFixed(2)}). Diferencia: $${(netAmount - paymentsTotal).toFixed(2)}`);
            return;
        }

        setError('');
        setLoading(true);

        try {
            await liquidateRecaudadora({
                recaudadoraId: selectedRecaudadora.id,
                payments,
                commissionRate: parseFloat(liquidateForm.commissionRate) / 100,
            });
            setShowLiquidateModal(false);
            setLiquidateForm({ commissionRate: '1' });
            setPaymentLines([{ accountId: '', amount: '' }]);
            setSelectedRecaudadora(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error');
        } finally {
            setLoading(false);
        }
    };

    const handleParseDeposits = () => {
        const lines = depositForm.rawInput.split(/[\n+]+/).map((l: string) => l.trim()).filter((l: string) => l !== '');
        const now = new Date();
        const localNow = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);

        const newDeposits = lines.map((l: string) => {
            const amount = parseFloat(l.replace(/,/g, ''));
            return isNaN(amount) ? null : { amount, confirmed: false, paymentDate: localNow };
        }).filter((d): d is { amount: number; confirmed: boolean; paymentDate: string } => d !== null);

        setParsedDeposits([...parsedDeposits, ...newDeposits]);
        setDepositForm({ ...depositForm, rawInput: '' });
    };

    const handleDeposit = async () => {
        if (!selectedRecaudadora) return;
        if (parsedDeposits.length === 0) {
            setError('No hay depósitos para registrar');
            return;
        }

        setError('');
        setLoading(true);

        try {
            await recordRecaudadoraDeposit({
                recaudadoraId: selectedRecaudadora.id,
                deposits: parsedDeposits.map(d => ({
                    amount: d.amount,
                    description: depositForm.description || undefined,
                    paymentDate: d.paymentDate || undefined,
                    confirmed: d.confirmed,
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

    const openPendingModal = async (rec: Recaudadora) => {
        setSelectedRecaudadora(rec);
        setShowPendingModal(true);
        setPendingLoading(true);
        try {
            const movements = await getPendingDeposits(rec.id);
            setPendingMovements(movements);
        } catch (err) {
            console.error(err);
        } finally {
            setPendingLoading(false);
        }
    };

    const handleVerifyDeposit = async (movementId: string) => {
        setPendingLoading(true);
        try {
            await verifyRecaudadoraDeposit(movementId);
            // Refresh pending list
            if (selectedRecaudadora) {
                const movements = await getPendingDeposits(selectedRecaudadora.id);
                setPendingMovements(movements);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setPendingLoading(false);
        }
    };

    const addPaymentLine = () => {
        setPaymentLines([...paymentLines, { accountId: '', amount: '' }]);
    };

    const removePaymentLine = (index: number) => {
        if (paymentLines.length <= 1) return;
        setPaymentLines(paymentLines.filter((_, i) => i !== index));
    };

    const updatePaymentLine = (index: number, field: keyof PaymentLine, value: string) => {
        const updated = [...paymentLines];
        updated[index] = { ...updated[index], [field]: value };
        setPaymentLines(updated);
    };

    const propioAccounts = accounts.filter((a: Account) => a.ownership === 'PROPIO');
    const arsAccounts = propioAccounts.filter((a: Account) => a.currency === 'ARS');
    const totalAccumulated = recaudadoras.reduce((sum: number, r: Recaudadora) => sum + r.dailyAccumulated, 0);

    // For liquidation calculations
    const getNetAmount = () => {
        if (!selectedRecaudadora) return 0;
        return selectedRecaudadora.dailyAccumulated * (1 - (parseFloat(liquidateForm.commissionRate) || 0) / 100);
    };

    const getPaymentsTotal = () => {
        return paymentLines.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
    };

    const getRemainingAmount = () => {
        return getNetAmount() - getPaymentsTotal();
    };

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
            <div className="p-4 sm:p-5 rounded-xl bg-purple-500/10 border border-purple-500/20">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-xs sm:text-sm text-slate-400">Total acumulado hoy</p>
                        <p className="text-xl sm:text-2xl font-bold text-purple-400 tabular-nums">{formatARS(totalAccumulated)}</p>
                    </div>
                    <PiggyBank className="w-8 h-8 sm:w-10 sm:h-10 text-purple-400 opacity-50 sm:opacity-100" />
                </div>
            </div>

            {/* Recaudadoras list */}
            {recaudadoras.length === 0 ? (
                <div className="p-8 rounded-xl bg-slate-800/50 border border-slate-700/50 text-center">
                    <PiggyBank className="w-10 h-10 sm:w-12 sm:h-12 text-slate-500 mx-auto mb-4" />
                    <p className="text-sm sm:text-base text-slate-400">No hay recaudadoras configuradas</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-4">
                    {recaudadoras.map((rec: Recaudadora) => {
                        const pendingCount = pendingCounts[rec.id] || 0;
                        return (
                            <div
                                key={rec.id}
                                className="p-4 sm:p-6 rounded-xl bg-slate-800/50 border border-slate-700/50 hover:border-slate-600/50 transition-colors"
                            >
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-purple-500/20 flex items-center justify-center shrink-0">
                                            <PiggyBank className="w-5 h-5 sm:w-6 sm:h-6 text-purple-400" />
                                        </div>
                                        <div className="min-w-0">
                                            <h3 className="font-semibold text-white text-sm sm:text-base truncate">{rec.clientName}</h3>
                                            <p className="text-[10px] sm:text-xs text-slate-400">
                                                {(rec.commissionRate * 100).toFixed(1)}% comisión
                                            </p>
                                        </div>
                                    </div>

                                    <div className="text-right shrink-0">
                                        <p className="text-lg sm:text-2xl font-bold text-purple-400 tabular-nums">{formatARS(rec.dailyAccumulated)}</p>
                                        <p className="text-[10px] text-slate-400">Hoy</p>
                                    </div>
                                </div>

                                {/* Pending alert badge */}
                                {pendingCount > 0 && (
                                    <button
                                        onClick={() => openPendingModal(rec)}
                                        className="w-full mb-3 flex items-center gap-2 p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 hover:bg-amber-500/20 transition-all text-xs font-medium"
                                    >
                                        <AlertTriangle className="w-4 h-4 shrink-0" />
                                        <span>{pendingCount} depósito{pendingCount > 1 ? 's' : ''} pendiente{pendingCount > 1 ? 's' : ''} de verificar</span>
                                    </button>
                                )}

                                <div className="flex flex-col sm:flex-row gap-2">
                                    <button
                                        onClick={() => {
                                            setSelectedRecaudadora(rec);
                                            setDepositForm({ rawInput: '', description: '', targetAccountId: '' });
                                            setParsedDeposits([]);
                                            setShowDepositModal(true);
                                        }}
                                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-xs sm:text-sm rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-all active:scale-[0.98]"
                                    >
                                        <ArrowDownLeft className="w-4 h-4" />
                                        Cargar Depósitos
                                    </button>
                                    <button
                                        onClick={() => {
                                            setSelectedRecaudadora(rec);
                                            setLiquidateForm({
                                                commissionRate: (rec.commissionRate * 100).toFixed(1),
                                            });
                                            setPaymentLines([{ accountId: '', amount: '' }]);
                                            setShowLiquidateModal(true);
                                        }}
                                        disabled={rec.dailyAccumulated <= 0}
                                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-xs sm:text-sm rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/20 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <ArrowUpRight className="w-4 h-4" />
                                        Liquidar
                                    </button>
                                </div>
                            </div>
                        );
                    })}
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

                            <button type="submit" disabled={loading} className="w-full py-4 rounded-xl bg-emerald-500 text-white font-bold hover:bg-emerald-600 disabled:opacity-50 shadow-lg shadow-emerald-900/20">
                                {loading ? 'Creando...' : 'Crear Recaudadora'}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Liquidate Modal - Multi-payment */}
            {showLiquidateModal && selectedRecaudadora && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="w-full max-w-lg bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
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
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">Comisión (%) para esta liquidación</label>
                                <input
                                    type="number"
                                    step="0.1"
                                    min="0"
                                    max="100"
                                    value={liquidateForm.commissionRate}
                                    onChange={(e) => setLiquidateForm({ ...liquidateForm, commissionRate: e.target.value })}
                                    className="w-full px-4 py-3 rounded-lg bg-slate-900 border border-slate-700 text-white"
                                    placeholder="1"
                                    required
                                />
                            </div>

                            <div className="p-3 rounded-lg bg-slate-700/50">
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-400">Comisión ({liquidateForm.commissionRate}%):</span>
                                    <span className="text-emerald-400 font-medium">
                                        {formatARS(selectedRecaudadora.dailyAccumulated * (parseFloat(liquidateForm.commissionRate) || 0) / 100)}
                                    </span>
                                </div>
                                <div className="border-t border-slate-600/50 my-2 pt-2 flex justify-between font-bold">
                                    <span className="text-white">Neto a Liquidar:</span>
                                    <span className="text-emerald-400">
                                        {formatARS(getNetAmount())}
                                    </span>
                                </div>
                            </div>

                            {/* Payment Lines */}
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <label className="block text-sm font-medium text-slate-300">Formas de Pago</label>
                                    <button
                                        type="button"
                                        onClick={addPaymentLine}
                                        className="flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300 transition-colors"
                                    >
                                        <Plus className="w-3 h-3" />
                                        Agregar
                                    </button>
                                </div>

                                {paymentLines.map((line, index) => (
                                    <div key={index} className="flex items-start gap-2 p-3 rounded-lg bg-slate-900/50 border border-slate-700/50">
                                        <div className="flex-1 space-y-2">
                                            <SearchableAccountSelect
                                                accounts={arsAccounts}
                                                value={line.accountId}
                                                onValueChange={(val) => updatePaymentLine(index, 'accountId', val)}
                                                placeholder="Seleccionar cuenta..."
                                            />
                                            <input
                                                type="number"
                                                step="0.01"
                                                min="0"
                                                value={line.amount}
                                                onChange={(e) => updatePaymentLine(index, 'amount', e.target.value)}
                                                className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white text-sm"
                                                placeholder="Monto"
                                            />
                                        </div>
                                        {paymentLines.length > 1 && (
                                            <button
                                                type="button"
                                                onClick={() => removePaymentLine(index)}
                                                className="mt-1 p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
                                ))}

                                {/* Remaining indicator */}
                                <div className={`p-2 rounded-lg text-xs font-medium text-center ${
                                    Math.abs(getRemainingAmount()) < 0.01
                                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                        : getRemainingAmount() > 0
                                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                            : 'bg-red-500/10 text-red-400 border border-red-500/20'
                                }`}>
                                    {Math.abs(getRemainingAmount()) < 0.01
                                        ? '✓ Monto completo asignado'
                                        : getRemainingAmount() > 0
                                            ? `Falta asignar: ${formatARS(getRemainingAmount())}`
                                            : `Excedente: ${formatARS(Math.abs(getRemainingAmount()))}`
                                    }
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading || Math.abs(getRemainingAmount()) > 0.01}
                                className="w-full py-4 rounded-xl bg-amber-500 text-white font-bold hover:bg-amber-600 disabled:opacity-50 transition-all"
                            >
                                {loading ? 'Procesando...' : 'Confirmar Pago Liquidación'}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Deposit Modal (Masivo) with DateTime */}
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
                                        <SearchableAccountSelect
                                            accounts={arsAccounts}
                                            value={depositForm.targetAccountId}
                                            onValueChange={(val) => setDepositForm({ ...depositForm, targetAccountId: val })}
                                            placeholder="Solo registro virtual"
                                        />
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

                                    {/* Legend */}
                                    <div className="p-3 rounded-lg bg-slate-900/50 border border-slate-700/50 space-y-1.5">
                                        <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Instrucciones</p>
                                        <p className="text-xs text-slate-400">✅ <b className="text-emerald-400">Con check</b>: se suma al acumulado inmediatamente.</p>
                                        <p className="text-xs text-slate-400">⏳ <b className="text-amber-400">Sin check</b>: queda pendiente de verificar (genera alerta).</p>
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
                                                <div key={i} className={`p-2 rounded-lg border transition-all hover:bg-slate-900 ${d.confirmed ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-slate-900/50 border-slate-700/50'}`}>
                                                    <div className="flex items-center justify-between mb-1.5">
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
                                                                onClick={() => setParsedDeposits(parsedDeposits.filter((_: any, idx: number) => idx !== i))}
                                                                className="p-1 rounded-md hover:bg-red-500/10 text-slate-600 hover:text-red-400"
                                                            >
                                                                <X className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                    <input
                                                        type="datetime-local"
                                                        value={d.paymentDate}
                                                        onChange={(e) => {
                                                            const next = [...parsedDeposits];
                                                            next[i].paymentDate = e.target.value;
                                                            setParsedDeposits(next);
                                                        }}
                                                        className="w-full px-2 py-1 rounded-md bg-slate-900 border border-slate-700 text-slate-300 text-xs"
                                                    />
                                                </div>
                                            ))
                                        )}
                                    </div>

                                    {parsedDeposits.length > 0 && (
                                        <div className="mt-4 pt-4 border-t border-slate-700 space-y-2">
                                            <div className="flex justify-between items-center bg-emerald-500/5 p-3 rounded-xl border border-emerald-500/10">
                                                <span className="text-sm text-emerald-400 font-medium">Confirmados:</span>
                                                <span className="text-lg font-bold text-emerald-400">
                                                    {formatARS(parsedDeposits.filter(d => d.confirmed).reduce((s, d) => s + d.amount, 0))}
                                                </span>
                                            </div>
                                            {parsedDeposits.filter(d => !d.confirmed).length > 0 && (
                                                <div className="flex justify-between items-center bg-amber-500/5 p-3 rounded-xl border border-amber-500/10">
                                                    <span className="text-sm text-amber-400 font-medium">Pendientes:</span>
                                                    <span className="text-lg font-bold text-amber-400">
                                                        {formatARS(parsedDeposits.filter(d => !d.confirmed).reduce((s, d) => s + d.amount, 0))}
                                                    </span>
                                                </div>
                                            )}
                                            <button
                                                onClick={handleDeposit}
                                                disabled={loading}
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

            {/* Pending Deposits Modal */}
            {showPendingModal && selectedRecaudadora && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="w-full max-w-lg bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl max-h-[80vh] flex flex-col">
                        <div className="flex items-center justify-between p-4 border-b border-slate-700">
                            <div>
                                <h2 className="text-lg font-semibold text-white">Depósitos Pendientes</h2>
                                <p className="text-sm text-slate-400">{selectedRecaudadora.clientName}</p>
                            </div>
                            <button onClick={() => { setShowPendingModal(false); setSelectedRecaudadora(null); }} className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 space-y-3">
                            {pendingLoading ? (
                                <div className="text-center py-8 text-slate-400">Cargando...</div>
                            ) : pendingMovements.length === 0 ? (
                                <div className="text-center py-8">
                                    <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3 opacity-50" />
                                    <p className="text-slate-400">No hay depósitos pendientes</p>
                                </div>
                            ) : (
                                pendingMovements.map(mov => {
                                    const paymentDate = mov.paymentDate ? new Date(mov.paymentDate) : null;
                                    const createdDate = new Date(mov.createdAt);
                                    return (
                                        <div key={mov.id} className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/20">
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-lg font-bold text-white">{formatARS(mov.amount)}</p>
                                                    {mov.description && (
                                                        <p className="text-xs text-slate-400 mt-0.5">{mov.description}</p>
                                                    )}
                                                    <div className="mt-2 space-y-1">
                                                        {paymentDate && (
                                                            <p className="text-xs text-amber-400 flex items-center gap-1">
                                                                <Clock className="w-3 h-3" />
                                                                Fecha comprobante: {paymentDate.toLocaleDateString('es-AR')} {paymentDate.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                                                            </p>
                                                        )}
                                                        <p className="text-[10px] text-slate-500">
                                                            Cargado: {createdDate.toLocaleDateString('es-AR')} {createdDate.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                                                        </p>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => handleVerifyDeposit(mov.id)}
                                                    disabled={pendingLoading}
                                                    className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-500 text-white text-xs font-bold hover:bg-emerald-600 disabled:opacity-50 transition-all"
                                                >
                                                    <CheckCircle2 className="w-4 h-4" />
                                                    Verificar
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
