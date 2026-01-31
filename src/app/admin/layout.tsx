'use client';

import { getServerSession } from 'next-auth';
import { useSession, signOut } from 'next-auth/react';
import { redirect, usePathname } from 'next/navigation';
import Link from 'next/link';
import { LogoutButton } from '@/components/admin/LogoutButton';
import { useState } from 'react';
import { Menu, X, LayoutDashboard, Building2, Users, ArrowLeft, LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { data: session, status } = useSession();
    const pathname = usePathname();
    const [sidebarOpen, setSidebarOpen] = useState(false);

    if (status === 'loading') return null;

    if (!session || session.user.role !== 'SUPERADMIN') {
        redirect('/api/auth/signin');
    }

    const navigation = [
        { name: 'Panel Principal', href: '/admin', icon: LayoutDashboard },
        { name: 'Negocios', href: '/admin/tenants', icon: Building2 },
        { name: 'Usuarios Globales', href: '/admin/users', icon: Users },
    ];

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100">
            {/* Mobile sidebar overlay */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 z-40 bg-black/50 lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside className={cn(
                "fixed top-0 left-0 z-50 h-full w-64 bg-slate-900 border-r border-slate-800 transform transition-transform duration-200 ease-in-out lg:translate-x-0 flex flex-col",
                sidebarOpen ? "translate-x-0" : "-translate-x-full"
            )}>
                <div className="p-6 border-b border-slate-800">
                    <h1 className="text-xl font-bold bg-gradient-to-r from-purple-400 to-pink-600 text-transparent bg-clip-text">
                        FINANCE PRO
                        <span className="block text-xs text-slate-500 font-mono mt-1">SUPER ADMIN</span>
                    </h1>
                </div>

                <nav className="flex-1 p-4 space-y-1 flex flex-col">
                    {navigation.map((item) => {
                        const isActive = pathname === item.href;
                        return (
                            <Link
                                key={item.name}
                                href={item.href}
                                onClick={() => setSidebarOpen(false)}
                                className={cn(
                                    "flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors",
                                    isActive
                                        ? "bg-purple-600/10 text-purple-400 border border-purple-600/20"
                                        : "text-slate-300 hover:text-white hover:bg-slate-800"
                                )}
                            >
                                <item.icon className="w-4 h-4" />
                                <span>{item.name}</span>
                            </Link>
                        );
                    })}

                    <div className="pt-4 mt-auto">
                        <LogoutButton />
                    </div>
                </nav>

                <div className="p-4 border-t border-slate-800">
                    <Link
                        href="/dashboard"
                        className="flex items-center gap-2 text-xs text-slate-400 hover:text-white transition-colors"
                    >
                        <ArrowLeft className="w-3 h-3" />
                        Volver a Tenant Dashboard
                    </Link>
                </div>
            </aside>

            {/* Main Content */}
            <div className="lg:pl-64 flex flex-col min-h-screen">
                {/* Mobile Header */}
                <header className="sticky top-0 z-30 lg:hidden bg-slate-950/80 backdrop-blur-md border-b border-slate-800 px-4 py-3 flex items-center justify-between">
                    <button
                        onClick={() => setSidebarOpen(true)}
                        className="p-2 -ml-2 text-slate-400 hover:text-white"
                    >
                        <Menu className="w-6 h-6" />
                    </button>
                    <span className="font-bold text-sm tracking-wider">FINANCE PRO</span>
                    <div className="w-8" />
                </header>

                <main className="flex-1 p-4 lg:p-8 bg-slate-900/50">
                    <div className="max-w-7xl mx-auto">
                        {children}
                    </div>
                </main>
            </div>

            {/* Mobile close button */}
            {sidebarOpen && (
                <button
                    onClick={() => setSidebarOpen(false)}
                    className="fixed top-4 right-4 z-50 lg:hidden p-2 rounded-lg bg-slate-800 text-white"
                >
                    <X className="w-6 h-6" />
                </button>
            )}
        </div>
    );
}
