import { SlashCommandBuilder } from 'discord.js';
import { registerCommand } from '../register.js';

export const diplomacyListCommand = new SlashCommandBuilder()
  .setName('diplomacy-list')
  .setDescription('List all diplomacy settings for this server');

registerCommand(diplomacyListCommand);
