const { PrismaClient } = require('@prisma/client');
const path = require('path');

const dbPath = path.join(__dirname, 'dev.db');
const datasourceUrl = `file:${dbPath}`;

console.log('Using datasourceUrl:', datasourceUrl);

const prisma = new PrismaClient({
  // Prisma 7 way to pass the URL if not in schema
  __internal: {
    engine: {
      endpoint: datasourceUrl
    }
  }
});

async function main() {
  console.log('Testing connection from JS...');
  const count = await prisma.user.count();
  console.log('User count:', count);
}

main().catch(console.error).finally(() => prisma.$disconnect());
