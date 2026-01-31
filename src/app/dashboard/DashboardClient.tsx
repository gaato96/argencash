'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { formatARS, formatUSD } from '@/lib/utils';
import {
    addNotebookEntry,
    processNotebookEntry,
    deleteNotebookEntry,
    resolveAlert
} from '@/lib/actions/dashboard';
import {
    LayoutDashboard,
    ArrowUpRight,
    ArrowDownLeft,
    TrendingUp,
    AlertTriangle,
    Wallet,
    StickyNote,
    Check,
    X,
    Users,
    Unlock,
    Trash2
} from 'lucide-react';
import { openCashSession } from '@/lib/actions/sessions';
import { BuyForm } from '@/components/operations/BuyForm';
import { SellForm } from '@/components/operations/SellForm';
import { TransferForm } from '@/components/operations/TransferForm';
import { ExpenseForm } from '@/components/operations/ExpenseForm';
import { WithdrawUSDForm } from '@/components/operations/WithdrawUSDForm';

import { DolarWidget } from '@/components/DolarWidget';

interface DashboardData {
    balances: {
        propio: { ARS: number; USD: number };
        tercero: { ARS: number; USD: number };
        liquidity: {
            cash: { ARS: number; USD: number };
            virtual: { ARS: number; USD: number };
        };
    };
    todayProfit: number;
    ppp: number;
    currentAccountNet: { ARS: number; USD: number };
    alerts: any[];
    activeCashSession: any;
    operationsToday: number;
    notebookEntries: any[];
    accounts: any[];
    currentAccounts: any[];
}

export function DashboardClient({ initialData }: { initialData: DashboardData }) {
    const router = useRouter();
    const [noteContent, setNoteContent] = useState('');
    const [loadingNote, setLoadingNote] = useState(false);

    // Modal states
    const [showBuyModal, setShowBuyModal] = useState(false);
    const [showSellModal, setShowSellModal] = useState(false);
    const [showTransferModal, setShowTransferModal] = useState(false);
    const [showExpenseModal, setShowExpenseModal] = useState(false);
    const [showWithdrawUSDModal, setShowWithdrawUSDModal] = useState(false);

    // Notebook handlers
    const handleAddNote = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!noteContent.trim()) return;
        setLoadingNote(true);
        try {
            await addNotebookEntry(noteContent);
            setNoteContent('');
        } finally {
            setLoadingNote(false);
        }
    };

    const handleProcessNote = async (id: string) => {
        await processNotebookEntry(id);
    };

    const handleDeleteNote = async (id: string) => {
        await deleteNotebookEntry(id);
    };

    const handleResolveAlert = async (id: string) => {
        await resolveAlert(id);
    };

    const { balances, todayProfit, currentAccountNet, alerts, notebookEntries, activeCashSession, accounts } = initialData;

    const [openingBalances, setOpeningBalances] = useState({ ARS: 0, USD: 0 });
    const [opening, setOpening] = useState(false);

    const handleOpenSession = async (e: React.FormEvent) => {
        e.preventDefault();
        setOpening(true);
        try {
            await openCashSession({ openingBalances });
            router.refresh();
        } finally {
            setOpening(false);
        }
    };

    const { data: session } = useSession();

    // Parse enabled modules
    const enabledModules = session?.user?.enabledModules
        ? JSON.parse(session.user.enabledModules)
        : {
            dashboard: true,
            operaciones: true,
            cuentas: true,
            caja: true,
            cuentasCorrientes: true,
            recaudadoras: true,
            reportes: true
        };

    const showThirdPartyDetails = enabledModules.recaudadoras || enabledModules.cuentasCorrientes;
    const showCurrentAccountsCard = enabledModules.cuentasCorrientes;

    return (
        <div className="space-y-6">
            {/* Scratchpad Section */}
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 shadow-lg">
                <div className="flex items-center gap-2 mb-3 text-slate-400">
                    <StickyNote className="w-4 h-4" />
                    <span className="text-sm font-medium uppercase tracking-wider">Scratchpad (Notas Rápidas)</span>
                </div>

                {/* Input */}
                <form onSubmit={handleAddNote} className="flex gap-2 mb-4">
                    <input
                        type="text"
                        value={noteContent}
                        onChange={(e) => setNoteContent(e.target.value)}
                        placeholder="Escribe una nota rápida (ej: Venta 2k a Juan pendiente)..."
                        className="flex-1 bg-slate-900/50 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                    />
                    <button
                        type="submit"
                        disabled={loadingNote || !noteContent.trim()}
                        className="bg-slate-700 hover:bg-slate-600 text-white p-2 rounded-lg transition-colors disabled:opacity-50"
                    >
                        <ArrowUpRight className="w-5 h-5" />
                    </button>
                </form>

                {/* Notes List */}
                {notebookEntries.length > 0 && (
                    <div className="space-y-2 max-h-40 overflow-y-auto pr-1 custom-scrollbar">
                        {notebookEntries.map((note: any) => (
                            <div key={note.id} className="flex items-center justify-between bg-slate-700/30 p-2 rounded-lg group">
                                <span className="text-sm text-slate-300">{note.content}</span>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => handleProcessNote(note.id)} className="p-1 text-emerald-400 hover:bg-emerald-500/20 rounded">
                                        <Check className="w-3 h-3" />
                                    </button>
                                    <button onClick={() => handleDeleteNote(note.id)} className="p-1 text-slate-500 hover:bg-slate-600/50 rounded">
                                        <X className="w-3 h-3" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Price Ticker */}
            <DolarWidget />

            {/* Cash Session Status / Apertura */}
            {enabledModules.caja && (
                !activeCashSession ? (
                    <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-6 shadow-lg">
                        <div className="flex items-center gap-3 mb-4 text-emerald-400">
                            <Unlock className="w-6 h-6" />
                            <h2 className="text-xl font-bold">Apertura de Caja Requerida</h2>
                        </div>
                        <form onSubmit={handleOpenSession} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="space-y-1">
                                <label className="text-xs text-slate-400 uppercase">Monto Inicial ARS</label>
                                <input
                                    type="number"
                                    value={openingBalances.ARS}
                                    onChange={(e) => setOpeningBalances({ ...openingBalances, ARS: Number(e.target.value) })}
                                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white"
                                    placeholder="0.00"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs text-slate-400 uppercase">Monto Inicial USD</label>
                                <input
                                    type="number"
                                    value={openingBalances.USD}
                                    onChange={(e) => setOpeningBalances({ ...openingBalances, USD: Number(e.target.value) })}
                                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white"
                                    placeholder="0.00"
                                />
                            </div>
                            <div className="flex items-end">
                                <button
                                    type="submit"
                                    disabled={opening}
                                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 rounded-lg transition-colors flex items-center justify-center gap-2"
                                >
                                    {opening ? 'Abriendo...' : 'Abrir Caja Hoy'}
                                </button>
                            </div>
                        </form>
                        <p className="text-xs text-slate-500 mt-3">
                            * Esto sincronizará automáticamente los saldos de "Caja Pesos" y "Caja Dólares".
                        </p>
                    </div>
                ) : (
                    <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-3 flex items-center justify-between">
                        <div className="flex items-center gap-2 text-emerald-400">
                            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            <span className="text-sm font-medium">Caja Abierta por {activeCashSession.openedBy.name}</span>
                        </div>
                        <button onClick={() => router.push('/dashboard/caja')} className="text-xs text-slate-400 hover:text-white underline">
                            Ver Detalle de Caja
                        </button>
                    </div>
                )
            )}

            {/* Liquidity Section (Point 2) */}
            <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-6">
                <h2 className="text-sm font-medium text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-emerald-400" />
                    Liquidez Actual (Efectivo vs Virtual)
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-700/50">
                        <p className="text-xs text-slate-500 uppercase font-bold mb-2">💰 Efectivo (Caja Física)</p>
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-slate-400">ARS:</span>
                            <span className="text-white font-mono">{formatARS(balances.liquidity.cash.ARS || 0)}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-slate-400">USD:</span>
                            <span className="text-white font-mono">{formatUSD(balances.liquidity.cash.USD || 0)}</span>
                        </div>
                    </div>
                    <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-700/50">
                        <p className="text-xs text-slate-500 uppercase font-bold mb-2">🌐 Virtual (Bancos / Billeteras)</p>
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-slate-400">ARS:</span>
                            <span className="text-white font-mono">{formatARS(balances.liquidity.virtual.ARS || 0)}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-slate-400">USD:</span>
                            <span className="text-white font-mono">{formatUSD(balances.liquidity.virtual.USD || 0)}</span>
                        </div>
                    </div>
                </div>
                <div className="mt-4 pt-4 border-t border-slate-700/50 flex justify-between items-center">
                    <span className="text-xs text-slate-500 italic">Suma total de todas las cuentas activas.</span>
                    <div className="flex gap-4">
                        <div className="text-right">
                            <p className="text-[10px] text-slate-500 uppercase font-bold">Total ARS</p>
                            <p className="text-emerald-400 font-bold">{formatARS((balances.liquidity.cash.ARS || 0) + (balances.liquidity.virtual.ARS || 0))}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-[10px] text-slate-500 uppercase font-bold">Total USD</p>
                            <p className="text-emerald-400 font-bold">{formatUSD((balances.liquidity.cash.USD || 0) + (balances.liquidity.virtual.USD || 0))}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Balances Grid */}
            <div className={`grid grid-cols-1 ${showThirdPartyDetails ? 'lg:grid-cols-2' : ''} gap-6`}>
                {/* Patrimonio (Net Equity) */}
                <div className="p-6 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700">
                    <div className="flex justify-between items-start mb-4">
                        <h2 className="text-sm font-medium text-slate-400 uppercase tracking-wider flex items-center gap-2">
                            <Wallet className="w-4 h-4" />
                            Patrimonio Neto Estimado
                        </h2>
                        <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/20">ACTIVO - PASIVO</span>
                    </div>
                    <div className="space-y-4">
                        <div className="flex justify-between items-baseline border-b border-slate-700/50 pb-2">
                            <span className="text-2xl font-bold text-white">ARS</span>
                            <span className="text-2xl font-mono text-emerald-400">
                                {formatARS((balances.propio.ARS || 0) - (balances.tercero.ARS || 0))}
                            </span>
                        </div>
                        <div className="flex justify-between items-baseline border-b border-slate-700/50 pb-2">
                            <span className="text-2xl font-bold text-white">USD</span>
                            <span className="text-2xl font-mono text-emerald-400">
                                {formatUSD((balances.propio.USD || 0) - (balances.tercero.USD || 0))}
                            </span>
                        </div>
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-2 text-[10px] text-slate-500 border-t border-slate-700/30 pt-4">
                        <div>
                            <p className="uppercase font-bold">Total Activos</p>
                            <p className="text-xs text-slate-400 font-mono">{formatARS(balances.propio.ARS || 0)} ARS</p>
                        </div>
                        <div className="text-right">
                            <p className="uppercase font-bold">Total Pasivos</p>
                            <p className="text-xs text-red-400/70 font-mono">{formatARS(balances.tercero.ARS || 0)} ARS</p>
                        </div>
                    </div>
                </div>

                {/* Deuda con Terceros (Breakdown) */}
                {showThirdPartyDetails && (
                    <div className="p-6 rounded-2xl bg-slate-800/80 border border-slate-700">
                        <div className="flex justify-between items-start mb-4">
                            <h2 className="text-sm font-medium text-slate-400 uppercase tracking-wider flex items-center gap-2">
                                <Users className="w-4 h-4" />
                                Detalle de Terceros
                            </h2>
                            <span className="text-[10px] bg-red-500/10 text-red-400 px-2 py-0.5 rounded-full border border-red-500/20">PASIVO</span>
                        </div>
                        <div className="space-y-4">
                            <div className="flex justify-between items-baseline border-b border-slate-700/50 pb-2">
                                <span className="text-xl font-bold text-slate-300">ARS</span>
                                <span className="text-xl font-mono text-red-400/80">{formatARS(balances.tercero.ARS || 0)}</span>
                            </div>
                            <div className="flex justify-between items-baseline border-b border-slate-700/50 pb-2">
                                <span className="text-xl font-bold text-slate-300">USD</span>
                                <span className="text-xl font-mono text-red-400/80">{formatUSD(balances.tercero.USD || 0)}</span>
                            </div>
                        </div>
                        <p className="text-[10px] text-slate-500 mt-2 italic text-center">Incluye Deuda en CC y Saldo Pendiente de Recaudadoras.</p>
                    </div>
                )}
            </div>

            {/* Quick Metrics & Actions */}
            <div className={`grid grid-cols-1 ${showCurrentAccountsCard ? 'md:grid-cols-3' : 'md:grid-cols-2'} gap-6`}>
                {/* Profit Card */}
                <div className="p-5 rounded-xl bg-slate-800 border border-slate-700 flex flex-col justify-between">
                    <div>
                        <p className="text-sm text-slate-400 mb-1">Ganancia Real (Hoy)</p>
                        <p className={`text-3xl font-bold ${todayProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                            {formatARS(todayProfit)}
                        </p>
                    </div>
                    <div className="mt-4 pt-4 border-t border-slate-700 flex justify-between items-center">
                        <span className="text-xs text-slate-500">Incluye cotización & gastos</span>
                        <TrendingUp className="w-4 h-4 text-emerald-500" />
                    </div>
                </div>

                {/* Current Accounts Card */}
                {showCurrentAccountsCard && (
                    <div
                        onClick={() => router.push('/dashboard/cuentas-corrientes')}
                        className="p-5 rounded-xl bg-slate-800 border border-slate-700 flex flex-col justify-between cursor-pointer hover:border-slate-600 transition-colors"
                    >
                        <div>
                            <p className="text-sm text-slate-400 mb-2">Cuentas Corrientes (Neto)</p>
                            <div className="space-y-1">
                                <p className={`text-2xl font-bold ${currentAccountNet.ARS >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                    {formatARS(currentAccountNet.ARS)}
                                </p>
                                {Math.abs(currentAccountNet.USD) > 0 && (
                                    <p className={`text-lg font-bold ${currentAccountNet.USD >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                        {formatUSD(currentAccountNet.USD)}
                                    </p>
                                )}
                            </div>
                        </div>
                        <div className="mt-4 pt-4 border-t border-slate-700 flex justify-between items-center">
                            <span className="text-xs text-slate-500">
                                {currentAccountNet.ARS >= 0 && currentAccountNet.USD >= 0 ? 'A favor global' : 'Saldo mixto/Contra'}
                            </span>
                            <ArrowUpRight className="w-4 h-4 text-emerald-500" />
                        </div>
                    </div>
                )}

                {/* Quick Actions */}
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-2 order-first md:order-last">
                    <button
                        onClick={() => setShowBuyModal(true)}
                        className="flex flex-col items-center justify-center p-2 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20 transition-colors"
                    >
                        <ArrowDownLeft className="w-5 h-5 mb-1" />
                        <span className="text-xs font-semibold">Compra</span>
                    </button>
                    <button
                        onClick={() => setShowSellModal(true)}
                        className="flex flex-col items-center justify-center p-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 transition-colors"
                    >
                        <ArrowUpRight className="w-5 h-5 mb-1" />
                        <span className="text-xs font-semibold">Venta</span>
                    </button>
                    <button
                        onClick={() => setShowTransferModal(true)}
                        className="flex flex-col items-center justify-center p-2 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 border border-blue-500/20 transition-colors"
                    >
                        <ArrowUpRight className="w-5 h-5 mb-1" />
                        <span className="text-xs font-semibold">Transf.</span>
                    </button>
                    <button
                        onClick={() => setShowExpenseModal(true)}
                        className="flex flex-col items-center justify-center p-2 rounded-lg bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 border border-amber-500/20 transition-colors"
                    >
                        <ArrowDownLeft className="w-5 h-5 mb-1" />
                        <span className="text-xs font-semibold">Gasto</span>
                    </button>
                    <button
                        onClick={() => setShowWithdrawUSDModal(true)}
                        className="flex flex-col items-center justify-center p-2 rounded-lg bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 border border-purple-500/20 transition-colors col-span-2 lg:col-span-1"
                    >
                        <ArrowDownLeft className="w-5 h-5 mb-1" />
                        <span className="text-xs font-semibold">Retiro USD</span>
                    </button>
                </div>
            </div>

            {/* Alerts Section */}
            {alerts.length > 0 && (
                <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-4">
                    <h3 className="text-red-400 font-semibold mb-3 flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5" />
                        Alertas Activas
                    </h3>
                    <div className="space-y-2">
                        {alerts.map((alert: any) => (
                            <div key={alert.id} className="flex items-center justify-between p-3 rounded-lg bg-red-500/10 border border-red-500/10">
                                <span className="text-sm text-red-200">{alert.message}</span>
                                <button
                                    onClick={() => handleResolveAlert(alert.id)}
                                    className="text-xs px-2 py-1 rounded bg-red-500/20 text-red-300 hover:bg-red-500/30 transition-colors"
                                >
                                    Resolver
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Modals */}
            {showBuyModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm shadow-2xl overflow-y-auto">
                    <div className="w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-2xl p-6 relative">
                        <button onClick={() => setShowBuyModal(false)} className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white">
                            <X className="w-6 h-6" />
                        </button>
                        <h2 className="text-xl font-bold text-white mb-6">Nueva Compra</h2>
                        <BuyForm
                            accounts={accounts}
                            currentAccounts={initialData.currentAccounts}
                            onSuccess={() => {
                                setShowBuyModal(false);
                                router.refresh();
                            }}
                        />
                    </div>
                </div>
            )}

            {showSellModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm shadow-2xl overflow-y-auto">
                    <div className="w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-2xl p-6 relative">
                        <button onClick={() => setShowSellModal(false)} className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white">
                            <X className="w-6 h-6" />
                        </button>
                        <h2 className="text-xl font-bold text-white mb-6">Nueva Venta</h2>
                        <SellForm accounts={accounts} onSuccess={() => {
                            setShowSellModal(false);
                            router.refresh();
                        }} />
                    </div>
                </div>
            )}

            {showTransferModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm shadow-2xl overflow-y-auto">
                    <div className="w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-2xl p-6 relative">
                        <button onClick={() => setShowTransferModal(false)} className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white">
                            <X className="w-6 h-6" />
                        </button>
                        <h2 className="text-xl font-bold text-white mb-6">Nueva Transferencia</h2>
                        <TransferForm accounts={accounts} onSuccess={() => {
                            setShowTransferModal(false);
                            router.refresh();
                        }} />
                    </div>
                </div>
            )}

            {showExpenseModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm shadow-2xl overflow-y-auto">
                    <div className="w-full max-w-xl bg-slate-900 border border-slate-700 rounded-2xl p-6 relative">
                        <button onClick={() => setShowExpenseModal(false)} className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white">
                            <X className="w-6 h-6" />
                        </button>
                        <h2 className="text-xl font-bold text-white mb-6">Nuevo Gasto</h2>
                        <ExpenseForm accounts={accounts} onSuccess={() => {
                            setShowExpenseModal(false);
                            router.refresh();
                        }} />
                    </div>
                </div>
            )}

            {showWithdrawUSDModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm shadow-2xl overflow-y-auto">
                    <div className="w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-2xl p-6 relative">
                        <button onClick={() => setShowWithdrawUSDModal(false)} className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white">
                            <X className="w-6 h-6" />
                        </button>
                        <h2 className="text-xl font-bold text-white mb-6">Retirar USD (Digital → Caja)</h2>
                        <WithdrawUSDForm
                            accounts={accounts}
                            currentAccounts={initialData.currentAccounts}
                            onSuccess={() => {
                                setShowWithdrawUSDModal(false);
                                router.refresh();
                            }}
                        />
                    </div>
                </div>
            )}
            {/* Testing / Admin Section - REMOVED */}
        </div>
    );
}
