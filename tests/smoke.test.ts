import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { loadEnv, validateEnv, sanitizeDatabaseUrl } from '../src/config/env';

describe('Environment Configuration', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('validateEnv', () => {
    it('should throw error when DISCORD_TOKEN is missing', () => {
      delete process.env.DISCORD_TOKEN;
      process.env.DISCORD_CLIENT_ID = 'test-client-id';
      process.env.DATABASE_URL = 'postgresql://test';
      process.env.TRAVIAN_SERVER_URL = 'https://example.com';
      process.env.MAP_SQL_URL = 'https://example.com/map.sql';
      expect(() => validateEnv()).toThrow('DISCORD_TOKEN');
    });

    it('should throw error when DISCORD_CLIENT_ID is missing', () => {
      process.env.DISCORD_TOKEN = 'test-token';
      delete process.env.DISCORD_CLIENT_ID;
      process.env.DATABASE_URL = 'postgresql://test';
      process.env.TRAVIAN_SERVER_URL = 'https://example.com';
      process.env.MAP_SQL_URL = 'https://example.com/map.sql';
      expect(() => validateEnv()).toThrow('DISCORD_CLIENT_ID');
    });

    it('should throw error when DATABASE_URL is missing', () => {
      process.env.DISCORD_TOKEN = 'test-token';
      process.env.DISCORD_CLIENT_ID = 'test-client-id';
      delete process.env.DATABASE_URL;
      process.env.TRAVIAN_SERVER_URL = 'https://example.com';
      process.env.MAP_SQL_URL = 'https://example.com/map.sql';
      expect(() => validateEnv()).toThrow('DATABASE_URL');
    });

    it('should throw error when DATABASE_URL is invalid', () => {
      process.env.DISCORD_TOKEN = 'test-token';
      process.env.DISCORD_CLIENT_ID = 'test-client-id';
      process.env.DATABASE_URL = 'not-a-url';
      process.env.TRAVIAN_SERVER_URL = 'https://example.com';
      process.env.MAP_SQL_URL = 'https://example.com/map.sql';
      expect(() => validateEnv()).toThrow('DATABASE_URL');
    });

    it('should not throw when all required vars are present', () => {
      process.env.DISCORD_TOKEN = 'test-token';
      process.env.DISCORD_CLIENT_ID = 'test-client-id';
      process.env.DATABASE_URL = 'postgresql://test';
      process.env.TRAVIAN_SERVER_URL = 'https://example.com';
      process.env.MAP_SQL_URL = 'https://example.com/map.sql';
      process.env.NODE_ENV = 'test';
      
      expect(() => validateEnv()).not.toThrow();
    });

    it('should return validated config object with zod-inferred keys', () => {
      process.env.DISCORD_TOKEN = 'test-token';
      process.env.DISCORD_CLIENT_ID = 'test-client-id';
      process.env.DATABASE_URL = 'postgresql://test';
      process.env.TRAVIAN_SERVER_URL = 'https://example.com';
      process.env.MAP_SQL_URL = 'https://example.com/map.sql';
      process.env.NODE_ENV = 'development';
      
      const config = validateEnv();
      
      expect(config).toHaveProperty('DISCORD_TOKEN', 'test-token');
      expect(config).toHaveProperty('DISCORD_CLIENT_ID', 'test-client-id');
      expect(config).toHaveProperty('DATABASE_URL', 'postgresql://test');
      expect(config).toHaveProperty('NODE_ENV', 'development');
      expect(config).toHaveProperty('SERVER_ID', 1);
    });

    it('should default NODE_ENV to development', () => {
      process.env.DISCORD_TOKEN = 'test-token';
      process.env.DISCORD_CLIENT_ID = 'test-client-id';
      process.env.DATABASE_URL = 'postgresql://test';
      process.env.TRAVIAN_SERVER_URL = 'https://example.com';
      process.env.MAP_SQL_URL = 'https://example.com/map.sql';
      delete process.env.NODE_ENV;
      
      const config = validateEnv();
      expect(config.NODE_ENV).toBe('development');
    });

    it('should default SERVER_ID to 1', () => {
      process.env.DISCORD_TOKEN = 'test-token';
      process.env.DISCORD_CLIENT_ID = 'test-client-id';
      process.env.DATABASE_URL = 'postgresql://test';
      process.env.TRAVIAN_SERVER_URL = 'https://example.com';
      process.env.MAP_SQL_URL = 'https://example.com/map.sql';
      delete process.env.SERVER_ID;
      
      const config = validateEnv();
      expect(config.SERVER_ID).toBe(1);
    });

    it('should parse SERVER_ID as number from string', () => {
      process.env.DISCORD_TOKEN = 'test-token';
      process.env.DISCORD_CLIENT_ID = 'test-client-id';
      process.env.DATABASE_URL = 'postgresql://test';
      process.env.TRAVIAN_SERVER_URL = 'https://example.com';
      process.env.MAP_SQL_URL = 'https://example.com/map.sql';
      process.env.SERVER_ID = '42';
      
      const config = validateEnv();
      expect(config.SERVER_ID).toBe(42);
    });
  });

  describe('loadEnv', () => {
    it('should validate env vars after loading', () => {
      process.env.DISCORD_TOKEN = 'test-token';
      process.env.DISCORD_CLIENT_ID = 'test-client-id';
      process.env.DATABASE_URL = 'postgresql://test';
      process.env.TRAVIAN_SERVER_URL = 'https://example.com';
      process.env.MAP_SQL_URL = 'https://example.com/map.sql';
      
      expect(() => loadEnv()).not.toThrow();
    });

    it('should throw if required vars missing after load', () => {
      delete process.env.DISCORD_TOKEN;
      delete process.env.DISCORD_CLIENT_ID;
      delete process.env.DATABASE_URL;
      delete process.env.TRAVIAN_SERVER_URL;
      delete process.env.MAP_SQL_URL;
      
      expect(() => loadEnv()).toThrow('Invalid environment variables');
    });

    it('should return config with loaded values', () => {
      process.env.DISCORD_TOKEN = 'loaded-token';
      process.env.DISCORD_CLIENT_ID = 'loaded-client-id';
      process.env.DATABASE_URL = 'postgresql://loaded';
      process.env.TRAVIAN_SERVER_URL = 'https://example.com';
      process.env.MAP_SQL_URL = 'https://example.com/map.sql';
      process.env.NODE_ENV = 'test';
      
      const config = loadEnv();
      expect(config.DISCORD_TOKEN).toBe('loaded-token');
      expect(config.DISCORD_CLIENT_ID).toBe('loaded-client-id');
      expect(config.DATABASE_URL).toBe('postgresql://loaded');
      expect(config.NODE_ENV).toBe('test');
    });
  });

  describe('sanitizeDatabaseUrl', () => {
    it('should mask credentials in postgresql URL', () => {
      const url = 'postgresql://user:password@localhost:5432/dbname';
      const sanitized = sanitizeDatabaseUrl(url);
      expect(sanitized).toBe('postgresql://***:***@localhost:5432/dbname');
    });

    it('should mask query parameters and credentials', () => {
      const url = 'postgresql://user:pass@host:5432/db?apikey=secret&param=value';
      const sanitized = sanitizeDatabaseUrl(url);
      expect(sanitized).toBe('postgresql://***:***@host:5432/db?***');
    });

    it('should handle URL without credentials', () => {
      const url = 'postgresql://localhost:5432/dbname';
      const sanitized = sanitizeDatabaseUrl(url);
      expect(sanitized).toBe('postgresql://localhost:5432/dbname');
    });

    it('should handle invalid URL gracefully', () => {
      const url = 'not-a-url';
      const sanitized = sanitizeDatabaseUrl(url);
      expect(sanitized).toBe('[invalid URL]');
    });

    it('should handle empty string', () => {
      const url = '';
      const sanitized = sanitizeDatabaseUrl(url);
      expect(sanitized).toBe('[invalid URL]');
    });
  });
});
