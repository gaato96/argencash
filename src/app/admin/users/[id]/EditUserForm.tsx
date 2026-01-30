'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { updateUser } from '@/lib/actions/admin';

export function EditUserForm({ user, tenants }: { user: any, tenants: any[] }) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    async function handleSubmit(formData: FormData) {
        setLoading(true);
        setError('');

        const data: any = {
            name: formData.get('name') as string,
            email: formData.get('email') as string,
            role: formData.get('role') as any,
            tenantId: formData.get('tenantId') === 'global' ? null : formData.get('tenantId') as string,
        };

        const password = formData.get('password') as string;
        if (password) {
            data.password = password;
        }

        try {
            await updateUser(user.id, data);
            router.push('/admin/users');
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

            <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">Nombre</label>
                <input
                    name="name"
                    defaultValue={user.name}
                    required
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-purple-500 outline-none"
                />
            </div>

            <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">Email</label>
                <input
                    name="email"
                    type="email"
                    defaultValue={user.email}
                    required
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-purple-500 outline-none"
                />
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-300">Rol</label>
                    <select
                        name="role"
                        defaultValue={user.role}
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
                        defaultValue={user.tenantId || 'global'}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-purple-500 outline-none"
                    >
                        <option value="global">-- Sin Negocio (Global) --</option>
                        {tenants.map((t: any) => (
                            <option key={t.id} value={t.id}>{t.name} ({t.slug})</option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="space-y-2 pt-4 border-t border-slate-700">
                <label className="text-sm font-medium text-slate-300">Cambiar Contraseña (Opcional)</label>
                <input
                    name="password"
                    type="password"
                    placeholder="Dejar vacía para mantener la actual"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-purple-500 outline-none"
                />
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
