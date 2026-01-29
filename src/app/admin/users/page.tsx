import { getGlobalUsers } from '@/lib/actions/admin';
import Link from 'next/link';
import { DeleteUserButton } from './DeleteUserButton';

export default async function AdminUsersPage() {
    const users = await getGlobalUsers();

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-white">Usuarios Globales</h1>
                <Link
                    href="/admin/users/new"
                    className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                >
                    + Nuevo Usuario
                </Link>
            </div>

            <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
                <table className="w-full text-left text-sm text-slate-400">
                    <thead className="bg-slate-900/50 text-slate-200">
                        <tr>
                            <th className="px-6 py-4 font-medium">Nombre</th>
                            <th className="px-6 py-4 font-medium">Email</th>
                            <th className="px-6 py-4 font-medium">Rol</th>
                            <th className="px-6 py-4 font-medium">Negocio</th>
                            <th className="px-6 py-4 font-medium">Registro</th>
                            <th className="px-6 py-4 font-medium text-right">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700">
                        {users.map((user) => (
                            <tr key={user.id} className="hover:bg-slate-700/50 transition-colors">
                                <td className="px-6 py-4 text-white font-medium">{user.name}</td>
                                <td className="px-6 py-4">{user.email}</td>
                                <td className="px-6 py-4">
                                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${user.role === 'SUPERADMIN' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' : 'bg-blue-500/10 text-blue-400 border-blue-500/20'}`}>
                                        {user.role}
                                    </span>
                                </td>
                                <td className="px-6 py-4">
                                    {user.tenant ? (
                                        <span className="text-white">{user.tenant.name}</span>
                                    ) : (
                                        <span className="text-slate-500 italic">Global</span>
                                    )}
                                </td>
                                <td className="px-6 py-4">{user.createdAt.toLocaleDateString()}</td>
                                <td className="px-6 py-4 text-right">
                                    <div className="flex items-center justify-end gap-3">
                                        <Link
                                            href={`/admin/users/${user.id}`}
                                            className="text-blue-400 hover:text-blue-300 font-medium"
                                        >
                                            Editar
                                        </Link>
                                        <DeleteUserButton userId={user.id} userName={user.name || ''} />
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
