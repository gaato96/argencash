import { PrismaClient } from '@prisma/client';

// Use dynamic require to bypass Next.js 15 / Turbopack bundling issues with Prisma in production
// but keep the type for better DX.
const getPrismaClient = () => {
    if (process.env.NODE_ENV === 'production') {
        const { PrismaClient: PC } = require('@prisma/client');
        return new PC();
    }
    return new PrismaClient();
};

const globalForPrisma = globalThis as unknown as {
    prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? getPrismaClient();

if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prisma = prisma;
}

export default prisma;
