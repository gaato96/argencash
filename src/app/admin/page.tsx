import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export default async function AdminDashboardPage() {
    const session = await getServerSession(authOptions);

    const [tenantCount, userCount, activeTenants] = await Promise.all([
        prisma.tenant.count(),
        prisma.user.count(),
        prisma.tenant.count({ where: { isActive: true } }),
    ]);

    // Estimated MRR (Basic 20, Pro 50 - Example)
    // This assumes we add logic for plans later
    const tenants = await prisma.tenant.findMany({ select: { plan: true } });
    const estimatedMRR = tenants.reduce((acc, t) => {
        if (t.plan === 'PRO') return acc + 50;
        if (t.plan === 'BASIC') return acc + 20;
        return acc;
    }, 0);

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold text-white">Resumen Global</h1>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-slate-800/50 border border-slate-700 p-6 rounded-2xl">
                    <p className="text-sm text-slate-400 mb-1">Total Negocios</p>
                    <p className="text-3xl font-bold text-white">{tenantCount}</p>
                </div>
                <div className="bg-slate-800/50 border border-slate-700 p-6 rounded-2xl">
                    <p className="text-sm text-slate-400 mb-1">Negocios Activos</p>
                    <p className="text-3xl font-bold text-emerald-400">{activeTenants}</p>
                </div>
                <div className="bg-slate-800/50 border border-slate-700 p-6 rounded-2xl">
                    <p className="text-sm text-slate-400 mb-1">Usuarios Globales</p>
                    <p className="text-3xl font-bold text-blue-400">{userCount}</p>
                </div>
                <div className="bg-slate-800/50 border border-slate-700 p-6 rounded-2xl">
                    <p className="text-sm text-slate-400 mb-1">MRR Estimado</p>
                    <p className="text-3xl font-bold text-purple-400">${estimatedMRR}</p>
                </div>
            </div>

            {/* We can add a recent tenants table here later */}
        </div>
    );
}
