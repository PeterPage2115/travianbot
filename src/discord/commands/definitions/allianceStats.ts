import { SlashCommandBuilder } from 'discord.js';
import { registerCommand } from '../register.js';

export const allianceStatsCommand = new SlashCommandBuilder()
  .setName('alliance-stats')
  .setDescription('Show statistics for an alliance')
  .addStringOption(opt =>
    opt.setName('tag').setDescription('Alliance tag').setRequired(true)
  );

registerCommand(allianceStatsCommand);
