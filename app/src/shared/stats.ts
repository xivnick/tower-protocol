import type { Character } from "../types/character";

export const STAT_POINTS_PER_LEVEL = 5;
export const BASE_PRIMARY_STAT = 10;

export type PrimaryStatKey = "strength" | "agility" | "dexterity" | "vitality" | "endurance" | "intelligence" | "wisdom";

export type PrimaryStatDefinition = {
  key: PrimaryStatKey;
  label: string;
  shortLabel: string;
};

export const PRIMARY_STATS: PrimaryStatDefinition[] = [
  { key: "strength", label: "근력", shortLabel: "물리" },
  { key: "agility", label: "민첩", shortLabel: "속도" },
  { key: "dexterity", label: "손재주", shortLabel: "명중" },
  { key: "vitality", label: "체력", shortLabel: "생명" },
  { key: "endurance", label: "인내", shortLabel: "방어" },
  { key: "intelligence", label: "지력", shortLabel: "마법" },
  { key: "wisdom", label: "지혜", shortLabel: "정신" },
];

export type CombatStatLabel = {
  label: string;
  shortLabel?: string;
};

export const COMBAT_STAT_LABELS = {
  physicalAttack: { label: "물리 공격력", shortLabel: "물공" },
  magicAttack: { label: "마법 공격력", shortLabel: "마공" },
  physicalDefense: { label: "물리 방어", shortLabel: "물방" },
  magicDefense: { label: "마법 방어", shortLabel: "마방" },
  maxHp: { label: "최대 체력", shortLabel: "체력" },
  regeneration: { label: "재생" },
  attackSpeed: { label: "공격 속도", shortLabel: "공속" },
  cooldownReduction: { label: "쿨타임 감소", shortLabel: "쿨감" },
  accuracy: { label: "명중" },
  evasionRate: { label: "회피율", shortLabel: "회피" },
  criticalChance: { label: "치명타 확률", shortLabel: "치확" },
  criticalDamage: { label: "치명타 피해", shortLabel: "치피" },
} satisfies Record<string, CombatStatLabel>;

export function calculateEvasionRate(evasion: number, opponentAccuracy: number) {
  return evasion / (evasion + opponentAccuracy);
}

export function calculateCombatStats(character: Character) {
  const maxHp = 100 + character.level * 20 + character.vitality * 10;
  const attackSpeed = 100 + character.agility;
  const accuracy = 100 + character.dexterity;
  const evasion = character.agility;
  const criticalChance = Math.min(character.dexterity, 100);
  const physicalDefense = character.endurance;
  const magicDefense = character.wisdom;
  const finalDefense = physicalDefense + magicDefense;
  const cooldown = character.wisdom;
  const cooldownReduction = cooldown / (cooldown + 300);
  const regeneration = character.endurance;
  const hpRegenPerSecond = maxHp * (regeneration / 10000);

  return {
    physicalAttack: character.strength,
    magicAttack: character.intelligence,
    physicalDefense,
    magicDefense,
    finalDefense,
    maxHp,
    attackSpeed,
    attacksPerSecond: Math.sqrt(attackSpeed / 100),
    accuracy,
    evasion,
    evasionRateAgainstAccuracy100: calculateEvasionRate(evasion, 100),
    criticalChance,
    criticalDamage: 150,
    cooldown,
    cooldownReduction,
    regeneration,
    hpRegenPerSecond,
  };
}
