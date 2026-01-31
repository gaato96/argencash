'use client';

import { useState, useMemo } from 'react';
import { Search, X, Check, Wallet } from 'lucide-react';
import { formatARS, formatUSD } from '@/lib/utils';

interface Account {
    id: string;
    name: string;
    currency: string;
    bank?: string | null;
    balance?: number;
}

interface SearchableAccountSelectProps {
    accounts: Account[];
    value: string;
    onValueChange: (value: string) => void;
    placeholder?: string;
    label?: string;
}

export function SearchableAccountSelect({
    accounts,
    value,
    onValueChange,
    placeholder = "Seleccionar cuenta...",
    label
}: SearchableAccountSelectProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    const selectedAccount = useMemo(() =>
        accounts.find((a: any) => a.id === value),
        [accounts, value]);

    const filteredAccounts = useMemo(() => {
        if (!searchTerm) return accounts;
        const term = searchTerm.toLowerCase();
        return accounts.filter((a: any) =>
            a.name.toLowerCase().includes(term) ||
            (a.bank && a.bank.toLowerCase().includes(term))
        );
    }, [accounts, searchTerm]);

    return (
        <div className="relative space-y-1">
            {label && <label className="block text-sm font-medium text-slate-300">{label}</label>}

            <div
                onClick={() => setIsOpen(!isOpen)}
                className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white cursor-pointer flex items-center justify-between hover:border-slate-600 transition-colors"
            >
                <div className="flex flex-col items-start">
                    <span className={selectedAccount ? "text-white" : "text-slate-500"}>
                        {selectedAccount ? `${selectedAccount.name} (${selectedAccount.currency})` : placeholder}
                    </span>
                    {selectedAccount && typeof selectedAccount.balance === 'number' && (
                        <span className="text-[10px] font-medium text-emerald-400 flex items-center gap-1">
                            <Wallet className="w-3 h-3" />
                            Disponible: {selectedAccount.currency === 'USD' ? formatUSD(selectedAccount.balance) : formatARS(selectedAccount.balance)}
                        </span>
                    )}
                </div>
                <Search className="w-4 h-4 text-slate-500" />
            </div>

            {isOpen && (
                <>
                    <div className="fixed inset-0 z-[60]" onClick={() => setIsOpen(false)} />
                    <div className="absolute top-full left-0 right-0 mt-2 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl z-[70] overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="p-2 border-b border-slate-700 flex items-center gap-2">
                            <Search className="w-4 h-4 text-slate-500" />
                            <input
                                autoFocus
                                type="text"
                                placeholder="Buscar cuenta..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full bg-transparent border-none outline-none text-sm text-white focus:ring-0"
                            />
                            {searchTerm && (
                                <button onClick={() => setSearchTerm('')}>
                                    <X className="w-4 h-4 text-slate-500" />
                                </button>
                            )}
                        </div>
                        <div className="max-h-60 overflow-y-auto">
                            {filteredAccounts.length > 0 ? (
                                filteredAccounts.map(account => (
                                    <div
                                        key={account.id}
                                        onClick={() => {
                                            onValueChange(account.id);
                                            setIsOpen(false);
                                            setSearchTerm('');
                                        }}
                                        className="flex items-center justify-between px-4 py-3 hover:bg-slate-700 cursor-pointer transition-colors"
                                    >
                                        <div>
                                            <p className="text-sm font-medium text-white">{account.name}</p>
                                            <div className="flex items-center gap-2">
                                                <p className="text-xs text-slate-400">{account.currency} {account.bank ? `- ${account.bank}` : ''}</p>
                                                {typeof account.balance === 'number' && (
                                                    <p className="text-[10px] text-emerald-500 font-mono">
                                                        ({account.currency === 'USD' ? formatUSD(account.balance) : formatARS(account.balance)})
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                        {value === account.id && <Check className="w-4 h-4 text-emerald-500" />}
                                    </div>
                                ))
                            ) : (
                                <div className="p-4 text-center text-sm text-slate-500">
                                    No se encontraron cuentas
                                </div>
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
