import { SlashCommandBuilder } from 'discord.js';
import { registerCommand } from '../register.js';

export const serverInfoCommand = new SlashCommandBuilder()
  .setName('server-info')
  .setDescription('Show current server and snapshot information');

registerCommand(serverInfoCommand);
