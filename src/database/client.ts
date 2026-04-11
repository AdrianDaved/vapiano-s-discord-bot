import { PrismaClient } from '@prisma/client';

// Never log 'query' — raw SQL often contains user content (message text,
// user IDs, ticket contents) that gets persisted into redirected log files.
// Stick to error + warn in every environment.
const prisma = new PrismaClient({
  log: ['error', 'warn'],
});

export default prisma;
