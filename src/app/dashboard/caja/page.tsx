import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getActiveCashSession, getCashSessionHistory } from '@/lib/actions/sessions';
import { getAccounts } from '@/lib/actions/dashboard';
import { CajaClient } from './CajaClient';

export default async function CajaPage() {
    const session = await getServerSession(authOptions);

    if (!session?.user.tenantId) {
        redirect('/login');
    }

    const tenantId = session.user.tenantId;

    const [activeCashSession, history, accounts] = await Promise.all([
        getActiveCashSession(tenantId),
        getCashSessionHistory(tenantId),
        getAccounts(tenantId),
    ]);

    // Get cash accounts for initial balances
    const cashAccounts = accounts.filter(a => a.type === 'CASH');

    return (
        <CajaClient
            activeCashSession={activeCashSession as any}
            history={history}
            accounts={accounts}
        />
    );
}
