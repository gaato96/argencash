'use client';

import { useState } from 'react';
import { createSellOperation } from '@/lib/actions/operations';
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

interface SellFormProps {
    accounts: Account[];
    onSuccess: () => void;
}

type PaymentType = 'CASH' | 'TRANSFER' | 'HYBRID';

export function SellForm({ accounts, onSuccess }: SellFormProps) {
    const arsAccounts = accounts.filter((a: any) => a.currency === 'ARS' && a.ownership === 'PROPIO');
    const usdAccounts = accounts.filter((a: any) => a.currency === 'USD' && a.ownership === 'PROPIO');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [paymentType, setPaymentType] = useState<PaymentType>('CASH');

    const [formData, setFormData] = useState({
        usdAmount: '',
        exchangeRate: '',
        usdAccountId: usdAccounts.find((a: any) => a.type === 'CASH')?.id || '',
        cashAccountId: arsAccounts.find((a: any) => a.type === 'CASH')?.id || '',
        cashAmount: '',
        transferAccountId: '',
        transferAmount: '',
        notes: '',
    });

    const calculatedARS = formData.usdAmount && formData.exchangeRate
        ? parseFloat(formData.usdAmount) * parseFloat(formData.exchangeRate)
        : 0;

    const remainingForTransfer = paymentType === 'HYBRID' && formData.cashAmount
        ? calculatedARS - parseFloat(formData.cashAmount)
        : 0;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            await createSellOperation({
                usdAmount: parseFloat(formData.usdAmount),
                exchangeRate: parseFloat(formData.exchangeRate),
                usdAccountId: formData.usdAccountId,
                paymentType,
                cashAccountId: paymentType !== 'TRANSFER' ? formData.cashAccountId : undefined,
                cashAmount: paymentType === 'CASH' ? calculatedARS :
                    paymentType === 'HYBRID' ? parseFloat(formData.cashAmount) : undefined,
                transferAccountId: paymentType !== 'CASH' ? formData.transferAccountId : undefined,
                transferAmount: paymentType === 'TRANSFER' ? calculatedARS :
                    paymentType === 'HYBRID' ? remainingForTransfer : undefined,
                notes: formData.notes || undefined,
            });
            onSuccess();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error al registrar operación');
        } finally {
            setLoading(false);
        }
    };

    const bankAccounts = arsAccounts.filter((a: any) => a.type === 'BANK' || a.type === 'VIRTUAL');

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                    {error}
                </div>
            )}

            {/* USD Amount */}
            <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                    Monto USD a vender
                </label>
                <input
                    type="number"
                    step="0.01"
                    value={formData.usdAmount}
                    onChange={(e) => setFormData({ ...formData, usdAmount: e.target.value })}
                    className="w-full px-4 py-3 rounded-lg bg-slate-900/50 border border-slate-600/50 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                    placeholder="500"
                    required
                />
            </div>

            {/* Exchange Rate - MANUAL */}
            <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                    Cotización (ARS por USD)
                </label>
                <input
                    type="number"
                    step="0.01"
                    value={formData.exchangeRate}
                    onChange={(e) => setFormData({ ...formData, exchangeRate: e.target.value })}
                    className="w-full px-4 py-3 rounded-lg bg-slate-900/50 border border-slate-600/50 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                    placeholder="1220"
                    required
                />
                <p className="text-xs text-slate-500 mt-1">
                    Ingresá el precio acordado con el cliente
                </p>
            </div>

            {/* Calculated total */}
            {calculatedARS > 0 && (
                <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                    <p className="text-sm text-slate-400">Total a recibir:</p>
                    <p className="text-xl font-bold text-blue-400">{formatARS(calculatedARS)}</p>
                </div>
            )}

            {/* USD Source Account */}
            <SearchableAccountSelect
                label="Cuenta origen (USD)"
                accounts={usdAccounts}
                value={formData.usdAccountId}
                onValueChange={(val) => setFormData({ ...formData, usdAccountId: val })}
                placeholder="Seleccionar cuenta de origen..."
            />

            {/* Payment Type */}
            <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                    Forma de pago
                </label>
                <div className="flex rounded-lg bg-slate-700/50 p-1">
                    <button
                        type="button"
                        onClick={() => setPaymentType('CASH')}
                        className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${paymentType === 'CASH' ? 'bg-blue-500 text-white' : 'text-slate-400 hover:text-white'
                            }`}
                    >
                        Efectivo
                    </button>
                    <button
                        type="button"
                        onClick={() => setPaymentType('TRANSFER')}
                        className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${paymentType === 'TRANSFER' ? 'bg-blue-500 text-white' : 'text-slate-400 hover:text-white'
                            }`}
                    >
                        Transferencia
                    </button>
                    <button
                        type="button"
                        onClick={() => setPaymentType('HYBRID')}
                        className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${paymentType === 'HYBRID' ? 'bg-blue-500 text-white' : 'text-slate-400 hover:text-white'
                            }`}
                    >
                        Mixto
                    </button>
                </div>
            </div>

            {/* Cash fields */}
            {(paymentType === 'CASH' || paymentType === 'HYBRID') && (
                <SearchableAccountSelect
                    label="Cuenta efectivo (ARS)"
                    accounts={arsAccounts.filter((a: any) => a.type === 'CASH')}
                    value={formData.cashAccountId}
                    onValueChange={(val) => setFormData({ ...formData, cashAccountId: val })}
                    placeholder="Seleccionar cuenta de caja..."
                />
            )}

            {/* Hybrid: Cash amount */}
            {paymentType === 'HYBRID' && (
                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">
                        Monto en efectivo
                    </label>
                    <input
                        type="number"
                        step="0.01"
                        value={formData.cashAmount}
                        onChange={(e) => setFormData({ ...formData, cashAmount: e.target.value })}
                        className="w-full px-4 py-3 rounded-lg bg-slate-900/50 border border-slate-600/50 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                        placeholder="400000"
                        required
                    />
                    {remainingForTransfer > 0 && (
                        <p className="text-xs text-slate-400 mt-1">
                            Restante por transferencia: {formatARS(remainingForTransfer)}
                        </p>
                    )}
                </div>
            )}

            {/* Transfer fields */}
            {(paymentType === 'TRANSFER' || paymentType === 'HYBRID') && (
                <SearchableAccountSelect
                    label="Cuenta bancaria destino (ARS)"
                    accounts={bankAccounts}
                    value={formData.transferAccountId}
                    onValueChange={(val) => setFormData({ ...formData, transferAccountId: val })}
                    placeholder="Seleccionar cuenta destino..."
                />
            )}

            {/* Notes */}
            <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                    Notas (opcional)
                </label>
                <input
                    type="text"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full px-4 py-3 rounded-lg bg-slate-900/50 border border-slate-600/50 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                    placeholder="Ej: Venta a María"
                />
            </div>

            {/* Submit */}
            <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 rounded-lg bg-blue-500 text-white font-semibold hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {loading ? 'Registrando...' : 'Registrar Venta'}
            </button>
        </form>
    );
}
