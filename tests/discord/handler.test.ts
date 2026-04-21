import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { isAdmin } from '../../src/discord/commands/handler.js';
import { EnvConfig } from '../../src/config/env.js';

describe('Admin Guard', () => {
  describe('isAdmin', () => {
    it('should return true when ADMIN_ROLE_ID is not set', () => {
      const config = { ADMIN_ROLE_ID: undefined } as unknown as EnvConfig;
      const interaction = { inGuild: () => true } as any;
      expect(isAdmin(config, interaction)).toBe(true);
    });

    it('should return false when not in guild', () => {
      const config = { ADMIN_ROLE_ID: '123' } as unknown as EnvConfig;
      const interaction = { inGuild: () => false } as any;
      expect(isAdmin(config, interaction)).toBe(false);
    });

    it('should return false when member has no roles', () => {
      const config = { ADMIN_ROLE_ID: '123' } as unknown as EnvConfig;
      const interaction = {
        inGuild: () => true,
        member: null,
      } as any;
      expect(isAdmin(config, interaction)).toBe(false);
    });

    it('should return false when member does not have admin role', () => {
      const config = { ADMIN_ROLE_ID: '123' } as unknown as EnvConfig;
      const interaction = {
        inGuild: () => true,
        member: {
          roles: {
            cache: { has: (id: string) => id === '456' },
          },
        },
      } as any;
      expect(isAdmin(config, interaction)).toBe(false);
    });

    it('should return true when member has admin role', () => {
      const config = { ADMIN_ROLE_ID: '123' } as unknown as EnvConfig;
      const interaction = {
        inGuild: () => true,
        member: {
          roles: {
            cache: { has: (id: string) => id === '123' },
          },
        },
      } as any;
      expect(isAdmin(config, interaction)).toBe(true);
    });
  });
});
