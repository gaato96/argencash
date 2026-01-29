import { getUser, getTenants } from '@/lib/actions/admin';
import { EditUserForm } from './EditUserForm';

export default async function EditUserPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const [user, tenants] = await Promise.all([
        getUser(id),
        getTenants()
    ]);

    if (!user) {
        return <div className="text-white">Usuario no encontrado</div>;
    }

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            <h1 className="text-2xl font-bold text-white">Editar Usuario: {user.name}</h1>

            <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
                <EditUserForm user={user} tenants={tenants} />
            </div>
        </div>
    );
}
