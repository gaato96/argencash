// Use dynamic require to bypass Next.js 15 / Turbopack bundling issues with Prisma in production
const { PrismaClient } = require('@prisma/client');

const globalForPrisma = globalThis as unknown as {
    prisma: any; // Using any here to simplify dynamic require in TS
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prisma = prisma;
}

export default prisma;
