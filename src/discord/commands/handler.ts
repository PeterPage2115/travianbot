import { Interaction, ChatInputCommandInteraction } from 'discord.js';
import { EnvConfig } from '../../config/env.js';
import { logger } from '../../logger.js';

export function isAdmin(config: EnvConfig, interaction: Interaction): boolean {
  if (!config.ADMIN_ROLE_ID) {
    return true;
  }

  if (!interaction.inGuild()) {
    return false;
  }

  const member = interaction.member;
  if (!member || !('roles' in member)) {
    return false;
  }

  return (member.roles as { cache: { has: (roleId: string) => boolean } }).cache.has(config.ADMIN_ROLE_ID!);
}

export async function requireAdmin(
  config: EnvConfig,
  interaction: ChatInputCommandInteraction
): Promise<boolean> {
  if (!isAdmin(config, interaction)) {
    await interaction.reply({ content: 'You do not have permission to use this command.', ephemeral: true });
    return false;
  }
  return true;
}

export function getGuildLanguage(interaction: Interaction): string | null {
  if (!interaction.inGuild()) {
    return null;
  }
  return null;
}

export async function handleCommandError(interaction: ChatInputCommandInteraction, error: unknown): Promise<void> {
  logger.error({ error, command: interaction.commandName }, 'Command execution failed');

  const message = error instanceof Error ? error.message : 'An unexpected error occurred.';

  if (interaction.replied || interaction.deferred) {
    await interaction.followUp({ content: `Error: ${message}`, ephemeral: true });
  } else {
    await interaction.reply({ content: `Error: ${message}`, ephemeral: true });
  }
}
