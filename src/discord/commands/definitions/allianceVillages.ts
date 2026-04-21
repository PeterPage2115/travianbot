import { SlashCommandBuilder } from 'discord.js';
import { registerCommand } from '../register.js';

export const allianceVillagesCommand = new SlashCommandBuilder()
  .setName('alliance-villages')
  .setDescription('List all villages of an alliance')
  .addStringOption(opt =>
    opt.setName('tag').setDescription('Alliance tag').setRequired(true)
  )
  .addIntegerOption(opt =>
    opt.setName('limit').setDescription('Max results').setRequired(false).setMinValue(1).setMaxValue(25)
  );

registerCommand(allianceVillagesCommand);
