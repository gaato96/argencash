import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Seeding database...');

    // Hash password for all users
    const hashedPassword = await bcrypt.hash('admin123', 10);

    // 1. Create Default Tenant
    const tenant = await prisma.tenant.upsert({
        where: { slug: 'argencash-default' },
        update: {},
        create: {
            name: 'ArgenCash Default',
            slug: 'argencash-default',
            plan: 'PRO',
            commissionRate: 0.01,
            enabledModules: JSON.stringify({
                recaudadoras: true,
                cuentasCorrientes: true,
                reportes: true,
            }),
        },
    });

    console.log('✅ Tenant created:', tenant.name);

    // 2. Create SuperAdmin
    await prisma.user.upsert({
        where: { email: 'super@argencash.com' },
        update: { password: hashedPassword },
        create: {
            email: 'super@argencash.com',
            name: 'Super Admin',
            password: hashedPassword,
            role: 'SUPERADMIN',
        },
    });

    // 3. Create Admin Users
    const adminUsers = [
        { email: 'leo@argencash.com', name: 'Leo' },
        { email: 'flor@argencash.com', name: 'Flor' },
        { email: 'luciano@argencash.com', name: 'Luciano' },
    ];

    for (const user of adminUsers) {
        await prisma.user.upsert({
            where: { email: user.email },
            update: { password: hashedPassword },
            create: {
                email: user.email,
                name: user.name,
                password: hashedPassword,
                role: 'ADMIN',
                tenantId: tenant.id,
            },
        });
    }

    // 4. Create Initial Accounts
    const accounts = [
        { name: 'Caja Pesos', currency: 'ARS', type: 'CASH', ownership: 'PROPIO' },
        { name: 'Caja Dólares', currency: 'USD', type: 'CASH', ownership: 'PROPIO' },
        { name: 'Banco Galicia ARS', currency: 'ARS', type: 'BANK', ownership: 'PROPIO', bank: 'Galicia' },
        { name: 'Banco Galicia USD', currency: 'USD', type: 'BANK', ownership: 'PROPIO', bank: 'Galicia' },
        { name: 'Mercado Pago', currency: 'ARS', type: 'VIRTUAL', ownership: 'PROPIO' },
        { name: 'Cuenta Tercero X', currency: 'ARS', type: 'BANK', ownership: 'TERCERO' },
    ];

    for (const acc of accounts) {
        // Check if exists
        const existing = await prisma.account.findFirst({
            where: { tenantId: tenant.id, name: acc.name }
        });

        if (!existing) {
            await prisma.account.create({
                data: { ...acc, tenantId: tenant.id }
            });
        }
    }

    // 5. Create Recaudadora
    await prisma.recaudadora.create({
        data: {
            tenantId: tenant.id,
            clientName: 'Recaudadora Principal',
            commissionRate: 0.01,
            dailyAccumulated: 0,
        },
    });

    console.log('🎉 Seed completed successfully!');
}

main()
    .catch((e) => {
        console.error('❌ Seed failed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
