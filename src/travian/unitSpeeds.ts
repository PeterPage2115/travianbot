export const SERVER_SPEED_MULTIPLIER = 2;

export const TRIBE_UNITS: Record<string, Record<string, { baseSpeed: number; name: string }>> = {
  romans: {
    legionnaire: { baseSpeed: 6, name: 'Legionnaire' },
    praetorian: { baseSpeed: 6, name: 'Praetorian' },
    imperian: { baseSpeed: 7, name: 'Imperian' },
    equites_imperatoris: { baseSpeed: 9, name: 'Equites Imperatoris' },
    equites_caesaris: { baseSpeed: 10, name: 'Equites Caesaris' },
  },
  teutons: {
    clubswinger: { baseSpeed: 6, name: 'Clubswinger' },
    swordsman: { baseSpeed: 5.5, name: 'Swordsman' },
    axe: { baseSpeed: 6, name: 'Axe' },
    scout: { baseSpeed: 8, name: 'Scout' },
    paladin: { baseSpeed: 10, name: 'Paladin' },
  },
  gauls: {
    phalanx: { baseSpeed: 7, name: 'Phalanx' },
    swordsman: { baseSpeed: 6, name: 'Swordsman' },
    pathfinder: { baseSpeed: 8, name: 'Pathfinder' },
    theutates_thunder: { baseSpeed: 10, name: 'Theutates Thunder' },
    druidrider: { baseSpeed: 9, name: 'Druidrider' },
    crupellarius: { baseSpeed: 5, name: 'Crupellarius' },
  },
  huns: {
    scout: { baseSpeed: 8, name: 'Scout' },
    steppe_child: { baseSpeed: 7, name: 'Steppe Child' },
    marksman: { baseSpeed: 6, name: 'Marksman' },
    spotter: { baseSpeed: 9, name: 'Spotter' },
    marauder: { baseSpeed: 10, name: 'Marauder' },
    hurler: { baseSpeed: 5, name: 'Hurler' },
  },
  egyptians: {
    lashkar: { baseSpeed: 6, name: 'Lashkar' },
    adjutant: { baseSpeed: 6, name: 'Adjutant' },
    chieftain: { baseSpeed: 7, name: 'Chieftain' },
    anhor: { baseSpeed: 9, name: 'Anhor' },
    ashwarr: { baseSpeed: 10, name: 'Ashwarr' },
    resheph_chariot: { baseSpeed: 8, name: 'Resheph Chariot' },
  },
  spartans: {
    hoplite: { baseSpeed: 6, name: 'Hoplite' },
    hippeis: { baseSpeed: 9, name: 'Hippeis' },
    krykies: { baseSpeed: 7, name: 'Krykies' },
    prodromos: { baseSpeed: 8, name: 'Prodromos' },
    logades: { baseSpeed: 10, name: 'Logades' },
    phalangites: { baseSpeed: 5, name: 'Phalangites' },
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
