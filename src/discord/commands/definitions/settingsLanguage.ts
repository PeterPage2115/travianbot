import { SlashCommandBuilder } from 'discord.js';
import { registerCommand } from '../register.js';
import { SUPPORTED_LANGUAGES } from '../../../i18n/index.js';

export const settingsLanguageCommand = new SlashCommandBuilder()
  .setName('settings-language')
  .setDescription('Set language preference (user or server)')
  .addStringOption(opt =>
    opt.setName('language').setDescription('Language code').setRequired(true)
      .addChoices(
        ...SUPPORTED_LANGUAGES.map(l => ({ name: l.toUpperCase(), value: l }))
      )
  )
  .addStringOption(opt =>
    opt.setName('scope').setDescription('Apply to user or server')
      .addChoices(
        { name: 'user', value: 'user' },
        { name: 'server', value: 'server' }
      )
  );

registerCommand(settingsLanguageCommand);
