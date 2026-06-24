export type ArmorType = "plate" | "leather" | "robe";

export type ArmorVariant =
  | "plate_reflect"
  | "plate_damage_reduction"
  | "leather_evasion_flat"
  | "leather_evasion_pct"
  | "robe_magic_defense_flat_cooldown_flat"
  | "robe_magic_defense_flat_cooldown_pct"
  | "robe_magic_defense_pct_cooldown_flat"
  | "robe_magic_defense_pct_cooldown_pct";

export type ArmorStatSource = {
  armorType: ArmorType;
  armorVariant: ArmorVariant;
  armorLevel: number;
};

export type ArmorCombatBonus = {
  physicalDefenseFlat?: number;
  physicalDefensePct?: number;
  magicDefenseFlat?: number;
  magicDefensePct?: number;
  cooldownFlat?: number;
  cooldownPct?: number;
  evasionFlat?: number;
  evasionPct?: number;
  damageTakenReductionPct?: number;
  reflectDamageFlat?: number;
};

export function calculateArmorCombatBonus(armor: ArmorStatSource | null): ArmorCombatBonus {
  if (!armor) return {};

  const flat = 2 + Math.floor(armor.armorLevel * 1.2);
  const percent = Math.floor((5 + armor.armorLevel * 0.2) * 10) / 10;
  const cooldownFlat = 1 + Math.floor(armor.armorLevel * 0.35);

  switch (armor.armorVariant) {
    case "plate_reflect": return { reflectDamageFlat: 2 + Math.floor(armor.armorLevel * 0.7) };
    case "plate_damage_reduction": return { damageTakenReductionPct: Math.floor((3 + armor.armorLevel * 0.08) * 10) / 10 };
    case "leather_evasion_flat": return { physicalDefenseFlat: flat, evasionFlat: flat };
    case "leather_evasion_pct": return { physicalDefenseFlat: flat, evasionPct: percent };
    case "robe_magic_defense_flat_cooldown_flat": return { magicDefenseFlat: flat, cooldownFlat };
    case "robe_magic_defense_flat_cooldown_pct": return { magicDefenseFlat: flat, cooldownPct: percent };
    case "robe_magic_defense_pct_cooldown_flat": return { magicDefensePct: percent, cooldownFlat };
    case "robe_magic_defense_pct_cooldown_pct": return { magicDefensePct: percent, cooldownPct: percent };
  }
}
