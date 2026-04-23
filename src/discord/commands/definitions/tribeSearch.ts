import { SlashCommandBuilder } from 'discord.js';
import { registerCommand } from '../register.js';
import { TRIBE_DISPLAY_NAMES } from '../../../travian/unitSpeeds.js';

export const tribeSearchCommand = new SlashCommandBuilder()
  .setName('tribe-search')
  .setDescription('Find villages by tribe')
  .addStringOption(opt =>
    opt.setName('tribe').setDescription('Tribe to search for').setRequired(true)
      .addChoices(
        ...Object.entries(TRIBE_DISPLAY_NAMES).map(([key, name]) => ({ name, value: key }))
      )
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

registerCommand(tribeSearchCommand);
