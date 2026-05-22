import { PrismaClient } from '@prisma/client'
import { PrismaNeon } from '@prisma/adapter-neon'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined }

function createPrismaClient() {
  // PrismaNeon accepts a pg-compatible PoolConfig — connectionString is standard pg PoolConfig
  const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL } as import('@neondatabase/serverless').PoolConfig)
  return new PrismaClient({ adapter } as ConstructorParameters<typeof PrismaClient>[0])
}

export const prisma =
  globalForPrisma.prisma ?? (globalForPrisma.prisma = createPrismaClient())

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
