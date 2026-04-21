import { SlashCommandBuilder } from 'discord.js';
import { registerCommand } from '../register.js';

export const lastUpdateCommand = new SlashCommandBuilder()
  .setName('last-update')
  .setDescription('Show when the map was last updated');

registerCommand(lastUpdateCommand);
