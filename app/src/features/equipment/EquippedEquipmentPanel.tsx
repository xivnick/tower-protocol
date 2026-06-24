import type { Armor, Weapon } from "../../api/equipmentApi";
import { calculateArmorCombatBonus } from "../../shared/armorStats";

const weaponNames = {
  longsword: "장검",
  greatsword: "대검",
  dagger: "단검",
  bow: "활",
  wand: "완드",
  staff: "지팡이",
} as const;

export function EquippedEquipmentPanel({ weapon, armor = null, headerAction, children }: { weapon: Weapon | null; armor?: Armor | null; headerAction?: React.ReactNode; children?: React.ReactNode }) {
  return (
    <article className="panel">
      <div className="panel-head action-head">
        <div><span>EQUIPPED</span><h2>착용 중인 장비</h2></div>
        {headerAction}
      </div>
      <div className="kv-grid">
        <div className="kv"><span>무기</span>{weapon ? <strong className="equipped-item"><b>{weaponLabel(weapon)}</b><small>{weaponEffect(weapon)}</small></strong> : <strong>장착한 무기 없음</strong>}</div>
        <div className="kv"><span>방어구</span>{armor ? <strong className="equipped-item"><b>{armorLabel(armor)}</b><small>{armorEffect(armor)}</small></strong> : <strong>장착한 방어구 없음</strong>}</div>
      </div>
      {children}
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

export function armorEffect(armor: Armor) {
  const bonus = calculateArmorCombatBonus(armor);
  const parts = [
    bonus.reflectDamageFlat && `반사 피해 +${bonus.reflectDamageFlat}`,
    bonus.damageTakenReductionPct && `받는 피해 감소 +${formatPercent(bonus.damageTakenReductionPct)}%`,
    bonus.physicalDefenseFlat && `물리 방어 +${bonus.physicalDefenseFlat}`,
    bonus.physicalDefensePct && `물리 방어 +${formatPercent(bonus.physicalDefensePct)}%`,
    bonus.evasionFlat && `회피 +${bonus.evasionFlat}`,
    bonus.evasionPct && `회피 +${formatPercent(bonus.evasionPct)}%`,
    bonus.magicDefenseFlat && `마법 방어 +${bonus.magicDefenseFlat}`,
    bonus.magicDefensePct && `마법 방어 +${formatPercent(bonus.magicDefensePct)}%`,
    bonus.cooldownFlat && `쿨타임 수치 +${bonus.cooldownFlat}`,
    bonus.cooldownPct && `쿨타임 수치 +${formatPercent(bonus.cooldownPct)}%`,
  ].filter((part): part is string => Boolean(part));
  return parts.join(", ");
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

export function weaponEffect(weapon: Weapon) {
  const level = weapon.weaponLevel;
  const power = 3 + Math.floor(level * 1.5);
  if (weapon.weaponType === "longsword") return `물리 공격력 +${power}`;
  if (weapon.weaponType === "greatsword") return `물리 공격력 +${formatWeaponPercent(percentWeaponBonus(level))}%`;
  if (weapon.weaponType === "dagger") return `명중 -${Math.min(23, 15 + Math.floor((level - 1) / 12))}%, 전체 공속 +${20 + Math.floor(level * 0.2)}%`;
  if (weapon.weaponType === "bow") return `명중 -${Math.min(18, 10 + Math.floor((level - 1) / 12))}%, +${2 + Math.floor(level * 1.1)} 고정 피해`;
  if (weapon.weaponType === "wand") return `마법 공격력 +${power}`;
  return `마법 공격력 +${formatWeaponPercent(percentWeaponBonus(level))}%`;
}

function percentWeaponBonus(level: number) {
  return Math.floor((20 + level * 0.5) * 10) / 10;
}

function formatWeaponPercent(value: number) {
  return value.toFixed(1);
}

function formatPercent(value: number) {
  return value % 1 === 0 ? value.toFixed(0) : value.toFixed(1);
}
