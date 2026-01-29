import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getRecaudadoras } from '@/lib/actions/recaudadoras';
import { getAccounts } from '@/lib/actions/dashboard';
import { RecaudadorasClient } from './RecaudadorasClient';

export default async function RecaudadorasPage() {
    const session = await getServerSession(authOptions);

    if (!session?.user.tenantId) {
        redirect('/login');
    }

    const tenantId = session.user.tenantId;

    const [recaudadoras, accounts] = await Promise.all([
        getRecaudadoras(tenantId),
        getAccounts(tenantId),
    ]);

    return (
        <RecaudadorasClient
            recaudadoras={recaudadoras}
            accounts={accounts}
        />
    );
}
