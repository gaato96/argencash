'use client';

import { useState } from 'react';
import { createTransferOperation } from '@/lib/actions/operations';
import { formatARS, formatUSD } from '@/lib/utils';
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

interface TransferFormProps {
    accounts: Account[];
    onSuccess: () => void;
    initialCurrency?: 'ARS' | 'USD';
    initialFromAccountId?: string;
    initialToAccountId?: string;
}

export function TransferForm({ accounts, onSuccess, initialCurrency = 'ARS', initialToAccountId = '' }: TransferFormProps) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [currency, setCurrency] = useState<'ARS' | 'USD'>(initialCurrency);

    const [formData, setFormData] = useState({
        amount: '',
        toAccountId: initialToAccountId,
        notes: '',
    });

    const [paymentLines, setPaymentLines] = useState([{ accountId: '', amount: '' }]);

    const filteredAccounts = accounts.filter((a: any) => a.currency === currency);

    // Total transferred 
    const targetAmount = parseFloat(formData.amount) || 0;
    const currentTotal = paymentLines.reduce((acc, line) => acc + (parseFloat(line.amount) || 0), 0);
    const difference = targetAmount - currentTotal;
    const isTotalValid = targetAmount > 0 && Math.abs(difference) < 1;

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
            setError(`La suma de los orígenes debe ser exactamente igual a ${currency === 'ARS' ? formatARS(targetAmount) : formatUSD(targetAmount)}`);
            return;
        }

        if (paymentLines.some(p => !p.accountId || !p.amount || parseFloat(p.amount) <= 0)) {
            setError('Todas las líneas de origen deben tener una cuenta seleccionada y un monto mayor a 0');
            return;
        }

        if (paymentLines.some(p => p.accountId === formData.toAccountId)) {
            setError('La cuenta destino no puede ser la misma que una de las cuentas de origen');
            return;
        }

        setLoading(true);

        try {
            await createTransferOperation({
                amount: targetAmount,
                currency,
                fromPayments: paymentLines.map(p => ({
                    accountId: p.accountId,
                    amount: parseFloat(p.amount)
                })),
                toAccountId: formData.toAccountId,
                notes: formData.notes || undefined,
            });
            onSuccess();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error al registrar operación');
        } finally {
            setLoading(false);
        }
    };

    const formatAmount = currency === 'ARS' ? formatARS : formatUSD;

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                    {error}
                </div>
            )}

            {/* Currency toggle */}
            <div className="flex rounded-lg bg-slate-700/50 p-1">
                <button
                    type="button"
                    onClick={() => {
                        setCurrency('ARS');
                        setFormData({ ...formData, toAccountId: '' });
                        setPaymentLines([{ accountId: '', amount: '' }]);
                    }}
                    className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${currency === 'ARS' ? 'bg-purple-500 text-white' : 'text-slate-400 hover:text-white'
                        }`}
                >
                    ARS
                </button>
                <button
                    type="button"
                    onClick={() => {
                        setCurrency('USD');
                        setFormData({ ...formData, toAccountId: '' });
                        setPaymentLines([{ accountId: '', amount: '' }]);
                    }}
                    className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${currency === 'USD' ? 'bg-purple-500 text-white' : 'text-slate-400 hover:text-white'
                        }`}
                >
                    USD
                </button>
            </div>

            {/* Amount */}
            <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                    Monto a Transferir
                </label>
                <input
                    type="number"
                    step="0.01"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    className="w-full px-4 py-3 rounded-lg bg-slate-900/50 border border-slate-600/50 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                    placeholder={currency === 'ARS' ? '100000' : '500'}
                    required
                />
            </div>

            {/* From Accounts (Dynamic Lines) */}
            {targetAmount > 0 && (
                <div className="pt-2">
                    <div className="space-y-2 p-4 rounded-xl border border-slate-700 bg-slate-800/50">
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-sm font-medium text-slate-300">Cuentas Origen</span>
                            <button
                                type="button"
                                onClick={addPaymentLine}
                                className="flex items-center gap-1 text-xs font-medium text-purple-400 hover:text-purple-300 bg-purple-400/10 hover:bg-purple-400/20 px-2 py-1 rounded-md transition-colors"
                            >
                                <Plus className="w-3 h-3" />
                                Agregar Cuenta
                            </button>
                        </div>

                        {paymentLines.map((line, index) => (
                            <div key={index} className="flex gap-2 items-start">
                                <div className="flex-1">
                                    <SearchableAccountSelect
                                        accounts={filteredAccounts}
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
                                        className="w-full px-3 py-[9px] h-[42px] rounded-lg bg-slate-900/50 border border-slate-600/50 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
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
                            <span className="text-sm text-slate-400">Total Origen:</span>
                            <div className="text-right">
                                <span className={`text-sm font-bold ${isTotalValid ? 'text-purple-400' : 'text-amber-400'}`}>
                                    {formatAmount(currentTotal)}
                                </span>
                                {!isTotalValid && difference !== 0 && (
                                    <span className="text-xs text-slate-400 ml-2">
                                        (Falta: {formatAmount(difference)})
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* To Account */}
            <SearchableAccountSelect
                label="Cuenta destino"
                accounts={filteredAccounts.filter((a: any) => !paymentLines.some(p => p.accountId === a.id))}
                value={formData.toAccountId}
                onValueChange={(val) => setFormData({ ...formData, toAccountId: val })}
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
                    className="w-full px-4 py-3 rounded-lg bg-slate-900/50 border border-slate-600/50 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                    placeholder="Ej: Transferencia interna"
                />
            </div>

            {/* Submit */}
            <button
                type="submit"
                disabled={loading || !isTotalValid}
                className="w-full py-3 px-4 rounded-lg bg-purple-500 text-white font-semibold hover:bg-purple-600 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {loading ? 'Registrando...' : 'Registrar Transferencia'}
            </button>
        </form>
    );
}
