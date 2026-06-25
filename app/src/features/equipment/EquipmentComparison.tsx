import type { Armor, Weapon } from "../../api/equipmentApi";
import { calculateArmorCombatBonus } from "../../shared/armorStats";
import { calculateCombatStats } from "../../shared/stats";
import { calculateWeaponCombatBonus } from "../../shared/weaponStats";
import type { Character } from "../../types/character";

type ComparisonEntry = {
  label: string;
  delta: number;
  formatter?: (value: number) => string;
};

type ComparisonConfig = {
  label: string;
  current: number;
  next: number;
  formatter?: (value: number) => string;
};

const EPSILON = 0.0001;

export function EquipmentComparison({ entries }: { entries: ComparisonEntry[] }) {
  const visibleEntries = entries.filter((entry) => Math.abs(entry.delta) > EPSILON);

  return (
    <div className="equipment-comparison">
      <span>현재 장비 대비</span>
      {visibleEntries.length > 0 ? (
        <div className="equipment-comparison-list">
          {visibleEntries.map((entry) => (
            <span className={`equipment-comparison-chip ${entry.delta > 0 ? "is-up" : "is-down"}`} key={entry.label}>
              <b>{entry.label}</b>
              <strong>{formatDelta(entry.delta, entry.formatter)}</strong>
            </span>
          ))}
        </div>
      ) : (
        <strong>변화 없음</strong>
      )}
    </div>
  );
}

export function getWeaponComparisonEntries(
  character: Character,
  currentWeapon: Weapon | null,
  nextWeapon: Weapon,
  currentArmor: Armor | null,
) {
  const currentStats = calculateCombatStats(character, calculateWeaponCombatBonus(currentWeapon), calculateArmorCombatBonus(currentArmor));
  const nextStats = calculateCombatStats(character, calculateWeaponCombatBonus(nextWeapon), calculateArmorCombatBonus(currentArmor));

  return buildEntries([
    { label: "물공", current: currentStats.physicalAttack, next: nextStats.physicalAttack },
    { label: "마공", current: currentStats.magicAttack, next: nextStats.magicAttack },
    { label: "공속", current: currentStats.attacksPerSecond, next: nextStats.attacksPerSecond, formatter: formatPerSecond },
    { label: "명중", current: currentStats.accuracy, next: nextStats.accuracy },
    { label: "고정 피해", current: getWeaponFixedDamage(currentWeapon), next: getWeaponFixedDamage(nextWeapon) },
  ]);
}

export function getArmorComparisonEntries(
  character: Character,
  currentArmor: Armor | null,
  nextArmor: Armor,
  currentWeapon: Weapon | null,
) {
  const currentStats = calculateCombatStats(character, calculateWeaponCombatBonus(currentWeapon), calculateArmorCombatBonus(currentArmor));
  const nextStats = calculateCombatStats(character, calculateWeaponCombatBonus(currentWeapon), calculateArmorCombatBonus(nextArmor));

  return buildEntries([
    { label: "물방", current: currentStats.physicalDefense, next: nextStats.physicalDefense },
    { label: "마방", current: currentStats.magicDefense, next: nextStats.magicDefense },
    { label: "회피", current: currentStats.evasion, next: nextStats.evasion },
    { label: "쿨감", current: currentStats.cooldownReduction, next: nextStats.cooldownReduction, formatter: formatPercentagePoint },
    { label: "피감", current: currentStats.damageTakenReduction, next: nextStats.damageTakenReduction, formatter: formatPercent },
    { label: "반사", current: currentStats.reflectDamage, next: nextStats.reflectDamage },
  ]);
}

function buildEntries(configs: ComparisonConfig[]) {
  return configs.map((config) => ({
    label: config.label,
    delta: config.next - config.current,
    formatter: config.formatter,
  }));
}

function getWeaponFixedDamage(weapon: Weapon | null) {
  if (weapon?.weaponType !== "bow") return 0;
  return 2 + Math.floor(weapon.weaponLevel * 1.1);
}

function formatDelta(value: number, formatter = formatStat) {
  const sign = value > 0 ? "+" : "-";
  return `${sign}${formatter(Math.abs(value))}`;
}

function formatStat(value: number) {
  return value % 1 === 0 ? value.toFixed(0) : value.toFixed(1);
}

function formatPerSecond(value: number) {
  return `${value.toFixed(2)}/s`;
}

function formatPercent(value: number) {
  return `${formatStat(value)}%`;
}

function formatPercentagePoint(value: number) {
  return `${(value * 100).toFixed(1)}%p`;
}
