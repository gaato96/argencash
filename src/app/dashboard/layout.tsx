'use client';

import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { DolarWidget } from '@/components/DolarWidget';
import { KeyboardShortcuts } from '@/components/KeyboardShortcuts';
import {
    LayoutDashboard,
    ArrowLeftRight,
    Wallet,
    Receipt,
    Users,
    PiggyBank,
    BarChart3,
    Settings,
    LogOut,
    Menu,
    X,
} from 'lucide-react';
import { useState } from 'react';

const allNavigation = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, module: 'dashboard' },
    { name: 'Operaciones', href: '/dashboard/operaciones', icon: ArrowLeftRight, module: 'operaciones' },
    { name: 'Cuentas', href: '/dashboard/cuentas', icon: Wallet, module: 'cuentas' },
    { name: 'Caja', href: '/dashboard/caja', icon: Receipt, module: 'caja' },
    { name: 'Cuentas Corrientes', href: '/dashboard/cuentas-corrientes', icon: Users, module: 'cuentasCorrientes' },
    { name: 'Recaudadoras', href: '/dashboard/recaudadoras', icon: PiggyBank, module: 'recaudadoras' },
    { name: 'Reportes', href: '/dashboard/reportes', icon: BarChart3, module: 'reportes' },
];

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { data: session } = useSession();
    const pathname = usePathname();
    const [sidebarOpen, setSidebarOpen] = useState(false);

    // Parse enabled modules
    const enabledModules = session?.user?.enabledModules
        ? JSON.parse(session.user.enabledModules)
        : {
            dashboard: true,
            operaciones: true,
            cuentas: true,
            caja: true,
            cuentasCorrientes: true,
            recaudadoras: true,
            reportes: true
        };

    // Filter navigation
    const navigation = allNavigation.filter((item: any) => {
        // Dashboard is always enabled if not explicitly disabled (or for cleanliness)
        if (item.module === 'dashboard') return true;
        // Check if module is enabled in JSON
        return enabledModules[item.module] !== false;
    });

    return (
        <div className="min-h-screen bg-slate-900">
            <KeyboardShortcuts />

            {/* Mobile sidebar overlay */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 z-40 bg-black/50 lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside className={cn(
                'fixed top-0 left-0 z-50 h-full w-72 bg-slate-800/95 backdrop-blur-xl border-r border-slate-700/50 transform transition-transform duration-200 ease-in-out lg:translate-x-0',
                sidebarOpen ? 'translate-x-0' : '-translate-x-full'
            )}>
                <div className="flex flex-col h-full">
                    {/* Logo */}
                    <div className="p-6 border-b border-slate-700/50">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/25">
                                <span className="text-xl">💱</span>
                            </div>
                            <div>
                                <h1 className="font-bold text-lg text-white">ArgenCash</h1>
                                <p className="text-xs text-slate-400">Gestión de Divisas</p>
                            </div>
                        </div>
                    </div>

                    {/* Dolar Widget */}
                    <div className="p-4">
                        <DolarWidget />
                    </div>

                    {/* Navigation */}
                    <nav className="flex-1 px-4 py-2 space-y-1 overflow-y-auto">
                        {navigation.map((item: any) => {
                            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                            return (
                                <Link
                                    key={item.name}
                                    href={item.href}
                                    onClick={() => setSidebarOpen(false)}
                                    className={cn(
                                        'flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all',
                                        isActive
                                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                            : 'text-slate-400 hover:bg-slate-700/50 hover:text-white'
                                    )}
                                >
                                    <item.icon className="w-5 h-5" />
                                    {item.name}
                                </Link>
                            );
                        })}
                    </nav>

                    {/* User section */}
                    <div className="p-4 border-t border-slate-700/50">
                        {session?.user.role === 'SUPERADMIN' && (
                            <Link
                                href="/admin"
                                className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-amber-400 hover:bg-amber-500/10 transition-all mb-2"
                            >
                                <Settings className="w-5 h-5" />
                                SuperAdmin
                            </Link>
                        )}

                        <div className="flex items-center gap-3 px-4 py-3">
                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-slate-600 to-slate-700 flex items-center justify-center text-sm font-medium text-white">
                                {session?.user.name?.[0] || 'U'}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-white truncate">
                                    {session?.user.name || 'Usuario'}
                                </p>
                                <p className="text-xs text-slate-400 truncate">
                                    {session?.user.role === 'SUPERADMIN' ? 'Super Admin' : 'Admin'}
                                </p>
                            </div>
                            <button
                                onClick={() => signOut({ callbackUrl: '/login' })}
                                className="p-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all"
                                title="Cerrar sesión"
                            >
                                <LogOut className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                </div>
            </aside>

            {/* Main content */}
            <div className="lg:pl-72">
                {/* Mobile header */}
                <header className="sticky top-0 z-30 lg:hidden bg-slate-800/95 backdrop-blur-xl border-b border-slate-700/50">
                    <div className="flex items-center justify-between px-4 py-3">
                        <button
                            onClick={() => setSidebarOpen(true)}
                            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700/50 transition-all"
                        >
                            <Menu className="w-6 h-6" />
                        </button>
                        <h1 className="font-bold text-white">ArgenCash</h1>
                        <div className="w-10" /> {/* Spacer */}
                    </div>
                </header>

                {/* Page content */}
                <main className="p-4 lg:p-8">
                    {children}
                </main>
            </div>

            {/* Mobile close button in sidebar */}
            {sidebarOpen && (
                <button
                    onClick={() => setSidebarOpen(false)}
                    className="fixed top-4 right-4 z-50 lg:hidden p-2 rounded-lg bg-slate-700 text-white"
                >
                    <X className="w-6 h-6" />
                </button>
            )}
        </div>
    );
}
