import type { Character } from "../types/character";

export const STAT_POINTS_PER_LEVEL = 5;

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

export function calculateCombatStats(character: Character) {
  return {
    physicalAttack: 10 + character.strength * 2 + character.agility,
    magicAttack: 10 + character.intelligence * 2 + character.wisdom,
    defense: 5 + character.endurance * 2 + character.vitality,
    maxHp: 100 + character.vitality * 12 + character.endurance * 6,
    accuracy: 90 + character.dexterity * 2,
    evasion: character.agility * 1.5,
    criticalChance: 5 + character.dexterity * 0.5,
    criticalDamage: 150,
    attackSpeed: 1 + character.agility * 0.005,
  };
}
