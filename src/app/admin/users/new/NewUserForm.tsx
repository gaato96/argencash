'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createUser } from '@/lib/actions/admin';

export function NewUserForm({ tenants }: { tenants: any[] }) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    async function handleSubmit(formData: FormData) {
        setLoading(true);
        setError('');

        const data = {
            name: formData.get('name') as string,
            email: formData.get('email') as string,
            password: formData.get('password') as string,
            role: formData.get('role') as any,
            tenantId: formData.get('tenantId') === 'global' ? undefined : formData.get('tenantId') as string,
        };

        try {
            await createUser(data);
            router.push('/admin/users');
            router.refresh();
        } catch (err: any) {
            setError(err.message || 'Error al crear usuario');
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

            <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">Nombre</label>
                <input
                    name="name"
                    required
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-purple-500 outline-none"
                />
            </div>

            <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">Email</label>
                <input
                    name="email"
                    type="email"
                    required
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-purple-500 outline-none"
                />
            </div>

            <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">Contraseña</label>
                <input
                    name="password"
                    type="password"
                    required
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-purple-500 outline-none"
                />
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-300">Rol</label>
                    <select
                        name="role"
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-purple-500 outline-none"
                    >
                        <option value="USER">Usuario (User)</option>
                        <option value="ADMIN">Administrador de Negocio (Admin)</option>
                        <option value="SUPERADMIN">Super Administrador Global</option>
                    </select>
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-300">Asignar a Negocio</label>
                    <select
                        name="tenantId"
                        defaultValue="global"
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-purple-500 outline-none"
                    >
                        <option value="global">-- Sin Negocio (Global) --</option>
                        {tenants.map((t: any) => (
                            <option key={t.id} value={t.id}>{t.name} ({t.slug})</option>
                        ))}
                    </select>
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
                    {loading ? 'Creando...' : 'Crear Usuario'}
                </button>
            </div>
        </form>
    );
}
