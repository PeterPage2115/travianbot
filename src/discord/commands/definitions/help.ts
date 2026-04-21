import { SlashCommandBuilder } from 'discord.js';
import { registerCommand } from '../register.js';

export const helpCommand = new SlashCommandBuilder()
  .setName('help')
  .setDescription('Show available commands and their usage');

registerCommand(helpCommand);
