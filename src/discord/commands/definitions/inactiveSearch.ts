import { SlashCommandBuilder } from 'discord.js';
import { registerCommand } from '../register.js';

export const inactiveSearchCommand = new SlashCommandBuilder()
  .setName('inactive-search')
  .setDescription('Find likely inactive players')
  .addIntegerOption(opt =>
    opt.setName('x').setDescription('Center X coordinate').setRequired(true).setMinValue(-200).setMaxValue(200)
  )
  .addIntegerOption(opt =>
    opt.setName('y').setDescription('Center Y coordinate').setRequired(true).setMinValue(-200).setMaxValue(200)
  )
  .addIntegerOption(opt =>
    opt.setName('radius').setDescription('Search radius in fields').setRequired(false).setMinValue(1).setMaxValue(200)
  )
  .addIntegerOption(opt =>
    opt.setName('limit').setDescription('Max results').setRequired(false).setMinValue(1).setMaxValue(25)
  );

registerCommand(inactiveSearchCommand);
