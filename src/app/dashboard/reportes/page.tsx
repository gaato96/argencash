import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getReportData } from '@/lib/actions/reports';
import { ReportesClient } from './ReportesClient';

export default async function ReportesPage() {
    const session = await getServerSession(authOptions);

    if (!session?.user.tenantId) {
        redirect('/login');
    }

    const data = await getReportData(session.user.tenantId, { period: 'today' });

    return (
        <ReportesClient initialData={data} />
    );
}
