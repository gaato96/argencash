'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { deleteUser } from '@/lib/actions/admin';
import { Trash2 } from 'lucide-react';

export function DeleteUserButton({ userId, userName }: { userId: string, userName: string }) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);

    async function handleDelete() {
        if (!confirm(`¿Estás seguro de que quieres eliminar al usuario "${userName || 'Sin Nombre'}"? Esta acción puede fallar si el usuario tiene operaciones registradas.`)) {
            return;
        }

        setLoading(true);
        try {
            await deleteUser(userId);
            router.refresh();
        } catch (error) {
            alert('Error al eliminar: ' + (error as any).message);
        } finally {
            setLoading(false);
        }
    }

    return (
        <button
            onClick={handleDelete}
            disabled={loading}
            className="text-red-400 hover:text-red-300 transition-colors disabled:opacity-50"
            title="Eliminar Usuario"
        >
            <Trash2 className="w-4 h-4" />
        </button>
    );
}
