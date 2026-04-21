import { SlashCommandBuilder } from 'discord.js';
import { registerCommand } from '../register.js';
import { SUPPORTED_LANGUAGES } from '../../../i18n/index.js';

export const settingsLanguageCommand = new SlashCommandBuilder()
  .setName('settings-language')
  .setDescription('Set language preference for this server (admin only)')
  .addStringOption(opt =>
    opt.setName('language').setDescription('Language code').setRequired(true)
      .addChoices(
        ...SUPPORTED_LANGUAGES.map(l => ({ name: l.toUpperCase(), value: l }))
      )
  );

registerCommand(settingsLanguageCommand);
