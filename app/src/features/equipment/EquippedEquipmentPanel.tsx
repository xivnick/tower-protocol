import type { Weapon } from "../../api/equipmentApi";

const weaponNames = {
  longsword: "장검",
  greatsword: "대검",
  dagger: "단검",
  bow: "활",
  wand: "완드",
  staff: "지팡이",
} as const;

export function EquippedEquipmentPanel({ weapon, headerAction, children }: { weapon: Weapon | null; headerAction?: React.ReactNode; children?: React.ReactNode }) {
  return (
    <article className="panel">
      <div className="panel-head action-head">
        <div><span>EQUIPPED</span><h2>착용 중인 장비</h2></div>
        {headerAction}
      </div>
      <div className="kv-grid">
        <div className="kv"><span>무기</span><strong>{weapon ? weaponLabel(weapon) : "장착한 무기 없음"}</strong></div>
        {weapon && <div className="kv"><span>효과</span><strong>{weaponEffect(weapon)}</strong></div>}
      </div>
      {children}
    </article>
  );
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
