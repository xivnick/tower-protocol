export type WeaponStatSource = {
  weaponType: string;
  weaponLevel: number;
};

export type WeaponCombatBonus = {
  physicalAttackFlat?: number;
  physicalAttackPct?: number;
  magicAttackFlat?: number;
  magicAttackPct?: number;
  attackSpeedPct?: number;
  accuracyPenaltyPct?: number;
};

export function calculateWeaponCombatBonus(weapon: WeaponStatSource | null): WeaponCombatBonus {
  if (!weapon) return {};

  const power = 3 + Math.floor(weapon.weaponLevel * 1.5);
  const percentBonus = Math.floor((18 + weapon.weaponLevel * 0.4) * 10) / 10;

  if (weapon.weaponType === "longsword") return { physicalAttackFlat: power };
  if (weapon.weaponType === "greatsword") return { physicalAttackPct: percentBonus };
  if (weapon.weaponType === "dagger") {
    return {
      accuracyPenaltyPct: Math.min(23, 15 + Math.floor((weapon.weaponLevel - 1) / 12)),
      attackSpeedPct: 20 + Math.floor(weapon.weaponLevel * 0.2),
    };
  }
  if (weapon.weaponType === "bow") {
    return { accuracyPenaltyPct: bowAccuracyPenalty(weapon.weaponLevel) };
  }
  if (weapon.weaponType === "wand") return { magicAttackFlat: power };
  if (weapon.weaponType === "staff") return { magicAttackPct: percentBonus };
  return {};
}

export function bowAccuracyPenalty(weaponLevel: number) {
  return Math.min(35, 12 + Math.floor((weaponLevel - 1) / 4));
}

export function bowRequiredDexterity(weaponLevel: number) {
  const penalty = bowAccuracyPenalty(weaponLevel);
  return Math.ceil(100 / (1 - penalty / 100) - 100);
}

export function bowFixedDamage(weaponLevel: number) {
  const power = 3 + Math.floor(weaponLevel * 1.5);
  return Math.floor(power * 0.65 + bowRequiredDexterity(weaponLevel) * 0.5);
}
