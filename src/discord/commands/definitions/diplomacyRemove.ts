import { SlashCommandBuilder } from 'discord.js';
import { registerCommand } from '../register.js';

export const diplomacyRemoveCommand = new SlashCommandBuilder()
  .setName('diplomacy-remove')
  .setDescription('Remove diplomacy status for an alliance (admin only)')
  .addStringOption(opt =>
    opt.setName('tag').setDescription('Alliance tag').setRequired(true)
  );

registerCommand(diplomacyRemoveCommand);
