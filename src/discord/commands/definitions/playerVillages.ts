import { SlashCommandBuilder } from 'discord.js';
import { registerCommand } from '../register.js';

export const playerVillagesCommand = new SlashCommandBuilder()
  .setName('player-villages')
  .setDescription('List all villages of a player')
  .addStringOption(opt =>
    opt.setName('name').setDescription('Player name').setRequired(true)
  )
  .addIntegerOption(opt =>
    opt.setName('limit').setDescription('Max results').setRequired(false).setMinValue(1).setMaxValue(25)
  );

registerCommand(playerVillagesCommand);
