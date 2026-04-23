export const SERVER_SPEED_MULTIPLIER = 2;

export const TRIBE_UNITS: Record<string, Record<string, { baseSpeed: number; name: string }>> = {
  romans: {
    legionnaire: { baseSpeed: 6, name: 'Legionnaire' },
    praetorian: { baseSpeed: 5, name: 'Praetorian' },
    imperian: { baseSpeed: 7, name: 'Imperian' },
    equites_legati: { baseSpeed: 16, name: 'Equites Legati' },
    equites_imperatoris: { baseSpeed: 14, name: 'Equites Imperatoris' },
    equites_caesaris: { baseSpeed: 10, name: 'Equites Caesaris' },
    battering_ram: { baseSpeed: 4, name: 'Battering Ram' },
    fire_catapult: { baseSpeed: 3, name: 'Fire Catapult' },
    senator: { baseSpeed: 4, name: 'Senator' },
  },
  teutons: {
    clubswinger: { baseSpeed: 7, name: 'Clubswinger' },
    spearman: { baseSpeed: 7, name: 'Spearman' },
    axeman: { baseSpeed: 6, name: 'Axeman' },
    scout: { baseSpeed: 9, name: 'Scout' },
    paladin: { baseSpeed: 10, name: 'Paladin' },
    teutonic_knight: { baseSpeed: 9, name: 'Teutonic Knight' },
    ram: { baseSpeed: 4, name: 'Ram' },
    catapult: { baseSpeed: 3, name: 'Catapult' },
    chief: { baseSpeed: 4, name: 'Chief' },
  },
  gauls: {
    phalanx: { baseSpeed: 7, name: 'Phalanx' },
    swordsman: { baseSpeed: 6, name: 'Swordsman' },
    pathfinder: { baseSpeed: 17, name: 'Pathfinder' },
    theutates_thunder: { baseSpeed: 19, name: 'Theutates Thunder' },
    druidrider: { baseSpeed: 16, name: 'Druidrider' },
    haeduan: { baseSpeed: 13, name: 'Haeduan' },
    ram: { baseSpeed: 4, name: 'Ram' },
    trebuchet: { baseSpeed: 3, name: 'Trebuchet' },
    chieftain: { baseSpeed: 5, name: 'Chieftain' },
  },
  egyptians: {
    slave_militia: { baseSpeed: 7, name: 'Slave Militia' },
    ash_warden: { baseSpeed: 6, name: 'Ash Warden' },
    khopesh_warrior: { baseSpeed: 7, name: 'Khopesh Warrior' },
    sopdu_explorer: { baseSpeed: 16, name: 'Sopdu Explorer' },
    anhur_guard: { baseSpeed: 15, name: 'Anhur Guard' },
    resheph_chariot: { baseSpeed: 10, name: 'Resheph Chariot' },
    ram: { baseSpeed: 4, name: 'Ram' },
    catapult: { baseSpeed: 3, name: 'Catapult' },
    chieftain: { baseSpeed: 5, name: 'Chieftain' },
  },
  huns: {
    mercenary: { baseSpeed: 7, name: 'Mercenary' },
    bowman: { baseSpeed: 6, name: 'Bowman' },
    spotter: { baseSpeed: 19, name: 'Spotter' },
    steppe_rider: { baseSpeed: 16, name: 'Steppe Rider' },
    marksman: { baseSpeed: 15, name: 'Marksman' },
    marauder: { baseSpeed: 14, name: 'Marauder' },
    ram: { baseSpeed: 4, name: 'Ram' },
    catapult: { baseSpeed: 3, name: 'Catapult' },
    logades: { baseSpeed: 5, name: 'Logades' },
  },
  spartans: {
    hoplite: { baseSpeed: 6, name: 'Hoplite' },
    sentinel: { baseSpeed: 9, name: 'Sentinel' },
    shieldsman: { baseSpeed: 8, name: 'Shieldsman' },
    twinsteel_therion: { baseSpeed: 6, name: 'Twinsteel Therion' },
    elpida_rider: { baseSpeed: 16, name: 'Elpida Rider' },
    corinthian_crusher: { baseSpeed: 9, name: 'Corinthian Crusher' },
    ram: { baseSpeed: 4, name: 'Ram' },
    catapult: { baseSpeed: 3, name: 'Catapult' },
    chieftain: { baseSpeed: 4, name: 'Chieftain' },
  },
};

export const TRIBE_DISPLAY_NAMES: Record<string, string> = {
  romans: 'Romans',
  teutons: 'Teutons',
  gauls: 'Gauls',
  huns: 'Huns',
  egyptians: 'Egyptians',
  spartans: 'Spartans',
};

export const TRIBE_ID_MAP: Record<number, string> = {
  1: 'romans',
  2: 'teutons',
  3: 'gauls',
  6: 'egyptians',
  7: 'huns',
  8: 'spartans',
};

export function getEffectiveSpeed(baseSpeed: number): number {
  return baseSpeed * SERVER_SPEED_MULTIPLIER;
}

export function calculateTravelTime(distance: number, baseSpeed: number): number {
  const effectiveSpeed = getEffectiveSpeed(baseSpeed);
  return distance / effectiveSpeed;
}

export function formatTravelTime(hours: number): string {
  const totalMinutes = Math.round(hours * 60);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${h}h ${m.toString().padStart(2, '0')}m`;
}
