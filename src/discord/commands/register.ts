import { SlashCommandBuilder, SlashCommandOptionsOnlyBuilder, SlashCommandSubcommandsOnlyBuilder } from 'discord.js';
import { REST, Routes } from 'discord.js';
import { logger } from '../../logger.js';

const commandDefinitions: Array<SlashCommandBuilder | SlashCommandOptionsOnlyBuilder | SlashCommandSubcommandsOnlyBuilder> = [];

export function registerCommand(command: SlashCommandBuilder | SlashCommandOptionsOnlyBuilder | SlashCommandSubcommandsOnlyBuilder): void {
  commandDefinitions.push(command);
}

export function getAllCommands(): Array<SlashCommandBuilder | SlashCommandOptionsOnlyBuilder | SlashCommandSubcommandsOnlyBuilder> {
  return [...commandDefinitions];
}

export async function registerSlashCommands(clientId: string, token: string): Promise<void> {
  const rest = new REST({ version: '10' }).setToken(token);
  const commands = getAllCommands().map(cmd => cmd.toJSON());

  logger.info({ count: commands.length }, 'Registering slash commands globally');

  try {
    await rest.put(Routes.applicationCommands(clientId), { body: commands });
    logger.info('Successfully registered slash commands');
  } catch (error) {
    logger.error({ error }, 'Failed to register slash commands');
    throw error;
  }
}
