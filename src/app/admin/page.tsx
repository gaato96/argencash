import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import fs from 'fs';
import path from 'path';

const debugLog = (msg: string) => {
    const line = new Date().toISOString() + ' : [ADMIN-PAGE] ' + msg + '\n';
    try {
        fs.appendFileSync(path.join(process.cwd(), 'debug.log'), line);
    } catch (e) { }
};

export default async function AdminDashboardPage() {
    debugLog('AdminDashboardPage starting...');
    try {
        const session = await getServerSession(authOptions);
        debugLog('Session: ' + (session ? 'Found' : 'NULL'));

        const [tenantCount, userCount, activeTenants] = await Promise.all([
            prisma.tenant.count(),
            prisma.user.count(),
            prisma.tenant.count({ where: { isActive: true } }),
        ]);
        debugLog('Data fetched: ' + tenantCount + ' tenants, ' + userCount + ' users');

        // Estimated MRR (Basic 20, Pro 50 - Example)
        const tenants = await prisma.tenant.findMany({ select: { plan: true } });
        const estimatedMRR = tenants.reduce((acc: number, t: any) => {
            if (t.plan === 'PRO') return acc + 50;
            if (t.plan === 'BASIC') return acc + 20;
            return acc;
        }, 0);
        debugLog('MRR calculated');

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
            </div>
        );
    } catch (err: any) {
        debugLog('ADMIN PAGE ERROR: ' + err.message);
        if (err.stack) debugLog('STACK: ' + err.stack);
        return <div className="p-8 text-red-500 bg-red-500/10 border border-red-500/20 rounded-xl">Error al cargar datos de admin. Revise logs.</div>;
    }
}
