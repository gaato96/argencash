import { getTenants } from '@/lib/actions/admin';
import Link from 'next/link';
import { DeleteTenantButton } from './DeleteTenantButton';

export default async function AdminTenantsPage() {
    const tenants = await getTenants();

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-white">Negocios (Tenants)</h1>
                <Link
                    href="/admin/tenants/new"
                    className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                >
                    + Nuevo Negocio
                </Link>
            </div>

            <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
                <table className="w-full text-left text-sm text-slate-400">
                    <thead className="bg-slate-900/50 text-slate-200">
                        <tr>
                            <th className="px-6 py-4 font-medium">Nombre</th>
                            <th className="px-6 py-4 font-medium">Slug (ID)</th>
                            <th className="px-6 py-4 font-medium">Plan</th>
                            <th className="px-6 py-4 font-medium">Usuarios</th>
                            <th className="px-6 py-4 font-medium">Estado</th>
                            <th className="px-6 py-4 font-medium text-right">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700">
                        {tenants.map((tenant) => (
                            <tr key={tenant.id} className="hover:bg-slate-700/50 transition-colors">
                                <td className="px-6 py-4 text-white font-medium">{tenant.name}</td>
                                <td className="px-6 py-4 font-mono text-xs">{tenant.slug}</td>
                                <td className="px-6 py-4">
                                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-500/10 text-purple-400 border border-purple-500/20">
                                        {tenant.plan}
                                    </span>
                                </td>
                                <td className="px-6 py-4">{tenant._count.users}</td>
                                <td className="px-6 py-4">
                                    {tenant.isActive ? (
                                        <span className="text-emerald-400 text-xs">Activo</span>
                                    ) : (
                                        <span className="text-red-400 text-xs">Inactivo</span>
                                    )}
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <div className="flex items-center justify-end gap-3">
                                        <Link
                                            href={`/admin/tenants/${tenant.id}`}
                                            className="text-blue-400 hover:text-blue-300 font-medium"
                                        >
                                            Editar
                                        </Link>
                                        <DeleteTenantButton tenantId={tenant.id} tenantName={tenant.name} />
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {tenants.length === 0 && (
                            <tr>
                                <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                                    No hay negocios registrados. Crea uno para comenzar.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
