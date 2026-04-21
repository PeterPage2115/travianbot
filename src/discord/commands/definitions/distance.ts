import { SlashCommandBuilder } from 'discord.js';
import { registerCommand } from '../register.js';
import { TRIBE_DISPLAY_NAMES } from '../../../travian/unitSpeeds.js';

export const distanceCommand = new SlashCommandBuilder()
  .setName('distance')
  .setDescription('Calculate distance and travel time between two coordinates')
  .addIntegerOption(opt =>
    opt.setName('x1').setDescription('Source X coordinate').setRequired(true).setMinValue(-200).setMaxValue(200)
  )
  .addIntegerOption(opt =>
    opt.setName('y1').setDescription('Source Y coordinate').setRequired(true).setMinValue(-200).setMaxValue(200)
  )
  .addIntegerOption(opt =>
    opt.setName('x2').setDescription('Target X coordinate').setRequired(true).setMinValue(-200).setMaxValue(200)
  )
  .addIntegerOption(opt =>
    opt.setName('y2').setDescription('Target Y coordinate').setRequired(true).setMinValue(-200).setMaxValue(200)
  )
  .addStringOption(opt =>
    opt.setName('tribe').setDescription('Filter by attacker tribe').setRequired(false)
      .addChoices(
        ...Object.entries(TRIBE_DISPLAY_NAMES).map(([key, name]) => ({ name, value: key }))
      )
  );

registerCommand(distanceCommand);
