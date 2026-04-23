import { vi } from 'vitest';
import type {
  ChatInputCommandInteraction,
  CommandInteractionOptionResolver,
  Guild,
  GuildMember,
  User,
  APIInteractionGuildMember,
} from 'discord.js';

export type MockInteractionOptions = {
  commandName?: string;
  guildId?: string | null;
  userId?: string;
  username?: string;
  memberRoles?: string[];
  options?: Record<string, string | number | boolean | null>;
};

function createMockOptionResolver(
  options: Record<string, string | number | boolean | null>
): CommandInteractionOptionResolver {
  const resolver = {
    getString: vi.fn((name: string, required?: boolean) => {
      const value = options[name];
      if (value === undefined || value === null) {
        if (required) throw new Error(`Required option "${name}" not provided`);
        return null;
      }
      return String(value);
    }),
    getInteger: vi.fn((name: string, required?: boolean) => {
      const value = options[name];
      if (value === undefined || value === null) {
        if (required) throw new Error(`Required option "${name}" not provided`);
        return null;
      }
      if (typeof value !== 'number') {
        throw new Error(`Option "${name}" is not a number`);
      }
      return Math.floor(value);
    }),
    getBoolean: vi.fn((name: string, required?: boolean) => {
      const value = options[name];
      if (value === undefined || value === null) {
        if (required) throw new Error(`Required option "${name}" not provided`);
        return null;
      }
      return Boolean(value);
    }),
    getNumber: vi.fn((name: string, required?: boolean) => {
      const value = options[name];
      if (value === undefined || value === null) {
        if (required) throw new Error(`Required option "${name}" not provided`);
        return null;
      }
      if (typeof value !== 'number') {
        throw new Error(`Option "${name}" is not a number`);
      }
      return value;
    }),
    getSubcommand: vi.fn(() => null),
    getSubcommandGroup: vi.fn(() => null),
    getChannel: vi.fn(() => null),
    getRole: vi.fn(() => null),
    getUser: vi.fn(() => null),
    getMember: vi.fn(() => null),
    getMentionable: vi.fn(() => null),
    getAttachment: vi.fn(() => null),
    getFocused: vi.fn(() => null),
    data: [],
    resolved: null,
    client: null as any,
  } as unknown as CommandInteractionOptionResolver;

  return resolver;
}

export function createMockInteraction(opts: MockInteractionOptions = {}): ChatInputCommandInteraction {
  const {
    commandName = 'test-command',
    guildId = 'guild-123',
    userId = 'user-456',
    username = 'TestUser',
    memberRoles = [],
    options = {},
  } = opts;

  const replies: Array<{ content?: string; embeds?: unknown[]; ephemeral?: boolean }> = [];
  const editReplies: Array<{ content?: string; embeds?: unknown[] }> = [];

  const mockUser = {
    id: userId,
    username,
    discriminator: '0',
    tag: `${username}#0`,
    bot: false,
    system: false,
  } as unknown as User;

  const mockMember = {
    roles: {
      cache: {
        has: (id: string) => memberRoles.includes(id),
      },
    },
    user: mockUser,
    guild: null,
    permissions: new Set<string>(),
  } as unknown as GuildMember;

  const interaction = {
    commandName,
    guildId,
    user: mockUser,
    member: mockMember,
    options: createMockOptionResolver(options),
    isChatInputCommand: () => true,
    isCommand: () => true,
    inGuild: () => guildId !== null,
    isRepliable: () => true,
    replied: false,
    deferred: false,
    reply: vi.fn(async (payload: any) => {
      interaction.replied = true;
      replies.push(payload);
      return { id: 'reply-id', content: payload.content ?? '' } as any;
    }),
    deferReply: vi.fn(async (payload?: any) => {
      interaction.deferred = true;
      return { id: 'defer-id' } as any;
    }),
    editReply: vi.fn(async (payload: any) => {
      editReplies.push(payload);
      return { id: 'edit-id', content: payload.content ?? '' } as any;
    }),
    followUp: vi.fn(async (payload: any) => {
      return { id: 'followup-id', content: payload.content ?? '' } as any;
    }),
    fetchReply: vi.fn(async () => ({ id: 'fetch-id' } as any)),
    deleteReply: vi.fn(async () => undefined),
    __replies: replies,
    __editReplies: editReplies,
  } as unknown as ChatInputCommandInteraction & {
    __replies: typeof replies;
    __editReplies: typeof editReplies;
  };

  return interaction;
}

export function createMockConfig(overrides: Record<string, unknown> = {}): any {
  return {
    DISCORD_TOKEN: 'test-token',
    DISCORD_CLIENT_ID: 'test-client-id',
    DATABASE_URL: 'postgresql://test',
    TRAVIAN_SERVER_URL: 'https://example.com',
    MAP_SQL_URL: 'https://example.com/map.sql',
    NODE_ENV: 'test',
    LOG_LEVEL: 'silent',
    ADMIN_ROLE_ID: undefined,
    SERVER_ID: 1,
    SERVER_NAME: 'TestServer',
    INACTIVITY_LOOKBACK_SNAPSHOTS: 5,
    INACTIVITY_ZERO_GROWTH_THRESHOLD: 0,
    INACTIVITY_SMALL_GROWTH_THRESHOLD: 50,
    INACTIVITY_SMALL_GROWTH_SCORE: 3,
    ...overrides,
  };
}
