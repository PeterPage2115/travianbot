import { SlashCommandBuilder } from 'discord.js';
import { registerCommand } from '../register.js';

export const wotwInfoCommand = new SlashCommandBuilder()
  .setName('wotw-info')
  .setDescription('Show villages with Victory Points (Wonder of the World)')
  .addIntegerOption(opt =>
    opt.setName('limit').setDescription('Max results').setRequired(false).setMinValue(1).setMaxValue(25)
  );

registerCommand(wotwInfoCommand);
