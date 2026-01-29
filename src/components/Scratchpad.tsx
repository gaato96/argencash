'use client';

import { useState, useEffect, useRef } from 'react';
import { Plus, Check, X, Edit3 } from 'lucide-react';

interface NotebookEntry {
    id: string;
    content: string;
    isProcessed: boolean;
    createdAt: Date;
}

interface ScratchpadProps {
    entries?: NotebookEntry[];
    onAddEntry?: (content: string) => Promise<void>;
    onProcessEntry?: (id: string) => Promise<void>;
    onDeleteEntry?: (id: string) => Promise<void>;
}

export function Scratchpad({
    entries = [],
    onAddEntry,
    onProcessEntry,
    onDeleteEntry,
}: ScratchpadProps) {
    const [isExpanded, setIsExpanded] = useState(false);
    const [newNote, setNewNote] = useState('');
    const [loading, setLoading] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    // Listen for focus-scratchpad event (from keyboard shortcut N)
    useEffect(() => {
        const handleFocus = () => {
            setIsExpanded(true);
            setTimeout(() => inputRef.current?.focus(), 100);
        };

        window.addEventListener('focus-scratchpad', handleFocus);
        return () => window.removeEventListener('focus-scratchpad', handleFocus);
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newNote.trim() || !onAddEntry) return;

        setLoading(true);
        try {
            await onAddEntry(newNote.trim());
            setNewNote('');
        } finally {
            setLoading(false);
        }
    };

    const pendingEntries = entries.filter((e) => !e.isProcessed);

    return (
        <div className="rounded-xl bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20 overflow-hidden">
            {/* Header - Always visible */}
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full flex items-center justify-between p-4 hover:bg-amber-500/5 transition-colors"
            >
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center">
                        <Edit3 className="w-4 h-4 text-amber-400" />
                    </div>
                    <div className="text-left">
                        <h3 className="font-medium text-white">Scratchpad</h3>
                        <p className="text-xs text-slate-400">Notas rápidas (Panic Mode)</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {pendingEntries.length > 0 && (
                        <span className="px-2 py-1 rounded-full bg-amber-500/20 text-amber-400 text-xs font-medium">
                            {pendingEntries.length} pendiente{pendingEntries.length !== 1 ? 's' : ''}
                        </span>
                    )}
                    <span className="text-slate-400 text-sm">{isExpanded ? '−' : '+'}</span>
                </div>
            </button>

            {/* Expanded content */}
            {isExpanded && (
                <div className="px-4 pb-4 space-y-3 animate-fade-in">
                    {/* Quick input */}
                    <form onSubmit={handleSubmit} className="flex gap-2">
                        <input
                            ref={inputRef}
                            type="text"
                            value={newNote}
                            onChange={(e) => setNewNote(e.target.value)}
                            placeholder="Ej: Venta 2k a Juan, viene a las 5..."
                            className="flex-1 px-4 py-2 rounded-lg bg-slate-800/50 border border-slate-600/50 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50"
                        />
                        <button
                            type="submit"
                            disabled={!newNote.trim() || loading}
                            className="px-4 py-2 rounded-lg bg-amber-500 text-white font-medium hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                        >
                            <Plus className="w-4 h-4" />
                            <span className="hidden sm:inline">Agregar</span>
                        </button>
                    </form>

                    {/* Pending entries */}
                    {pendingEntries.length > 0 && (
                        <div className="space-y-2">
                            {pendingEntries.map((entry) => (
                                <div
                                    key={entry.id}
                                    className="flex items-center gap-3 p-3 rounded-lg bg-slate-800/30 border border-slate-700/30 group"
                                >
                                    <p className="flex-1 text-sm text-slate-300">{entry.content}</p>
                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        {onProcessEntry && (
                                            <button
                                                onClick={() => onProcessEntry(entry.id)}
                                                className="p-1.5 rounded-lg text-emerald-400 hover:bg-emerald-500/10 transition-colors"
                                                title="Marcar como procesado"
                                            >
                                                <Check className="w-4 h-4" />
                                            </button>
                                        )}
                                        {onDeleteEntry && (
                                            <button
                                                onClick={() => onDeleteEntry(entry.id)}
                                                className="p-1.5 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors"
                                                title="Eliminar"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
                                    <span className="text-[10px] text-slate-500">
                                        {new Date(entry.createdAt).toLocaleTimeString('es-AR', {
                                            hour: '2-digit',
                                            minute: '2-digit',
                                        })}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}

                    {pendingEntries.length === 0 && (
                        <p className="text-center text-sm text-slate-500 py-2">
                            No hay notas pendientes
                        </p>
                    )}
                </div>
            )}
        </div>
    );
}
