import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getAccounts } from '@/lib/actions/dashboard';
import { CuentasClient } from './CuentasClient';

export default async function CuentasPage() {
    const session = await getServerSession(authOptions);

    if (!session?.user.tenantId) {
        redirect('/login');
    }

    const tenantId = session.user.tenantId;
    const accounts = await getAccounts(tenantId);

    return <CuentasClient accounts={accounts} />;
}
