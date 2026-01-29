import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getDashboardData, getNotebookEntries, getAccounts } from '@/lib/actions/dashboard';
import { DashboardClient } from './DashboardClient';
import prisma from '@/lib/prisma';

export default async function DashboardPage() {
    const session = await getServerSession(authOptions);

    if (!session?.user.tenantId) {
        redirect('/login');
    }

    const [dashboardData, notebookEntries, accounts, currentAccounts] = await Promise.all([
        getDashboardData(session.user.tenantId),
        getNotebookEntries(session.user.tenantId),
        getAccounts(session.user.tenantId),
        prisma.currentAccount.findMany({ where: { tenantId: session.user.tenantId, isActive: true } })
    ]);

    return (
        <DashboardClient
            initialData={{
                ...dashboardData,
                notebookEntries,
                accounts,
                currentAccounts
            }}
        />
    );
}
