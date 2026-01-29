'use client';

import { useState, useEffect } from 'react';
import { formatARS, formatUSD, formatDateTime } from '@/lib/utils';
import { BuyForm } from '@/components/operations/BuyForm';
import { SellForm } from '@/components/operations/SellForm';
import { TransferForm } from '@/components/operations/TransferForm';
import { WithdrawUSDForm } from '@/components/operations/WithdrawUSDForm';
import { ExpenseForm } from '@/components/operations/ExpenseForm';
import { cancelOperation } from '@/lib/actions/operations';
import { useRouter } from 'next/navigation';
import {
    Plus,
    X,
    ArrowDownLeft,
    ArrowUpRight,
    ArrowLeftRight,
    Receipt,
    Filter,
    MoreVertical,
    Trash2,
    Eye,
} from 'lucide-react';

interface Operation {
    id: string;
    type: string;
    status: string;
    mainAmount: number;
    mainCurrency: string;
    secondaryAmount: number | null;
    exchangeRate: number | null;
    cashAmount: number | null;
    transferAmount: number | null;
    notes: string | null;
    createdAt: Date;
    createdBy: { name: string | null; email: string };
    movements: Array<{
        id: string;
        amount: number;
        currency: string;
        account: { id: string; name: string; currency: string };
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

interface OperationsClientProps {
    operations: Operation[];
    accounts: Account[];
    currentAccounts: any[];
    initialAction?: string;
}

type ActionType = 'compra' | 'venta' | 'transferencia' | 'gasto' | 'retiro' | null;

const operationTypeLabels: Record<string, { label: string; icon: typeof ArrowDownLeft; color: string }> = {
    COMPRA_USD: { label: 'Compra USD', icon: ArrowDownLeft, color: 'text-emerald-400' },
    COMPRA_USD_DIGITAL: { label: 'Compra USD Digital', icon: ArrowDownLeft, color: 'text-emerald-400' },
    VENTA_USD: { label: 'Venta USD', icon: ArrowUpRight, color: 'text-blue-400' },
    VENTA_HIBRIDA: { label: 'Venta Híbrida', icon: ArrowUpRight, color: 'text-blue-400' },
    TRANSFERENCIA: { label: 'Transferencia', icon: ArrowLeftRight, color: 'text-purple-400' },
    GASTO: { label: 'Gasto', icon: Receipt, color: 'text-red-400' },
    RETIRO: { label: 'Retiro', icon: ArrowUpRight, color: 'text-amber-400' },
    INGRESO_COMISION: { label: 'Comisión', icon: ArrowDownLeft, color: 'text-green-400' },
};

export function OperationsClient({ operations, accounts, currentAccounts, initialAction }: OperationsClientProps) {
    const router = useRouter();
    const [activeAction, setActiveAction] = useState<ActionType>(null);
    const [filter, setFilter] = useState<string>('all');
    const [selectedAccountFilter, setSelectedAccountFilter] = useState<string | null>(null);
    const [selectedOperation, setSelectedOperation] = useState<Operation | null>(null);
    const [isCancelling, setIsCancelling] = useState(false);
    const [showCancelConfirm, setShowCancelConfirm] = useState<string | null>(null);
    const [initialFromAccountId, setInitialFromAccountId] = useState<string | null>(null);

    // Initial account filter from URL if present
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const accountId = params.get('accountId');
        if (accountId) {
            setSelectedAccountFilter(accountId);
        }

        const fromAcc = params.get('fromAccountId');
        if (fromAcc) {
            setInitialFromAccountId(fromAcc);
        }
    }, []);

    useEffect(() => {
        if (initialAction) {
            setActiveAction(initialAction as ActionType);
        }
    }, [initialAction]);

    // Listen for close-modal event
    useEffect(() => {
        const handleClose = () => setActiveAction(null);
        window.addEventListener('close-modal', handleClose);
        return () => window.removeEventListener('close-modal', handleClose);
    }, []);

    const filteredOperations = operations.filter((op) => {
        const typeMatch = filter === 'all' || op.type === filter;
        const accountMatch = !selectedAccountFilter || op.movements.some(m => m.account.id === selectedAccountFilter);
        return typeMatch && accountMatch;
    });

    const arsAccounts = accounts.filter((a) => a.currency === 'ARS');
    const usdAccounts = accounts.filter((a) => a.currency === 'USD');

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white">Operaciones</h1>
                    <p className="text-slate-400">
                        {new Date().toLocaleDateString('es-AR', {
                            weekday: 'long',
                            day: 'numeric',
                            month: 'long',
                        })}
                    </p>
                </div>

                {/* Action buttons */}
                <div className="flex flex-wrap gap-2">
                    <button
                        onClick={() => setActiveAction('compra')}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors"
                    >
                        <Plus className="w-4 h-4" />
                        Compra
                    </button>
                    <button
                        onClick={() => setActiveAction('venta')}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20 hover:bg-blue-500/20 transition-colors"
                    >
                        <Plus className="w-4 h-4" />
                        Venta
                    </button>
                    <button
                        onClick={() => setActiveAction('transferencia')}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20 hover:bg-purple-500/20 transition-colors"
                    >
                        <ArrowLeftRight className="w-4 h-4" />
                        Transfer
                    </button>
                    <button
                        onClick={() => setActiveAction('gasto')}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-colors"
                    >
                        <Receipt className="w-4 h-4" />
                        Gasto
                    </button>
                    <button
                        onClick={() => setActiveAction('retiro')}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/20 transition-colors"
                    >
                        <ArrowUpRight className="w-4 h-4" />
                        Retiro USD
                    </button>
                </div>
            </div>

            {/* Filter */}
            <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4 text-slate-400" />
                    <select
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                        className="px-3 py-2 rounded-lg bg-slate-800/50 border border-slate-700/50 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                    >
                        <option value="all">Tipos</option>
                        <option value="COMPRA_USD">Compras</option>
                        <option value="VENTA_USD">Ventas</option>
                        <option value="TRANSFERENCIA">Transferencias</option>
                        <option value="GASTO">Gastos</option>
                        <option value="RETIRO">Retiros</option>
                    </select>
                </div>

                {selectedAccountFilter && (
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                        <span className="text-xs text-emerald-400 font-medium whitespace-nowrap">
                            Cuenta: {accounts.find(a => a.id === selectedAccountFilter)?.name}
                        </span>
                        <button onClick={() => setSelectedAccountFilter(null)} className="p-0.5 text-emerald-400 hover:text-white transition-colors">
                            <X className="w-3 h-3" />
                        </button>
                    </div>
                )}

                <span className="text-sm text-slate-400">
                    {filteredOperations.length} operaciones
                </span>
            </div>

            {/* Operations list */}
            <div className="space-y-3">
                {filteredOperations.length === 0 ? (
                    <div className="p-8 rounded-xl bg-slate-800/50 border border-slate-700/50 text-center">
                        <p className="text-slate-400">No hay operaciones hoy</p>
                    </div>
                ) : (
                    filteredOperations.map((op) => {
                        const typeInfo = operationTypeLabels[op.type] || {
                            label: op.type,
                            icon: ArrowLeftRight,
                            color: 'text-slate-400',
                        };
                        const Icon = typeInfo.icon;

                        return (
                            <div
                                key={op.id}
                                className={`p-4 rounded-xl bg-slate-800/50 border transition-all ${op.status === 'CANCELLED'
                                    ? 'border-red-500/30 opacity-60'
                                    : 'border-slate-700/50 hover:border-slate-600/50'
                                    }`}
                            >
                                <div className="flex items-start gap-4">
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${op.type.includes('COMPRA') ? 'bg-emerald-500/20' :
                                        op.type.includes('VENTA') ? 'bg-blue-500/20' :
                                            op.type === 'GASTO' ? 'bg-red-500/20' :
                                                'bg-purple-500/20'
                                        }`}>
                                        <Icon className={`w-5 h-5 ${typeInfo.color}`} />
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className={`font-medium ${typeInfo.color}`}>
                                                {typeInfo.label}
                                            </span>
                                            {op.status === 'CANCELLED' && (
                                                <span className="px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 text-xs">
                                                    Cancelada
                                                </span>
                                            )}
                                        </div>

                                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-sm">
                                            <span className="text-white font-medium">
                                                {op.mainCurrency === 'USD' ? formatUSD(op.mainAmount) : formatARS(op.mainAmount)}
                                            </span>
                                            {op.exchangeRate && (
                                                <span className="text-slate-400">
                                                    @ {formatARS(op.exchangeRate)}
                                                </span>
                                            )}
                                            {op.secondaryAmount && (
                                                <span className="text-slate-400">
                                                    = {formatARS(op.secondaryAmount)}
                                                </span>
                                            )}
                                            {op.cashAmount && op.transferAmount && (
                                                <span className="text-xs text-slate-500">
                                                    (Ef: {formatARS(op.cashAmount)} + Tr: {formatARS(op.transferAmount)})
                                                </span>
                                            )}
                                        </div>

                                        {op.notes && (
                                            <p className="text-sm text-slate-500 mt-1 truncate">{op.notes}</p>
                                        )}

                                        <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
                                            <span>{formatDateTime(op.createdAt)}</span>
                                            <span>•</span>
                                            <span>{op.createdBy.name || op.createdBy.email}</span>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => setSelectedOperation(op)}
                                            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700/50 transition-colors"
                                            title="Ver detalles"
                                        >
                                            <Eye className="w-4 h-4" />
                                        </button>
                                        {op.status !== 'CANCELLED' && (
                                            <button
                                                onClick={() => setShowCancelConfirm(op.id)}
                                                className="p-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                                                title="Cancelar operación"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* Modal for forms */}
            {activeAction && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="w-full max-w-lg bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl animate-fade-in overflow-hidden">
                        <div className="flex items-center justify-between p-4 border-b border-slate-700">
                            <h2 className="text-lg font-semibold text-white">
                                {activeAction === 'compra' && 'Nueva Compra USD'}
                                {activeAction === 'venta' && 'Nueva Venta USD'}
                                {activeAction === 'transferencia' && 'Nueva Transferencia'}
                                {activeAction === 'gasto' && 'Registrar Gasto'}
                                {activeAction === 'retiro' && 'Retiro USD (Efectivo)'}
                            </h2>
                            <button
                                onClick={() => setActiveAction(null)}
                                className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-4 max-h-[70vh] overflow-y-auto">
                            {activeAction === 'compra' && (
                                <BuyForm
                                    accounts={accounts}
                                    currentAccounts={currentAccounts}
                                    onSuccess={() => { setActiveAction(null); router.refresh(); }}
                                />
                            )}
                            {activeAction === 'venta' && (
                                <SellForm
                                    accounts={accounts}
                                    onSuccess={() => { setActiveAction(null); router.refresh(); }}
                                />
                            )}
                            {activeAction === 'transferencia' && (
                                <TransferForm
                                    accounts={accounts}
                                    onSuccess={() => { setActiveAction(null); router.refresh(); }}
                                />
                            )}
                            {activeAction === 'gasto' && (
                                <ExpenseForm
                                    accounts={accounts}
                                    onSuccess={() => { setActiveAction(null); router.refresh(); }}
                                />
                            )}
                            {activeAction === 'retiro' && (
                                <WithdrawUSDForm
                                    accounts={accounts}
                                    currentAccounts={currentAccounts}
                                    onSuccess={() => { setActiveAction(null); router.refresh(); }}
                                    initialAccountId={initialFromAccountId || undefined}
                                />
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Detail View Modal */}
            {selectedOperation && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
                    <div className="w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden">
                        <div className="flex items-center justify-between p-6 border-b border-slate-700">
                            <div>
                                <h2 className="text-xl font-bold text-white">Detalle de Operación</h2>
                                <p className="text-sm text-slate-500">{selectedOperation.id}</p>
                            </div>
                            <button onClick={() => setSelectedOperation(null)} className="p-2 text-slate-400 hover:text-white">
                                <X className="w-6 h-6" />
                            </button>
                        </div>
                        <div className="p-6 space-y-6">
                            <div className="grid grid-cols-2 gap-6">
                                <div>
                                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Tipo</p>
                                    <p className="text-white font-medium">{operationTypeLabels[selectedOperation.type]?.label || selectedOperation.type}</p>
                                </div>
                                <div>
                                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Estado</p>
                                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${selectedOperation.status === 'CANCELLED' ? 'bg-red-500/20 text-red-400' : 'bg-emerald-500/20 text-emerald-400'
                                        }`}>
                                        {selectedOperation.status === 'CANCELLED' ? 'Cancelada' : 'Completada'}
                                    </span>
                                </div>
                                <div>
                                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Monto Principal</p>
                                    <p className="text-lg font-bold text-white">
                                        {selectedOperation.mainCurrency === 'USD' ? formatUSD(selectedOperation.mainAmount) : formatARS(selectedOperation.mainAmount)}
                                    </p>
                                </div>
                                {selectedOperation.exchangeRate && (
                                    <div>
                                        <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Cotización</p>
                                        <p className="text-lg font-semibold text-slate-300">{formatARS(selectedOperation.exchangeRate)}</p>
                                    </div>
                                )}
                            </div>

                            <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700">
                                <h3 className="text-sm font-semibold text-slate-300 mb-3">Movimientos de Cuenta</h3>
                                <div className="space-y-3">
                                    {selectedOperation.movements.map((m) => (
                                        <div key={m.id} className="flex justify-between items-center py-2 border-b border-slate-700/50 last:border-0">
                                            <div>
                                                <p className="text-sm font-medium text-white">{m.account.name}</p>
                                                <p className="text-xs text-slate-500">{m.account.currency}</p>
                                            </div>
                                            <p className={`text-sm font-bold ${m.amount >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                                {m.currency === 'USD' ? formatUSD(m.amount) : formatARS(m.amount)}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {selectedOperation.notes && (
                                <div>
                                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Notas</p>
                                    <p className="text-slate-300 text-sm whitespace-pre-wrap">{selectedOperation.notes}</p>
                                </div>
                            )}

                            <div className="flex items-center justify-between text-xs text-slate-500 pt-4 border-t border-slate-700">
                                <div>
                                    <p>Creado por: <span className="text-slate-300">{selectedOperation.createdBy.name || selectedOperation.createdBy.email}</span></p>
                                    <p>Fecha: <span className="text-slate-300">{formatDateTime(selectedOperation.createdAt)}</span></p>
                                </div>
                                {selectedOperation.status !== 'CANCELLED' && (
                                    <button
                                        onClick={() => {
                                            setSelectedOperation(null);
                                            setShowCancelConfirm(selectedOperation.id);
                                        }}
                                        className="px-4 py-2 rounded-lg bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500/20 transition-colors font-semibold"
                                    >
                                        Cancelar Operación
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Cancellation Confirmation Modal */}
            {showCancelConfirm && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
                    <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl p-6 shadow-2xl">
                        <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center mb-4">
                            <Trash2 className="w-6 h-6 text-red-500" />
                        </div>
                        <h2 className="text-xl font-bold text-white mb-2">¿Confirmas la cancelación?</h2>
                        <p className="text-slate-400 mb-6">Esta acción no se puede deshacer. Se generarán movimientos de reversión para anular el impacto en los saldos.</p>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowCancelConfirm(null)}
                                className="flex-1 py-3 px-4 rounded-xl bg-slate-800 text-slate-300 font-semibold hover:bg-slate-700 transition-colors"
                            >
                                No, volver
                            </button>
                            <button
                                onClick={async () => {
                                    setIsCancelling(true);
                                    try {
                                        await cancelOperation(showCancelConfirm);
                                        setShowCancelConfirm(null);
                                        router.refresh();
                                    } catch (err) {
                                        alert(err instanceof Error ? err.message : 'Error al cancelar');
                                    } finally {
                                        setIsCancelling(false);
                                    }
                                }}
                                disabled={isCancelling}
                                className="flex-1 py-3 px-4 rounded-xl bg-red-500 text-white font-semibold hover:bg-red-600 transition-colors disabled:opacity-50"
                            >
                                {isCancelling ? 'Cancelando...' : 'Sí, cancelar'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
