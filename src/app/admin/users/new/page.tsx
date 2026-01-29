import { getTenants } from '@/lib/actions/admin';
import { NewUserForm } from './NewUserForm';

export default async function NewUserPage() {
    const tenants = await getTenants();

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            <h1 className="text-2xl font-bold text-white">Crear Nuevo Usuario</h1>

            <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
                <NewUserForm tenants={tenants} />
            </div>
        </div>
    );
}
