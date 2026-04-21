import { SlashCommandBuilder } from 'discord.js';
import { registerCommand } from '../register.js';
import { DIPLOMACY_STATUSES } from '../../../travian/diplomacy/diplomacyRepository.js';

export const diplomacySetCommand = new SlashCommandBuilder()
  .setName('diplomacy-set')
  .setDescription('Set diplomacy status for an alliance (admin only)')
  .addStringOption(opt =>
    opt.setName('tag').setDescription('Alliance tag').setRequired(true)
  )
  .addStringOption(opt =>
    opt.setName('status').setDescription('Diplomacy status').setRequired(true)
      .addChoices(
        ...DIPLOMACY_STATUSES.map(s => ({ name: s.charAt(0).toUpperCase() + s.slice(1), value: s }))
      )
  );

registerCommand(diplomacySetCommand);
