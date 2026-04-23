import { Interaction, ChatInputCommandInteraction } from 'discord.js';
import { EnvConfig } from '../../config/env.js';
import { translate, SupportedLanguage } from '../../i18n/index.js';

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
  interaction: ChatInputCommandInteraction,
  lang: SupportedLanguage
): Promise<boolean> {
  if (!isAdmin(config, interaction)) {
    await interaction.reply({ content: translate(lang, 'common.no_permission'), ephemeral: true });
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

