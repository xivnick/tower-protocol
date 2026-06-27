import type { ReactNode } from "react";
import type { Armor, Weapon } from "../../api/equipmentApi";
import { calculateArmorCombatBonus } from "../../shared/armorStats";
import { combatBaseAttack } from "../../shared/stats";
import { bowAccuracyPenalty, bowFixedDamage } from "../../shared/weaponStats";
import type { Character } from "../../types/character";

const weaponNames = {
  longsword: "장검",
  greatsword: "대검",
  dagger: "단검",
  bow: "활",
  wand: "완드",
  staff: "지팡이",
} as const;

export function EquippedEquipmentPanel({ weapon, armor = null, character = null, isLoading = false, weaponAction, armorAction, headerAction }: { weapon: Weapon | null; armor?: Armor | null; character?: Character | null; isLoading?: boolean; weaponAction?: ReactNode; armorAction?: ReactNode; headerAction?: ReactNode }) {
  return (
    <article className="panel">
      <div className="panel-head action-head">
        <div><span>EQUIPPED</span><h2>착용 중인 장비</h2></div>
        {headerAction}
      </div>
      <div className="equipped-summary">
        <div className="equipped-summary-row"><span>WEAPON</span>{weapon ? <div className="equipped-summary-content"><strong><span className="equipped-summary-title"><b>{weaponLabel(weapon)}</b>{weaponAction}</span><small>{weaponEffect(weapon, character)}</small></strong></div> : <strong>{isLoading ? "장비 불러오는 중..." : "장착한 무기 없음"}</strong>}</div>
        <div className="equipped-summary-row"><span>ARMOR</span>{armor ? <div className="equipped-summary-content"><strong><span className="equipped-summary-title"><b>{armorLabel(armor)}</b>{armorAction}</span><small>{armorEffect(armor, character)}</small></strong></div> : <strong>{isLoading ? "장비 불러오는 중..." : "장착한 방어구 없음"}</strong>}</div>
      </div>
    </article>
  );
}

const armorNames = {
  plate: "중갑",
  leather: "경갑",
  robe: "로브",
} as const;

const armorVariantNames = {
  plate_reflect: "가시",
  plate_damage_reduction: "수호",
  leather_evasion_flat: "척후",
  leather_evasion_pct: "바람",
  robe_magic_defense_flat_cooldown_flat: "수호",
  robe_magic_defense_flat_cooldown_pct: "신비",
  robe_magic_defense_pct_cooldown_flat: "시간",
  robe_magic_defense_pct_cooldown_pct: "영원",
} as const;

export function armorLabel(armor: Armor) { return `LV.${armor.armorLevel} ${armorVariantNames[armor.armorVariant]} ${armorNames[armor.armorType]}`; }

export function armorSummary(armor: Armor) {
  if (armor.armorVariant === "plate_reflect") return "고정 반사 피해";
  if (armor.armorVariant === "plate_damage_reduction") return "받는 피해 감소";
  if (armor.armorType === "leather") return "회피 강화";
  return "마방 · 쿨타임 운용";
}

export function armorEffect(armor: Armor, character: Character | null = null) {
  const bonus = calculateArmorCombatBonus(armor);
  const parts = [
    bonus.reflectDamageFlat && `반사 피해 +${bonus.reflectDamageFlat}`,
    bonus.damageTakenReductionPct && `받는 피해 감소 +${formatPercent(bonus.damageTakenReductionPct)}%`,
    bonus.physicalDefenseFlat && `물리 방어 +${bonus.physicalDefenseFlat}`,
    bonus.physicalDefensePct && formatPercentBonus("물리 방어", bonus.physicalDefensePct, character?.endurance),
    bonus.evasionFlat && `회피 +${bonus.evasionFlat}`,
    bonus.evasionPct && formatPercentBonus("회피", bonus.evasionPct, character?.agility),
    bonus.magicDefenseFlat && `마법 방어 +${bonus.magicDefenseFlat}`,
    bonus.magicDefensePct && formatPercentBonus("마법 방어", bonus.magicDefensePct, character?.wisdom),
    bonus.cooldownFlat && `쿨타임 수치 +${bonus.cooldownFlat}`,
    bonus.cooldownPct && formatPercentBonus("쿨타임 수치", bonus.cooldownPct, character?.wisdom),
  ].filter(Boolean);
  return parts.map((part, index) => <span key={index}>{index > 0 && ", "}{part}</span>);
}

export function weaponLabel(weapon: Weapon) { return `LV.${weapon.weaponLevel} ${weaponNames[weapon.weaponType]}`; }

export function weaponSummary(weapon: Weapon) {
  if (weapon.weaponType === "longsword") return "물리 공격력 증가";
  if (weapon.weaponType === "greatsword") return "물리 공격력 증폭";
  if (weapon.weaponType === "dagger") return "전체 공속 증가";
  if (weapon.weaponType === "bow") return "추가 고정 피해";
  if (weapon.weaponType === "wand") return "마법 공격력 증가";
  return "마법 공격력 증폭";
}

export function weaponEffect(weapon: Weapon, character: Character | null = null) {
  const level = weapon.weaponLevel;
  const power = 3 + Math.floor(level * 1.5);
  if (weapon.weaponType === "longsword") return `물리 공격력 +${power}`;
  if (weapon.weaponType === "greatsword") return formatPercentBonus("물리 공격력", percentWeaponBonus(level), character ? combatBaseAttack(character.level) + character.strength : undefined);
  if (weapon.weaponType === "dagger") return <>{formatPercentBonus("명중", -Math.min(23, 15 + Math.floor((level - 1) / 12)), character ? 100 + character.dexterity : undefined)}{", "}{formatPercentBonus("전체 공속", 20 + Math.floor(level * 0.2), character ? 1 + character.agility / 100 : undefined)}</>;
  if (weapon.weaponType === "bow") return <>{formatPercentBonus("명중", -bowAccuracyPenalty(level), character ? 100 + character.dexterity : undefined)}{", "}+{bowFixedDamage(level)} 고정 피해</>;
  if (weapon.weaponType === "wand") return `마법 공격력 +${power}`;
  return formatPercentBonus("마법 공격력", percentWeaponBonus(level), character ? combatBaseAttack(character.level) + character.intelligence : undefined);
}

function percentWeaponBonus(level: number) {
  return Math.floor((18 + level * 0.4) * 10) / 10;
}

function formatPercent(value: number) {
  return value % 1 === 0 ? value.toFixed(0) : value.toFixed(1);
}

function formatPercentBonus(label: string, percent: number, currentValue: number | undefined) {
  const sign = percent >= 0 ? "+" : "-";
  const magnitude = Math.abs(percent);
  if (currentValue === undefined) return `${label} ${sign}${formatPercent(magnitude)}%`;
  const increase = currentValue * percent / 100;
  return <>{label} {sign}{formatPercent(magnitude)}% <span className="equipment-current-bonus">({increase >= 0 ? "+" : "-"}{formatBonusValue(Math.abs(increase))})</span></>;
}

function formatBonusValue(value: number) {
  return value % 1 === 0 ? value.toFixed(0) : value.toFixed(1);
}
