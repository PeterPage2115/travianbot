import { vi } from 'vitest';
import type { PrismaClient } from '@prisma/client';

export function createMockPrisma(): PrismaClient {
  const prisma = {
    snapshot: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
    },
    server: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
    village: {
      findMany: vi.fn(),
      count: vi.fn(),
      findUnique: vi.fn(),
    },
    player: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
    alliance: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
    diplomacyStatus: {
      findMany: vi.fn(),
      upsert: vi.fn(),
      delete: vi.fn(),
      findUnique: vi.fn(),
    },
    guildSetting: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
    userSetting: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
    languagePreference: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
    $queryRaw: vi.fn(async () => []),
    $queryRawUnsafe: vi.fn(async () => []),
    $executeRaw: vi.fn(async () => 0),
    $executeRawUnsafe: vi.fn(async () => 0),
    $transaction: vi.fn(async (queries: any[]) => {
      return Promise.all(queries);
    }),
  } as unknown as PrismaClient;

  return prisma;
}
