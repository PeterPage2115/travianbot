import { describe, it, expect } from 'vitest';
import { handleInteraction } from '../../src/discord/commandRouter.js';
import { createMockInteraction, createMockConfig } from '../mocks/discord.js';
import { createMockPrisma } from '../mocks/prisma.js';

describe('Command Router', () => {
  describe('distance command', () => {
    it('should calculate distance and return embed with travel times', async () => {
      const interaction = createMockInteraction({
        commandName: 'distance',
        options: {
          x1: 0,
          y1: 0,
          x2: 100,
          y2: 100,
        },
      });
      const prisma = createMockPrisma();
      const config = createMockConfig();

      await handleInteraction(interaction as any, prisma, config);

      expect(interaction.deferReply).toHaveBeenCalledTimes(1);
      expect(interaction.editReply).toHaveBeenCalledTimes(1);

      const editCall = interaction.__editReplies[0];
      expect(editCall.embeds).toHaveLength(1);

      const embed = editCall.embeds![0].toJSON ? editCall.embeds![0].toJSON() : editCall.embeds![0];
      expect(embed.title).toContain('Distance');
      expect(embed.fields?.length).toBeGreaterThan(0);
    });

    it('should handle tribe filter option', async () => {
      const interaction = createMockInteraction({
        commandName: 'distance',
        options: {
          x1: -50,
          y1: -50,
          x2: 50,
          y2: 50,
          tribe: 'romans',
        },
      });
      const prisma = createMockPrisma();
      const config = createMockConfig();

      await handleInteraction(interaction as any, prisma, config);

      const editCall = interaction.__editReplies[0];
      expect(editCall.embeds).toHaveLength(1);

      const embed = editCall.embeds![0].toJSON ? editCall.embeds![0].toJSON() : editCall.embeds![0];
      expect(embed.fields?.some((f: any) => f.name.includes('Romans'))).toBe(true);
    });
  });

  describe('help command', () => {
    it('should return help embed with all commands', async () => {
      const interaction = createMockInteraction({
        commandName: 'help',
      });
      const prisma = createMockPrisma();
      const config = createMockConfig();

      await handleInteraction(interaction as any, prisma, config);

      expect(interaction.deferReply).toHaveBeenCalledTimes(1);
      expect(interaction.editReply).toHaveBeenCalledTimes(1);

      const editCall = interaction.__editReplies[0];
      expect(editCall.embeds).toHaveLength(1);

      const embed = editCall.embeds![0].toJSON ? editCall.embeds![0].toJSON() : editCall.embeds![0];
      expect(embed.title).toBe('Travian Bot Commands');
      expect(embed.fields?.length).toBeGreaterThan(10);
    });
  });

  describe('unknown command', () => {
    it('should reply with unknown command message', async () => {
      const interaction = createMockInteraction({
        commandName: 'nonexistent-command',
      });
      const prisma = createMockPrisma();
      const config = createMockConfig();

      await handleInteraction(interaction as any, prisma, config);

      expect(interaction.reply).toHaveBeenCalledTimes(1);
      const replyCall = interaction.__replies[0];
      expect(replyCall.content).toContain('Unknown');
      expect(replyCall.ephemeral).toBe(true);
    });
  });
});
