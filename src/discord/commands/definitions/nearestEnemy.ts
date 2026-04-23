import { SlashCommandBuilder } from 'discord.js';
import { registerCommand } from '../register.js';

export const nearestEnemyCommand = new SlashCommandBuilder()
  .setName('nearest-enemy')
  .setDescription('Find the nearest enemy villages from a coordinate (sorted by distance)')
  .addIntegerOption(opt =>
    opt.setName('x').setDescription('X coordinate').setRequired(true).setMinValue(-200).setMaxValue(200)
  )
  .addIntegerOption(opt =>
    opt.setName('y').setDescription('Y coordinate').setRequired(true).setMinValue(-200).setMaxValue(200)
  )
  .addIntegerOption(opt =>
    opt.setName('limit').setDescription('Max results').setRequired(false).setMinValue(1).setMaxValue(25)
  );

registerCommand(nearestEnemyCommand);
