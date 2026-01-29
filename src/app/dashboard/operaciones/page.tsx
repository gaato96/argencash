import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getOperations } from '@/lib/actions/operations';
import { getAccounts } from '@/lib/actions/dashboard';
import { getCurrentAccounts } from '@/lib/actions/current-accounts';
import { OperationsClient } from './OperationsClient';

export default async function OperationsPage({
    searchParams,
}: {
    searchParams: Promise<{ action?: string }>;
}) {
    const session = await getServerSession(authOptions);

    if (!session?.user.tenantId) {
        redirect('/login');
    }

    const params = await searchParams;
    const tenantId = session.user.tenantId;
    const today = new Date();

    const [operations, accounts, currentAccounts] = await Promise.all([
        getOperations(tenantId, { date: today }),
        getAccounts(tenantId),
        getCurrentAccounts(tenantId),
    ]);

    return (
        <OperationsClient
            operations={operations}
            accounts={accounts}
            currentAccounts={currentAccounts}
            initialAction={params.action}
        />
    );
}
