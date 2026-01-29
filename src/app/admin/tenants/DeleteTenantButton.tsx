'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { deleteTenant } from '@/lib/actions/admin';
import { Trash2 } from 'lucide-react';

export function DeleteTenantButton({ tenantId, tenantName }: { tenantId: string, tenantName: string }) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);

    async function handleDelete() {
        if (!confirm(`¿Estás seguro de que quieres eliminar ELIMINAR DEFINITIVAMENTE el negocio "${tenantName}"? Esta acción no se puede deshacer y borrará TODOS sus datos.`)) {
            return;
        }

        setLoading(true);
        try {
            await deleteTenant(tenantId);
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
            title="Eliminar Negocio"
        >
            <Trash2 className="w-4 h-4" />
        </button>
    );
}
