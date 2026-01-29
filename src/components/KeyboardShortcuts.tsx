'use client';

import { useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

export function KeyboardShortcuts() {
    const router = useRouter();

    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        // Don't trigger if user is typing in an input
        if (
            e.target instanceof HTMLInputElement ||
            e.target instanceof HTMLTextAreaElement ||
            e.target instanceof HTMLSelectElement
        ) {
            return;
        }

        // Don't trigger with modifier keys (except for specific combos)
        if (e.ctrlKey || e.metaKey || e.altKey) {
            return;
        }

        switch (e.key.toLowerCase()) {
            case 'c':
                e.preventDefault();
                router.push('/dashboard/operaciones?action=compra');
                break;
            case 'v':
                e.preventDefault();
                router.push('/dashboard/operaciones?action=venta');
                break;
            case 't':
                e.preventDefault();
                router.push('/dashboard/operaciones?action=transferencia');
                break;
            case 'n':
                e.preventDefault();
                // Focus the scratchpad (dispatch custom event)
                window.dispatchEvent(new CustomEvent('focus-scratchpad'));
                break;
            case 'escape':
                // Close any open modals
                window.dispatchEvent(new CustomEvent('close-modal'));
                break;
        }
    }, [router]);

    useEffect(() => {
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleKeyDown]);

    return null;
}

// Helper component to show keyboard shortcuts hint
export function ShortcutsHint() {
    return (
        <div className="flex items-center gap-4 text-xs text-slate-500">
            <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 rounded bg-slate-700 text-slate-300 font-mono">C</kbd>
                Compra
            </span>
            <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 rounded bg-slate-700 text-slate-300 font-mono">V</kbd>
                Venta
            </span>
            <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 rounded bg-slate-700 text-slate-300 font-mono">T</kbd>
                Transfer
            </span>
            <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 rounded bg-slate-700 text-slate-300 font-mono">N</kbd>
                Nota
            </span>
        </div>
    );
}
