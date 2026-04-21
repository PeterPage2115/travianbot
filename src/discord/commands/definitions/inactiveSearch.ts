import { SlashCommandBuilder } from 'discord.js';
import { registerCommand } from '../register.js';

export const inactiveSearchCommand = new SlashCommandBuilder()
  .setName('inactive-search')
  .setDescription('Find likely inactive players')
  .addIntegerOption(opt =>
    opt.setName('limit').setDescription('Max results').setRequired(false).setMinValue(1).setMaxValue(25)
  );

registerCommand(inactiveSearchCommand);
