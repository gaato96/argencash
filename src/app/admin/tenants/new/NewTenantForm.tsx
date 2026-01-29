'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createTenant } from '@/lib/actions/admin';

export function NewTenantForm() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

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

        const data = {
            name: formData.get('name') as string,
            slug: formData.get('slug') as string,
            // Hidden fields with defaults
            plan: 'BASIC',
            commissionRate: 0,
            enabledModules: JSON.stringify(enabledModules),
            adminName: formData.get('adminName') as string,
            adminEmail: formData.get('adminEmail') as string,
            adminPassword: formData.get('adminPassword') as string,
        };

        try {
            await createTenant(data);
            router.push('/admin/tenants');
            router.refresh();
        } catch (err: any) {
            setError(err.message || 'Error al crear el negocio');
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-300">Nombre del Negocio</label>
                    <input
                        name="name"
                        required
                        placeholder="Ej: Agencia Centro"
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-purple-500 outline-none"
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-300">Identificador (Slug)</label>
                    <input
                        name="slug"
                        required
                        placeholder="ej: agencia-centro"
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-purple-500 outline-none"
                    />
                    <p className="text-xs text-slate-500">Se usará en la URL del sistema.</p>
                </div>
            </div>

            {/* Módulos Habilitados */}
            <div className="border-t border-slate-700 pt-6">
                <h3 className="text-lg font-medium text-white mb-4">Módulos Habilitados</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <label className="flex items-center space-x-3 p-3 bg-slate-900 rounded-lg border border-slate-700 hover:border-slate-600 transition-colors cursor-pointer select-none">
                        <input type="checkbox" name="module_caja" defaultChecked className="w-5 h-5 rounded border-slate-600 text-purple-600 focus:ring-purple-500 bg-slate-800" />
                        <span className="text-slate-300">Caja (Sesiones)</span>
                    </label>
                    <label className="flex items-center space-x-3 p-3 bg-slate-900 rounded-lg border border-slate-700 hover:border-slate-600 transition-colors cursor-pointer select-none">
                        <input type="checkbox" name="module_operaciones" defaultChecked className="w-5 h-5 rounded border-slate-600 text-purple-600 focus:ring-purple-500 bg-slate-800" />
                        <span className="text-slate-300">Operaciones (Compra/Venta)</span>
                    </label>
                    <label className="flex items-center space-x-3 p-3 bg-slate-900 rounded-lg border border-slate-700 hover:border-slate-600 transition-colors cursor-pointer select-none">
                        <input type="checkbox" name="module_cuentas" defaultChecked className="w-5 h-5 rounded border-slate-600 text-purple-600 focus:ring-purple-500 bg-slate-800" />
                        <span className="text-slate-300">Cuentas Físicas</span>
                    </label>
                    <label className="flex items-center space-x-3 p-3 bg-slate-900 rounded-lg border border-slate-700 hover:border-slate-600 transition-colors cursor-pointer select-none">
                        <input type="checkbox" name="module_cuentasCorrientes" defaultChecked className="w-5 h-5 rounded border-slate-600 text-purple-600 focus:ring-purple-500 bg-slate-800" />
                        <span className="text-slate-300">Cuentas Corrientes</span>
                    </label>
                    <label className="flex items-center space-x-3 p-3 bg-slate-900 rounded-lg border border-slate-700 hover:border-slate-600 transition-colors cursor-pointer select-none">
                        <input type="checkbox" name="module_recaudadoras" defaultChecked className="w-5 h-5 rounded border-slate-600 text-purple-600 focus:ring-purple-500 bg-slate-800" />
                        <span className="text-slate-300">Recaudadoras</span>
                    </label>
                    <label className="flex items-center space-x-3 p-3 bg-slate-900 rounded-lg border border-slate-700 hover:border-slate-600 transition-colors cursor-pointer select-none">
                        <input type="checkbox" name="module_reportes" defaultChecked className="w-5 h-5 rounded border-slate-600 text-purple-600 focus:ring-purple-500 bg-slate-800" />
                        <span className="text-slate-300">Reportes</span>
                    </label>
                </div>
            </div>

            <div className="border-t border-slate-700 pt-6">
                <h3 className="text-lg font-medium text-white mb-4">Administrador Inicial</h3>
                <div className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-300">Nombre del Admin</label>
                        <input
                            name="adminName"
                            required
                            placeholder="Ej: Juan Perez"
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-purple-500 outline-none"
                        />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-300">Email</label>
                            <input
                                name="adminEmail"
                                type="email"
                                required
                                placeholder="juan@agencia.com"
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-purple-500 outline-none"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-300">Contraseña Inicial</label>
                            <input
                                name="adminPassword"
                                type="password"
                                required
                                placeholder="••••••••"
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-purple-500 outline-none"
                            />
                        </div>
                    </div>
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
                    {loading ? 'Creando...' : 'Crear Negocio'}
                </button>
            </div>
        </form>
    );
}
