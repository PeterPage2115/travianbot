import { SlashCommandBuilder } from 'discord.js';
import { registerCommand } from '../register.js';

export const playerInfoCommand = new SlashCommandBuilder()
  .setName('player-info')
  .setDescription('Show detailed information about a player')
  .addStringOption(opt =>
    opt.setName('name').setDescription('Player name').setRequired(true)
  );

registerCommand(playerInfoCommand);
