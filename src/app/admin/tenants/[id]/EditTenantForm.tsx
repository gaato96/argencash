'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { updateTenantModules } from '@/lib/actions/admin';

export function EditTenantForm({ tenant }: { tenant: any }) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const initialModules = tenant.enabledModules ? JSON.parse(tenant.enabledModules) : {};

    async function handleSubmit(formData: FormData) {
        setLoading(true);
        setError('');

        const enabledModules = {
            dashboard: true,
            caja: formData.get('module_caja') === 'on',
            operaciones: formData.get('module_operaciones') === 'on',
            cuentas: formData.get('module_cuentas') === 'on',
            cuentasCorrientes: formData.get('module_cuentasCorrientes') === 'on',
            recaudadoras: formData.get('module_recaudadoras') === 'on',
            reportes: formData.get('module_reportes') === 'on',
        };

        try {
            await updateTenantModules(tenant.id, JSON.stringify(enabledModules));
            router.push('/admin/tenants');
            router.refresh();
        } catch (err: any) {
            setError(err.message || 'Error al actualizar');
        } finally {
            setLoading(false);
        }
    }

    return (
        <form action={handleSubmit} className="space-y-6">
            {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg text-sm">
                    {error}
                </div>
            )}

            <div className="space-y-4 border-b border-slate-700 pb-6 mb-6">
                <div>
                    <label className="text-sm font-medium text-slate-400 block mb-1">Nombre</label>
                    <p className="text-white font-medium text-lg">{tenant.name}</p>
                </div>
                <div>
                    <label className="text-sm font-medium text-slate-400 block mb-1">Slug</label>
                    <p className="text-white font-mono">{tenant.slug}</p>
                </div>
            </div>

            <div>
                <h3 className="text-lg font-medium text-white mb-4">Configurar Módulos</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <label className="flex items-center space-x-3 p-3 bg-slate-900 rounded-lg border border-slate-700 hover:border-slate-600 transition-colors cursor-pointer select-none">
                        <input type="checkbox" name="module_caja" defaultChecked={initialModules.caja} className="w-5 h-5 rounded border-slate-600 text-purple-600 focus:ring-purple-500 bg-slate-800" />
                        <span className="text-slate-300">Caja</span>
                    </label>
                    <label className="flex items-center space-x-3 p-3 bg-slate-900 rounded-lg border border-slate-700 hover:border-slate-600 transition-colors cursor-pointer select-none">
                        <input type="checkbox" name="module_operaciones" defaultChecked={initialModules.operaciones} className="w-5 h-5 rounded border-slate-600 text-purple-600 focus:ring-purple-500 bg-slate-800" />
                        <span className="text-slate-300">Operaciones</span>
                    </label>
                    <label className="flex items-center space-x-3 p-3 bg-slate-900 rounded-lg border border-slate-700 hover:border-slate-600 transition-colors cursor-pointer select-none">
                        <input type="checkbox" name="module_cuentas" defaultChecked={initialModules.cuentas} className="w-5 h-5 rounded border-slate-600 text-purple-600 focus:ring-purple-500 bg-slate-800" />
                        <span className="text-slate-300">Cuentas</span>
                    </label>
                    <label className="flex items-center space-x-3 p-3 bg-slate-900 rounded-lg border border-slate-700 hover:border-slate-600 transition-colors cursor-pointer select-none">
                        <input type="checkbox" name="module_cuentasCorrientes" defaultChecked={initialModules.cuentasCorrientes} className="w-5 h-5 rounded border-slate-600 text-purple-600 focus:ring-purple-500 bg-slate-800" />
                        <span className="text-slate-300">Cuentas Corrientes</span>
                    </label>
                    <label className="flex items-center space-x-3 p-3 bg-slate-900 rounded-lg border border-slate-700 hover:border-slate-600 transition-colors cursor-pointer select-none">
                        <input type="checkbox" name="module_recaudadoras" defaultChecked={initialModules.recaudadoras} className="w-5 h-5 rounded border-slate-600 text-purple-600 focus:ring-purple-500 bg-slate-800" />
                        <span className="text-slate-300">Recaudadoras</span>
                    </label>
                    <label className="flex items-center space-x-3 p-3 bg-slate-900 rounded-lg border border-slate-700 hover:border-slate-600 transition-colors cursor-pointer select-none">
                        <input type="checkbox" name="module_reportes" defaultChecked={initialModules.reportes} className="w-5 h-5 rounded border-slate-600 text-purple-600 focus:ring-purple-500 bg-slate-800" />
                        <span className="text-slate-300">Reportes</span>
                    </label>
                </div>
            </div>

            <div className="pt-6 flex justify-end gap-3">
                <button
                    type="button"
                    onClick={() => router.back()}
                    className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
                >
                    Cancelar
                </button>
                <button
                    type="submit"
                    disabled={loading}
                    className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
                >
                    {loading ? 'Guardar Cambios' : 'Guardar Cambios'}
                </button>
            </div>
        </form>
    );
}
