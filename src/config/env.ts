import { config } from 'dotenv';
import { resolve } from 'path';
import { z } from 'zod';

const envSchema = z.object({
  DISCORD_TOKEN: z.string().min(1, 'DISCORD_TOKEN is required'),
  DISCORD_CLIENT_ID: z.string().min(1, 'DISCORD_CLIENT_ID is required'),
  DATABASE_URL: z.string().url('DATABASE_URL must be a valid URL'),
  TRAVIAN_SERVER_URL: z.string().url('TRAVIAN_SERVER_URL must be a valid URL'),
  MAP_SQL_URL: z.string().url('MAP_SQL_URL must be a valid URL'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  ADMIN_ROLE_ID: z.string().optional(),
  SERVER_ID: z.coerce.number().default(1),
  SERVER_NAME: z.string().optional(),
  INACTIVITY_LOOKBACK_SNAPSHOTS: z.coerce.number().int().positive().default(5),
  INACTIVITY_ZERO_GROWTH_THRESHOLD: z.coerce.number().int().nonnegative().default(0),
  INACTIVITY_SMALL_GROWTH_THRESHOLD: z.coerce.number().int().nonnegative().default(50),
  INACTIVITY_SMALL_GROWTH_SCORE: z.coerce.number().int().nonnegative().default(3),
});

export type EnvConfig = z.infer<typeof envSchema>;

export function sanitizeDatabaseUrl(url: string): string {
  if (!url || url.trim().length === 0) {
    return '[invalid URL]';
  }

  try {
    const parsed = new URL(url);
    
    if (parsed.username || parsed.password) {
      parsed.username = '***';
      parsed.password = '***';
    }
    
    if (parsed.search) {
      parsed.search = '?***';
    }
    
    return parsed.toString();
  } catch {
    return '[invalid URL]';
  }
}

export function loadEnv(mode?: 'local' | 'production'): EnvConfig {
  const nodeEnv = process.env.NODE_ENV;
  
  // In production Docker containers, environment variables are injected directly.
  // Skip dotenv file loading to avoid issues when .env file is missing.
  if (nodeEnv !== 'production') {
    const envFile = process.env.ENV_FILE || (mode ? `.env.${mode}` : '.env');
    config({ path: resolve(process.cwd(), envFile) });
  }
  
  return validateEnv();
}

export function validateEnv(): EnvConfig {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const errors = result.error.issues.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
    throw new Error(`Invalid environment variables: ${errors}`);
  }

  return result.data;
}
