import { SlashCommandBuilder } from 'discord.js';
import { registerCommand } from '../register.js';

export const mapRefreshCommand = new SlashCommandBuilder()
  .setName('map-refresh')
  .setDescription('Manually trigger a map.sql import (admin only)');

registerCommand(mapRefreshCommand);
