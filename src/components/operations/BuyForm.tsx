'use client';

import { useState } from 'react';
import { createBuyOperation } from '@/lib/actions/operations';
import { formatARS } from '@/lib/utils';
import { SearchableAccountSelect } from '@/components/SearchableAccountSelect';
import { Plus, Trash2 } from 'lucide-react';

interface Account {
    id: string;
    name: string;
    currency: string;
    type: string;
    ownership: string;
    balance: number;
    isPurchasing?: boolean;
}

interface BuyFormProps {
    accounts: Account[];
    currentAccounts: any[];
    onSuccess: () => void;
}

export function BuyForm({ accounts, currentAccounts, onSuccess }: BuyFormProps) {
    const arsAccounts = accounts.filter((a: any) => a.currency === 'ARS' && a.ownership === 'PROPIO');
    const usdAccounts = accounts.filter((a: any) => a.currency === 'USD' && a.ownership === 'PROPIO');

    // Filter digital origins to only accounts marked as "isPurchasing"
    const digitalArsAccounts = arsAccounts.filter((a: any) => a.isPurchasing === true || a.type === 'CASH');

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [isDigital, setIsDigital] = useState(false);

    const [formData, setFormData] = useState({
        usdAmount: '',
        exchangeRate: '',
        usdAccountId: usdAccounts.find((a: any) => a.type === 'VIRTUAL')?.id || usdAccounts[0]?.id || '',
        notes: '',
    });

    const [paymentLines, setPaymentLines] = useState([{ accountId: '', amount: '' }]);

    const calculatedARS = formData.usdAmount && formData.exchangeRate
        ? parseFloat(formData.usdAmount) * parseFloat(formData.exchangeRate)
        : 0;

    const currentTotal = paymentLines.reduce((acc, line) => acc + (parseFloat(line.amount) || 0), 0);
    const difference = calculatedARS - currentTotal;
    const isTotalValid = calculatedARS > 0 && Math.abs(difference) < 1;

    const addPaymentLine = () => {
        setPaymentLines([...paymentLines, { accountId: '', amount: difference > 0 ? difference.toString() : '' }]);
    };

    const removePaymentLine = (index: number) => {
        if (paymentLines.length > 1) {
            setPaymentLines(paymentLines.filter((_, i) => i !== index));
        }
    };

    const updatePaymentLine = (index: number, field: 'accountId' | 'amount', value: string) => {
        const newLines = [...paymentLines];
        newLines[index][field] = value;
        setPaymentLines(newLines);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!isTotalValid) {
            setError(`La suma de los pagos debe ser exactamente igual a ${formatARS(calculatedARS)}`);
            return;
        }

        if (paymentLines.some(p => !p.accountId || !p.amount || parseFloat(p.amount) <= 0)) {
            setError('Todas las líneas de pago deben tener una cuenta seleccionada y un monto mayor a 0');
            return;
        }

        setLoading(true);

        try {
            await createBuyOperation({
                usdAmount: parseFloat(formData.usdAmount),
                exchangeRate: parseFloat(formData.exchangeRate),
                usdAccountId: formData.usdAccountId,
                payments: paymentLines.map(p => ({
                    accountId: p.accountId,
                    amount: parseFloat(p.amount)
                })),
                isDigital,
                notes: formData.notes || undefined,
            });
            onSuccess();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error al registrar operación');
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                    {error}
                </div>
            )}

            {/* Type toggle */}
            <div className="flex rounded-lg bg-slate-700/50 p-1">
                <button
                    type="button"
                    onClick={() => setIsDigital(false)}
                    className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${!isDigital ? 'bg-emerald-500 text-white' : 'text-slate-400 hover:text-white'
                        }`}
                >
                    Efectivo
                </button>
                <button
                    type="button"
                    onClick={() => setIsDigital(true)}
                    className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${isDigital ? 'bg-emerald-500 text-white' : 'text-slate-400 hover:text-white'
                        }`}
                >
                    Digital
                </button>
            </div>

            {/* USD Amount */}
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">
                        Monto USD
                    </label>
                    <input
                        type="number"
                        step="0.01"
                        value={formData.usdAmount}
                        onChange={(e) => setFormData({ ...formData, usdAmount: e.target.value })}
                        className="w-full px-4 py-3 rounded-lg bg-slate-900/50 border border-slate-600/50 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                        placeholder="1000"
                        required
                        autoFocus
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">
                        Cotización
                    </label>
                    <input
                        type="number"
                        step="0.01"
                        value={formData.exchangeRate}
                        onChange={(e) => setFormData({ ...formData, exchangeRate: e.target.value })}
                        className="w-full px-4 py-3 rounded-lg bg-slate-900/50 border border-slate-600/50 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                        placeholder="1180"
                        required
                    />
                </div>
            </div>

            {/* Calculated total */}
            {calculatedARS > 0 && (
                <div className="pt-2">
                    <div className="flex justify-between items-center mb-2 px-1">
                        <span className="text-sm font-medium text-slate-300">Total a Pagar (ARS)</span>
                        <span className="text-xl font-bold text-emerald-400">{formatARS(calculatedARS)}</span>
                    </div>

                    <div className="space-y-2 p-4 rounded-xl border border-slate-700 bg-slate-800/50">
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-sm font-medium text-slate-300">Formas de Pago</span>
                            <button
                                type="button"
                                onClick={addPaymentLine}
                                className="flex items-center gap-1 text-xs font-medium text-emerald-400 hover:text-emerald-300 bg-emerald-400/10 hover:bg-emerald-400/20 px-2 py-1 rounded-md transition-colors"
                            >
                                <Plus className="w-3 h-3" />
                                Agregar Cuenta
                            </button>
                        </div>

                        {paymentLines.map((line, index) => (
                            <div key={index} className="flex gap-2 items-start">
                                <div className="flex-1">
                                    <SearchableAccountSelect
                                        accounts={isDigital ? digitalArsAccounts : arsAccounts}
                                        value={line.accountId}
                                        onValueChange={(val) => updatePaymentLine(index, 'accountId', val)}
                                        placeholder="Cuenta origen..."
                                    />
                                </div>
                                <div className="w-[140px]">
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={line.amount}
                                        onChange={(e) => updatePaymentLine(index, 'amount', e.target.value)}
                                        className="w-full px-3 py-[9px] h-[42px] rounded-lg bg-slate-900/50 border border-slate-600/50 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                                        placeholder="Monto"
                                        required
                                    />
                                </div>
                                {paymentLines.length > 1 && (
                                    <button
                                        type="button"
                                        onClick={() => removePaymentLine(index)}
                                        className="p-2 h-[42px] rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 hover:text-red-300 transition-colors border border-red-500/20"
                                    >
                                        <Trash2 className="w-5 h-5" />
                                    </button>
                                )}
                            </div>
                        ))}

                        <div className="flex justify-between items-center mt-3 pt-3 border-t border-slate-700/50">
                            <span className="text-sm text-slate-400">Total Asignado:</span>
                            <div className="text-right">
                                <span className={`text-sm font-bold ${isTotalValid ? 'text-emerald-400' : 'text-amber-400'}`}>
                                    {formatARS(currentTotal)}
                                </span>
                                {!isTotalValid && difference !== 0 && (
                                    <span className="text-xs text-slate-400 ml-2">
                                        (Falta: {formatARS(difference)})
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* USD Destination Account */}
            <SearchableAccountSelect
                label={isDigital ? "Cuenta Digital Destino (USD)" : "Caja Destino (USD)"}
                accounts={usdAccounts}
                value={formData.usdAccountId}
                onValueChange={(val) => setFormData({ ...formData, usdAccountId: val })}
                placeholder="Seleccionar cuenta de destino..."
            />

            {/* Notes */}
            <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                    Notas (opcional)
                </label>
                <input
                    type="text"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full px-4 py-3 rounded-lg bg-slate-900/50 border border-slate-600/50 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                    placeholder="Ej: Compra a Juan"
                />
            </div>

            {/* Submit */}
            <button
                type="submit"
                disabled={loading || !isTotalValid}
                className="w-full py-4 px-4 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-500 shadow-lg shadow-emerald-900/20 transition-all disabled:opacity-50"
            >
                {loading ? 'Procesando...' : 'Confirmar Compra USD'}
            </button>
        </form>
    );
}
