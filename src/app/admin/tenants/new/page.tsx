import { NewTenantForm } from './NewTenantForm';

export default function NewTenantPage() {
    return (
        <div className="max-w-2xl mx-auto space-y-6">
            <h1 className="text-2xl font-bold text-white">New Tenant</h1>
            <p className="text-slate-400">
                Create a new workspace for a client. This will also create the initial Admin user.
            </p>

            <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
                <NewTenantForm />
            </div>
        </div>
    );
}
