import { getTenant, updateTenantModules } from '@/lib/actions/admin';
import { EditTenantForm } from './EditTenantForm';

export default async function EditTenantPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const tenantRaw = await getTenant(id);
    const tenant = tenantRaw ? JSON.parse(JSON.stringify(tenantRaw)) : null;

    if (!tenant) {
        return <div className="text-white">Tenant no encontrado</div>;
    }

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            <h1 className="text-2xl font-bold text-white">Editar Negocio: {tenant.name}</h1>

            <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
                <EditTenantForm tenant={tenant} />
            </div>
        </div>
    );
}
