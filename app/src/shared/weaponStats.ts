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
  const percentBonus = Math.floor((20 + weapon.weaponLevel * 0.5) * 10) / 10;

  if (weapon.weaponType === "longsword") return { physicalAttackFlat: power };
  if (weapon.weaponType === "greatsword") return { physicalAttackPct: percentBonus };
  if (weapon.weaponType === "dagger") {
    return {
      accuracyPenaltyPct: Math.min(23, 15 + Math.floor((weapon.weaponLevel - 1) / 12)),
      attackSpeedPct: 20 + Math.floor(weapon.weaponLevel * 0.2),
    };
  }
  if (weapon.weaponType === "bow") {
    return { accuracyPenaltyPct: Math.min(18, 10 + Math.floor((weapon.weaponLevel - 1) / 12)) };
  }
  if (weapon.weaponType === "wand") return { magicAttackFlat: power };
  if (weapon.weaponType === "staff") return { magicAttackPct: percentBonus };
  return {};
}
