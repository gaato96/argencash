import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';

export default async function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== 'SUPERADMIN') {
        redirect('/api/auth/signin');
    }

    return (
        <div className="flex h-screen bg-slate-950 text-slate-100">
            {/* Admin Sidebar */}
            <aside className="w-64 border-r border-slate-800 flex flex-col">
                <div className="p-6 border-b border-slate-800">
                    <h1 className="text-xl font-bold bg-gradient-to-r from-purple-400 to-pink-600 text-transparent bg-clip-text">
                        FINANCE PRO
                        <span className="block text-xs text-slate-500 font-mono mt-1">SUPER ADMIN</span>
                    </h1>
                </div>

                <nav className="flex-1 p-4 space-y-1">
                    <Link
                        href="/admin"
                        className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
                    >
                        <span>📊 Panel Principal</span>
                    </Link>
                    <Link
                        href="/admin/tenants"
                        className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
                    >
                        <span>🏢 Negocios</span>
                    </Link>
                    <Link
                        href="/admin/users"
                        className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
                    >
                        <span>👥 Usuarios Globales</span>
                    </Link>
                </nav>

                <div className="p-4 border-t border-slate-800">
                    <Link
                        href="/dashboard"
                        className="flex items-center gap-2 text-xs text-slate-400 hover:text-white transition-colors"
                    >
                        ← Volver a Tenant Dashboard
                    </Link>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-auto bg-slate-900">
                <div className="p-8">
                    {children}
                </div>
            </main>
        </div>
    );
}
