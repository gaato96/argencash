'use client';

import { useState } from 'react';
import { formatARS, formatUSD, formatDateTime, safeJsonParse } from '@/lib/utils';
import { openCashSession, closeCashSession, getSessionClosureDetails } from '@/lib/actions/sessions';
import { createCommissionExpense } from '@/lib/actions/operations';
import {
    Clock,
    Lock,
    Unlock,
    History,
    AlertTriangle,
    CheckCircle,
    X,
    Wallet,
    ArrowRight,
    DollarSign,
    CreditCard
} from 'lucide-react';
import { SearchableAccountSelect } from '@/components/SearchableAccountSelect';

interface CashSession {
    id: string;
    status: string;
    openedAt: Date;
    closedAt: Date | null;
    openingBalances: string | null;
    expectedBalances: string | null;
    actualBalances: string | null;
    difference: string | null;
    withdrawalsSummary: string | null;
    commissionsSummary: string | null;
    summary?: any;
    openedBy: { name: string | null; email?: string };
    closedBy: { name: string | null } | null;
    operations?: Array<{
        id: string;
        type: string;
        mainAmount: number;
        mainCurrency: string;
        createdAt: Date;
        createdBy: { name: string | null };
    }>;
}

interface Account {
    id: string;
    name: string;
    currency: string;
    balance: number;
    type: 'CASH' | 'BANK' | 'VIRTUAL';
}

interface CajaClientProps {
    activeCashSession: CashSession | null;
    history: CashSession[];
    accounts: Account[];
}

interface CommissionPaymentRowProps {
    accountId: string;
    accountName: string;
    accounts: Account[];
    onPay: (amount: string, sourceAccountId: string) => Promise<void>;
}

function CommissionPaymentRow({ accountId, accountName, accounts, onPay }: CommissionPaymentRowProps) {
    const [amount, setAmount] = useState('');
    const [sourceAccountId, setSourceAccountId] = useState('');
    const [loading, setLoading] = useState(false);

    const handlePay = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!amount || !sourceAccountId) return;
        setLoading(true);
        await onPay(amount, sourceAccountId);
        setLoading(false);
    };

    return (
        <form onSubmit={handlePay} className="space-y-3">
            <div>
                <label className="text-xs text-slate-500 block mb-1">Cuenta de Origen (Pago)</label>
                <SearchableAccountSelect
                    accounts={accounts.filter((a: any) => a.currency === 'ARS')} // Commissions are usually in ARS
                    value={sourceAccountId}
                    onValueChange={setSourceAccountId}
                    placeholder="Seleccionar cuenta..."
                />
            </div>
            <div className="flex gap-2 items-end">
                <div className="flex-1">
                    <label className="text-xs text-slate-500 block mb-1">Monto (ARS)</label>
                    <div className="relative">
                        <DollarSign className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                        <input
                            type="number"
                            step="0.01"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            className="w-full bg-slate-800 border-slate-600 rounded-lg pl-9 py-2 text-white text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                            placeholder="0.00"
                            required
                        />
                    </div>
                </div>
                <button
                    type="submit"
                    disabled={loading || !sourceAccountId || !amount}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 text-white text-sm font-medium rounded-lg transition"
                >
                    {loading ? '...' : 'Registrar'}
                </button>
            </div>
        </form>
    );
}

export function CajaClient({ activeCashSession, history, accounts }: CajaClientProps) {
    const [showOpenModal, setShowOpenModal] = useState(false);
    const [showCloseModal, setShowCloseModal] = useState(false);
    const [showCommissionsModal, setShowCommissionsModal] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const [openingBalances, setOpeningBalances] = useState({ ARS: '', USD: '' });
    const [actualBalances, setActualBalances] = useState({ ARS: '', USD: '' });

    // For Closure Flow
    const [closureData, setClosureData] = useState<any[]>([]);
    // Track payments made in the UI to disable buttons
    const [paidCommissions, setPaidCommissions] = useState<Record<string, boolean>>({});

    const [selectedSummary, setSelectedSummary] = useState<CashSession | null>(null);

    const handleOpenSession = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            await openCashSession({
                openingBalances: {
                    ARS: parseFloat(openingBalances.ARS) || 0,
                    USD: parseFloat(openingBalances.USD) || 0,
                },
            });
            setShowOpenModal(false);
            setOpeningBalances({ ARS: '', USD: '' });
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error al abrir caja');
        } finally {
            setLoading(false);
        }
    };

    const initiateClosure = async () => {
        if (!activeCashSession) return;
        setLoading(true);
        setError('');
        try {
            // Fetch detailed closure data
            const details = await getSessionClosureDetails(activeCashSession.id);
            setClosureData(details);
            // Pre-fill actual balances with current system balances as a starting point
            const arsBalance = accounts.find((a: any) => a.type === 'CASH' && a.currency === 'ARS')?.balance || 0;
            const usdBalance = accounts.find((a: any) => a.type === 'CASH' && a.currency === 'USD')?.balance || 0;
            setActualBalances({
                ARS: arsBalance.toString(),
                USD: usdBalance.toString(),
            });

            setShowCommissionsModal(true);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error al iniciar cierre');
        } finally {
            setLoading(false);
        }
    };

    const handleCloseSession = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!activeCashSession) return;

        setError('');
        setLoading(true);

        try {
            await closeCashSession({
                sessionId: activeCashSession.id,
                actualBalances: {
                    ARS: parseFloat(actualBalances.ARS) || 0,
                    USD: parseFloat(actualBalances.USD) || 0,
                },
            });
            setShowCloseModal(false);
            setActualBalances({ ARS: '', USD: '' });
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error al cerrar caja');
        } finally {
            setLoading(false);
        }
    };

    const handleQuickCommissionPayment = async (accountId: string, amount: string, sourceAccountId: string) => {
        if (!amount || !sourceAccountId) return;
        setLoading(true);
        try {
            await createCommissionExpense({
                amount: parseFloat(amount),
                accountId: sourceAccountId, // The digital account paying the commission
                currency: 'ARS',
                description: `Comisión cierre caja (Cuenta ${accounts.find((a: any) => a.id === accountId)?.name})`,
            });
            setPaidCommissions(prev => ({ ...prev, [accountId]: true }));
        } catch (err) {
            alert(err instanceof Error ? err.message : 'Error registrando comisión');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white">Caja</h1>
                    <p className="text-slate-400">Gestión de sesiones de caja</p>
                </div>
            </div>

            {/* Active Session Card */}
            {activeCashSession ? (
                <div className="p-6 rounded-xl bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border border-emerald-500/20">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                            <Unlock className="w-6 h-6 text-emerald-400" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-white">Caja Abierta</h2>
                            <p className="text-sm text-slate-400">
                                Por {activeCashSession.openedBy.name} · {formatDateTime(activeCashSession.openedAt)}
                            </p>
                        </div>
                        <button
                            onClick={initiateClosure}
                            disabled={loading}
                            className="ml-auto px-4 py-2 rounded-lg bg-amber-500 text-white font-medium hover:bg-amber-600 transition-colors flex items-center gap-2 disabled:opacity-50"
                        >
                            <Lock className="w-4 h-4" />
                            {loading ? 'Cargando...' : 'Cerrar Caja'}
                        </button>
                    </div>

                    {/* Opening balances */}
                    <div className="grid grid-cols-2 gap-4 mb-4">
                        <div className="p-3 rounded-lg bg-slate-800/50">
                            <p className="text-xs text-slate-400">Apertura ARS</p>
                            <p className="text-lg font-bold text-white">
                                {formatARS(safeJsonParse(activeCashSession.openingBalances, { ARS: 0 }).ARS)}
                            </p>
                        </div>
                        <div className="p-3 rounded-lg bg-slate-800/50">
                            <p className="text-xs text-slate-400">Apertura USD</p>
                            <p className="text-lg font-bold text-white">
                                {formatUSD(safeJsonParse(activeCashSession.openingBalances, { USD: 0 }).USD)}
                            </p>
                        </div>
                    </div>

                    {/* Current balances (from accounts) */}
                    <div className="grid grid-cols-2 gap-4 mb-4">
                        <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                            <p className="text-xs text-emerald-400">Saldo actual ARS</p>
                            <p className="text-lg font-bold text-emerald-400">
                                {formatARS(accounts.find((a: any) => a.currency === 'ARS' && a.type === 'CASH')?.balance || 0)}
                            </p>
                        </div>
                        <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                            <p className="text-xs text-emerald-400">Saldo actual USD</p>
                            <p className="text-lg font-bold text-emerald-400">
                                {formatUSD(accounts.find((a: any) => a.currency === 'USD' && a.type === 'CASH')?.balance || 0)}
                            </p>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="p-6 rounded-xl bg-slate-800/50 border border-slate-700/50 text-center">
                    <Clock className="w-12 h-12 text-slate-500 mx-auto mb-4" />
                    <h2 className="text-lg font-semibold text-white mb-2">No hay caja abierta</h2>
                    <p className="text-slate-400 mb-4">Abrí una nueva sesión de caja para comenzar a operar</p>
                    <button
                        onClick={() => setShowOpenModal(true)}
                        className="px-6 py-3 rounded-lg bg-emerald-500 text-white font-medium hover:bg-emerald-600 transition-colors"
                    >
                        Abrir Caja
                    </button>
                </div>
            )}

            {/* History List */}
            <div className="rounded-xl bg-slate-800/50 border border-slate-700/50 overflow-hidden">
                <div className="p-4 border-b border-slate-700/50 flex items-center gap-2">
                    <History className="w-5 h-5 text-slate-400" />
                    <h2 className="font-semibold text-white">Historial de Cajas</h2>
                </div>
                {history.length === 0 ? (
                    <p className="p-4 text-slate-400 text-center">No hay historial de cajas</p>
                ) : (
                    <div className="divide-y divide-slate-700/50">
                        {history.map((session: any) => {
                            const diff = safeJsonParse(session.difference, { ARS: 0, USD: 0 });
                            const hasDiff = Math.abs(diff.ARS) > 0 || Math.abs(diff.USD) > 0;

                            return (
                                <div key={session.id} className="p-4">
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            {hasDiff ? (
                                                <AlertTriangle className="w-4 h-4 text-amber-400" />
                                            ) : (
                                                <CheckCircle className="w-4 h-4 text-emerald-400" />
                                            )}
                                            <span className="text-white font-medium">
                                                {formatDateTime(session.openedAt)}
                                            </span>
                                        </div>
                                        <button
                                            onClick={() => setSelectedSummary(session)}
                                            className="px-3 py-1.5 rounded-lg bg-slate-700 text-white text-xs hover:bg-slate-600 transition-colors"
                                        >
                                            Ver Resumen
                                        </button>
                                    </div>
                                    <div className="flex items-center justify-between mt-2 text-sm">
                                        <div className="text-slate-400">
                                            {session.closedBy?.name ? `Cerró: ${session.closedBy.name}` : 'En curso'}
                                        </div>
                                        {hasDiff && (
                                            <span className="text-amber-400">
                                                Dif: {formatARS(diff.ARS)} / {formatUSD(diff.USD)}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* FULL SCREEN COMMISSIONS MODAL */}
            {showCommissionsModal && (
                <div className="fixed inset-0 z-50 flex flex-col bg-slate-900 overflow-y-auto">
                    {/* Header */}
                    <div className="px-8 py-6 border-b border-slate-800 flex justify-between items-center sticky top-0 bg-slate-900/95 backdrop-blur z-10">
                        <div>
                            <h2 className="text-2xl font-bold text-white">Cierre de Caja - Paso 1: Conciliación</h2>
                            <p className="text-slate-400">Revisá las operaciones por cuenta y registrá las comisiones pendientes.</p>
                        </div>
                        <button
                            onClick={() => setShowCommissionsModal(false)}
                            className="p-2 bg-slate-800 rounded-full hover:bg-slate-700 text-slate-400 hover:text-white transition"
                        >
                            <X className="w-6 h-6" />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="flex-1 p-8">
                        <div className="grid grid-cols-1 gap-8 max-w-7xl mx-auto">
                            {closureData.length === 0 ? (
                                <div className="p-12 text-center border-2 border-dashed border-slate-700 rounded-2xl">
                                    <p className="text-slate-500 text-lg">No hubo operaciones digitales ni retiros que requieran conciliación hoy.</p>
                                </div>
                            ) : (
                                closureData.map((data: any) => (
                                    <div key={data.accountId} className="bg-slate-800 rounded-2xl p-6 border border-slate-700 shadow-xl">
                                        <div className="flex justify-between items-start mb-6 border-b border-slate-700 pb-4">
                                            <div>
                                                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                                    <CreditCard className="w-5 h-5 text-blue-400" />
                                                    {data.accountName}
                                                </h3>
                                                <p className="text-sm text-slate-400 mt-1">Resumen de movimientos asociados</p>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-sm text-slate-400">Total Operado</div>
                                                <div className="text-white font-mono">
                                                    {data.totalPurchasesARS > 0 && <span className="block text-emerald-400">+ {formatARS(data.totalPurchasesARS)} (Compras)</span>}
                                                    {data.totalWithdrawalsUSD > 0 && <span className="block text-amber-400">- {formatUSD(data.totalWithdrawalsUSD)} (Retiros)</span>}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                            {/* Details Left */}
                                            <div className="space-y-4">
                                                {data.purchases.length > 0 && (
                                                    <div>
                                                        <h4 className="text-sm font-bold text-emerald-400 uppercase tracking-wider mb-2">Compras Digitales</h4>
                                                        <ul className="space-y-2">
                                                            {data.purchases.map((op: any) => (
                                                                <li key={op.id} className="text-sm flex justify-between text-slate-300 border-l-2 border-slate-700 pl-3">
                                                                    <span>Op. {op.id.slice(-4)}</span>
                                                                    <span>{formatARS(op.secondaryAmount)}</span>
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                )}
                                                {data.withdrawals.length > 0 && (
                                                    <div>
                                                        <h4 className="text-sm font-bold text-amber-400 uppercase tracking-wider mb-2">Retiros USD</h4>
                                                        <ul className="space-y-2">
                                                            {data.withdrawals.map((op: any) => (
                                                                <li key={op.id} className="text-sm flex justify-between text-slate-300 border-l-2 border-slate-700 pl-3">
                                                                    <span>Op. {op.id.slice(-4)}</span>
                                                                    <span>{formatUSD(op.mainAmount)}</span>
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Action Right */}
                                            <div className="bg-slate-900/50 p-6 rounded-xl border border-slate-700/50 flex flex-col justify-center">
                                                <h4 className="text-sm font-medium text-white mb-4">Registrar Comisión / Gasto</h4>

                                                {paidCommissions[data.accountId] ? (
                                                    <div className="flex items-center gap-2 text-emerald-400 bg-emerald-500/10 p-4 rounded-lg">
                                                        <CheckCircle className="w-5 h-5" />
                                                        <span className="font-medium">Comisión registrada correctamente</span>
                                                    </div>
                                                ) : (
                                                    <CommissionPaymentRow
                                                        accountId={data.accountId}
                                                        accountName={data.accountName}
                                                        accounts={accounts}
                                                        onPay={(amount, source) => handleQuickCommissionPayment(data.accountId, amount, source)}
                                                    />
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="p-8 border-t border-slate-800 bg-slate-900/95 sticky bottom-0 backdrop-blur z-10 flex justify-end gap-4">
                        <button
                            onClick={() => setShowCommissionsModal(false)}
                            className="px-6 py-3 rounded-xl text-slate-300 font-medium hover:bg-slate-800 transition"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={() => {
                                setShowCommissionsModal(false);
                                setShowCloseModal(true);
                            }}
                            className="px-8 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-bold text-lg hover:shadow-lg hover:shadow-emerald-500/20 transition flex items-center gap-2"
                        >
                            Continuar al Conteo Físico
                            <ArrowRight className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            )}

            {/* Close Session Modal (Physical Count) */}
            {showCloseModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="w-full max-w-md bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl">
                        <div className="flex items-center justify-between p-4 border-b border-slate-700">
                            <h2 className="text-lg font-semibold text-white">Cerrar Caja - Paso 2</h2>
                            <button
                                onClick={() => setShowCloseModal(false)}
                                className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <form onSubmit={handleCloseSession} className="p-4 space-y-4">
                            {error && <div className="p-3 bg-red-500/20 text-red-400 rounded-lg text-sm">{error}</div>}
                            <p className="text-sm text-slate-400">Ingresá los valores finales reales de la caja física.</p>

                            <div className="space-y-4">
                                {/* PHYSICAL CASH BREAKDOWN */}
                                <div className="p-4 rounded-xl bg-slate-900 border border-slate-700">
                                    <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                                        <Wallet className="w-4 h-4 text-emerald-400" />
                                        Caja Física (Efectivo)
                                    </h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <div className="flex justify-between text-xs text-slate-400 mb-1">
                                                <span>ARS Esperado:</span>
                                                <span>{formatARS(accounts.find((a: any) => a.currency === 'ARS' && a.type === 'CASH')?.balance || 0)}</span>
                                            </div>
                                            <input
                                                type="number"
                                                step="0.01"
                                                value={actualBalances.ARS}
                                                onChange={(e) => setActualBalances({ ...actualBalances, ARS: e.target.value })}
                                                className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                                                placeholder="Monto Real"
                                            />
                                        </div>
                                        <div>
                                            <div className="flex justify-between text-xs text-slate-400 mb-1">
                                                <span>USD Esperado:</span>
                                                <span>{formatUSD(accounts.find((a: any) => a.currency === 'USD' && a.type === 'CASH')?.balance || 0)}</span>
                                            </div>
                                            <input
                                                type="number"
                                                step="0.01"
                                                value={actualBalances.USD}
                                                onChange={(e) => setActualBalances({ ...actualBalances, USD: e.target.value })}
                                                className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                                                placeholder="Monto Real"
                                            />
                                        </div>
                                    </div>
                                    {/* Physical Diff */}
                                    {(() => {
                                        const expectedARS = accounts.find((a: any) => a.currency === 'ARS' && a.type === 'CASH')?.balance || 0;
                                        const expectedUSD = accounts.find((a: any) => a.currency === 'USD' && a.type === 'CASH')?.balance || 0;
                                        const actualARS = parseFloat(actualBalances.ARS) || 0;
                                        const actualUSD = parseFloat(actualBalances.USD) || 0;
                                        const diffARS = actualARS - expectedARS;
                                        const diffUSD = actualUSD - expectedUSD;
                                        const hasDiff = Math.abs(diffARS) > 1 || Math.abs(diffUSD) > 1;

                                        if (hasDiff) {
                                            return (
                                                <div className="mt-3 p-2 rounded bg-amber-500/10 border border-amber-500/20 text-xs">
                                                    <p className="font-bold text-amber-400 mb-1">DIFERENCIA FÍSICA DETECTADA</p>
                                                    <div className="flex justify-between text-slate-300">
                                                        <span>ARS: {diffARS > 0 ? '+' : ''}{formatARS(diffARS)}</span>
                                                        <span>USD: {diffUSD > 0 ? '+' : ''}{formatUSD(diffUSD)}</span>
                                                    </div>
                                                </div>
                                            );
                                        }
                                        return null;
                                    })()}
                                </div>

                                {/* VIRTUAL ACCOUNTS SUMMARY (AUDIT ONLY) */}
                                <div className="p-4 rounded-xl bg-slate-900 border border-slate-700 opacity-80">
                                    <h3 className="text-sm font-bold text-slate-300 mb-3 flex items-center gap-2">
                                        <CreditCard className="w-4 h-4 text-blue-400" />
                                        Bancos y Virtuales (Sistema)
                                    </h3>
                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                        <div className="p-2 bg-slate-800 rounded border border-slate-700">
                                            <span className="text-slate-500 text-xs block">Total ARS Virtual</span>
                                            <span className="text-white font-mono">
                                                {formatARS(accounts.filter((a: any) => a.type !== 'CASH' && a.currency === 'ARS').reduce((sum: number, a: any) => sum + a.balance, 0))}
                                            </span>
                                        </div>
                                        <div className="p-2 bg-slate-800 rounded border border-slate-700">
                                            <span className="text-slate-500 text-xs block">Total USD Virtual</span>
                                            <span className="text-white font-mono">
                                                {formatUSD(accounts.filter((a: any) => a.type !== 'CASH' && a.currency === 'USD').reduce((sum: number, a: any) => sum + a.balance, 0))}
                                            </span>
                                        </div>
                                    </div>
                                    <p className="text-[10px] text-slate-500 mt-2 text-center">
                                        * Revisá tu home banking. Si estos montos no coinciden, auditá las operaciones digitales.
                                    </p>
                                </div>
                            </div>

                            <button type="submit" disabled={loading} className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg transition">
                                {loading ? 'Cerrando...' : 'Confirmar Cierre y Arqueo'}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Open Modal (Keep existing) */}
            {
                showOpenModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                        <div className="w-full max-w-md bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl">
                            <div className="flex items-center justify-between p-4 border-b border-slate-700">
                                <h2 className="text-lg font-semibold text-white">Abrir Caja</h2>
                                <button
                                    onClick={() => setShowOpenModal(false)}
                                    className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <form onSubmit={handleOpenSession} className="p-4 space-y-4">
                                {error && (
                                    <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                                        {error}
                                    </div>
                                )}

                                <p className="text-sm text-slate-400">
                                    Ingresá el conteo físico inicial de la caja
                                </p>

                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-1">
                                        Efectivo ARS
                                    </label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={openingBalances.ARS}
                                        onChange={(e) => setOpeningBalances({ ...openingBalances, ARS: e.target.value })}
                                        className="w-full px-4 py-3 rounded-lg bg-slate-900/50 border border-slate-600/50 text-white"
                                        placeholder="0"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-1">
                                        Efectivo USD
                                    </label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={openingBalances.USD}
                                        onChange={(e) => setOpeningBalances({ ...openingBalances, USD: e.target.value })}
                                        className="w-full px-4 py-3 rounded-lg bg-slate-900/50 border border-slate-600/50 text-white"
                                        placeholder="0"
                                        required
                                    />
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full py-3 rounded-lg bg-emerald-500 text-white font-semibold hover:bg-emerald-600 disabled:opacity-50"
                                >
                                    {loading ? 'Abriendo...' : 'Abrir Caja'}
                                </button>
                            </form>
                        </div>
                    </div>
                )
            }

            {/* SUMMARY MODAL */}
            {selectedSummary && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="w-full max-w-lg bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden">
                        <div className="px-6 py-4 border-b border-slate-700 flex justify-between items-center bg-slate-900/50">
                            <div>
                                <h2 className="text-xl font-bold text-white">Resumen de Caja</h2>
                                <p className="text-xs text-slate-400">
                                    Del {formatDateTime(selectedSummary.openedAt)} al {selectedSummary.closedAt ? formatDateTime(selectedSummary.closedAt) : '...'}
                                </p>
                            </div>
                            <button
                                onClick={() => setSelectedSummary(null)}
                                className="p-2 rounded-full hover:bg-slate-700 text-slate-400 hover:text-white transition"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
                            {/* Opening */}
                            <div>
                                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Saldos Iniciales</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-3 bg-slate-700/30 rounded-lg">
                                        <p className="text-xs text-slate-400">ARS</p>
                                        <p className="font-mono text-white">{formatARS(safeJsonParse(selectedSummary.openingBalances, { ARS: 0 }).ARS)}</p>
                                    </div>
                                    <div className="p-3 bg-slate-700/30 rounded-lg">
                                        <p className="text-xs text-slate-400">USD</p>
                                        <p className="font-mono text-white">{formatUSD(safeJsonParse(selectedSummary.openingBalances, { USD: 0 }).USD)}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Closing / Actual */}
                            <div>
                                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Cierre (Recuento Físico)</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-3 bg-slate-700/30 rounded-lg">
                                        <p className="text-xs text-slate-400">ARS</p>
                                        <p className="font-mono text-white">{formatARS(safeJsonParse(selectedSummary.actualBalances, { ARS: 0 }).ARS)}</p>
                                    </div>
                                    <div className="p-3 bg-slate-700/30 rounded-lg">
                                        <p className="text-xs text-slate-400">USD</p>
                                        <p className="font-mono text-white">{formatUSD(safeJsonParse(selectedSummary.actualBalances, { USD: 0 }).USD)}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Difference */}
                            {(() => {
                                const diff = safeJsonParse(selectedSummary.difference, { ARS: 0, USD: 0 });
                                const hasDiff = Math.abs(diff.ARS) > 0.01 || Math.abs(diff.USD) > 0.01;
                                if (!hasDiff) return null;
                                return (
                                    <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
                                        <h3 className="text-xs font-bold text-amber-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                                            <AlertTriangle className="w-4 h-4" /> Diferencia Registrada
                                        </h3>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-slate-300">Diferencia ARS:</span>
                                            <span className={diff.ARS >= 0 ? 'text-emerald-400' : 'text-red-400'}>{formatARS(diff.ARS)}</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-slate-300">Diferencia USD:</span>
                                            <span className={diff.USD >= 0 ? 'text-emerald-400' : 'text-red-400'}>{formatUSD(diff.USD)}</span>
                                        </div>
                                    </div>
                                );
                            })()}

                            <div className="pt-4 border-t border-slate-700 text-xs text-slate-500 flex justify-between">
                                <span>Abierto por: {selectedSummary.openedBy.name || 'Desconocido'}</span>
                                <span>{selectedSummary.closedBy ? `Cerrado por: ${selectedSummary.closedBy.name}` : 'En curso'}</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
