const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
    const email = 'superadmin@admin.com';
    const password = 'admin'; // Change this purely for initial access
    const hashedPassword = await bcrypt.hash(password, 10);

    const upsertUser = await prisma.user.upsert({
        where: { email },
        update: {
            role: 'SUPERADMIN',
            password: hashedPassword,
        },
        create: {
            email,
            name: 'Super Admin',
            role: 'SUPERADMIN',
            password: hashedPassword,
            tenantId: null, // Global user
        },
    });

    console.log({ upsertUser });
    console.log(`Global Super Admin created: ${email} / ${password}`);
}

main()
    .then(async () => {
        await prisma.$disconnect();
    })
    .catch(async (e) => {
        console.error(e);
        await prisma.$disconnect();
        process.exit(1);
    });
