import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getCurrentAccounts } from '@/lib/actions/current-accounts';
import { getAccounts } from '@/lib/actions/dashboard';
import { CuentasCorrientesClient } from './CuentasCorrientesClient';

export default async function CuentasCorrientesPage() {
    const session = await getServerSession(authOptions);

    if (!session?.user.tenantId) {
        redirect('/login');
    }

    const currentAccounts = await getCurrentAccounts(session.user.tenantId);
    const accounts = await getAccounts(session.user.tenantId);

    return (
        <CuentasCorrientesClient
            accounts={currentAccounts}
            physicalAccounts={accounts}
        />
    );
}
