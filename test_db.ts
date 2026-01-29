import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function test() {
    try {
        console.log('Testing connection...');
        const users = await prisma.user.count();
        console.log('Connection successful, user count:', users);
    } catch (err) {
        console.error('Connection test failed:', err);
    } finally {
        await prisma.$disconnect();
    }
}

test();
