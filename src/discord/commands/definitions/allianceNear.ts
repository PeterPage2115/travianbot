import { SlashCommandBuilder } from 'discord.js';
import { registerCommand } from '../register.js';

export const allianceNearCommand = new SlashCommandBuilder()
  .setName('alliance-near')
  .setDescription('Find alliance villages near a coordinate')
  .addStringOption(opt =>
    opt.setName('tag').setDescription('Alliance tag').setRequired(true)
  )
  .addIntegerOption(opt =>
    opt.setName('x').setDescription('X coordinate').setRequired(true).setMinValue(-200).setMaxValue(200)
  )
  .addIntegerOption(opt =>
    opt.setName('y').setDescription('Y coordinate').setRequired(true).setMinValue(-200).setMaxValue(200)
  )
  .addIntegerOption(opt =>
    opt.setName('radius').setDescription('Search radius in fields').setRequired(false).setMinValue(1).setMaxValue(200)
  )
  .addIntegerOption(opt =>
    opt.setName('limit').setDescription('Max results').setRequired(false).setMinValue(1).setMaxValue(25)
  );

registerCommand(allianceNearCommand);
