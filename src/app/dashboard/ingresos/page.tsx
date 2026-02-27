import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getIncomes } from '@/lib/actions/operations';
import { getAccounts } from '@/lib/actions/dashboard';
import { IngresosClient } from './IngresosClient';

export default async function IngresosPage() {
    const session = await getServerSession(authOptions);

    if (!session?.user.tenantId) {
        redirect('/login');
    }

    const tenantId = session.user.tenantId;

    const [incomes, accounts] = await Promise.all([
        getIncomes(tenantId),
        getAccounts(tenantId),
    ]);

    return (
        <IngresosClient
            incomes={incomes}
            accounts={accounts}
        />
    );
}
