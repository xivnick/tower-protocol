import { useEffect, useState } from "react";
import { equipWeapon, getMyWeapons, openWeaponBox, unequipWeapon } from "../../api/equipmentApi";
import type { Weapon, WeaponType } from "../../api/equipmentApi";
import { useDocumentTitle } from "../../shared/useDocumentTitle";
import { toastMessages } from "../../shared/toastMessages";
import type { Character } from "../../types/character";
import { useToast } from "../toast/ToastProvider";

const weaponNames: Record<WeaponType, string> = {
  longsword: "장검",
  greatsword: "대검",
  dagger: "단검",
  bow: "활",
  wand: "완드",
  staff: "지팡이",
};

export function EquipmentScreen({ character, onCharacterChange }: { character: Character | null; onCharacterChange: (character: Character | null) => void }) {
  useDocumentTitle("TOWER://EQUIPMENT");
  const { showToast } = useToast();
  const [weapons, setWeapons] = useState<Weapon[]>([]);
  const [equippedWeaponId, setEquippedWeaponId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function loadWeapons() {
    setIsLoading(true);
    const result = await getMyWeapons();
    setIsLoading(false);
    if (!result.ok) {
      setMessage(result.message);
      return;
    }
    setWeapons(result.inventory.weapons);
    setEquippedWeaponId(result.inventory.equippedWeaponId);
  }

  useEffect(() => { if (character) void loadWeapons(); }, [character?.id]);

  async function handleOpenBox() {
    setIsSubmitting(true);
    setMessage("");
    const result = await openWeaponBox();
    setIsSubmitting(false);
    if (!result.ok || !result.weapon) {
      setMessage(result.message || "무기 상자를 열지 못했습니다.");
      return;
    }
    if (result.character) onCharacterChange(result.character);
    showToast(toastMessages.equipment.weaponFound(weaponLabel(result.weapon)));
    await loadWeapons();
  }

  async function handleEquip(weapon: Weapon) {
    setIsSubmitting(true);
    setMessage("");
    const result = await equipWeapon(weapon.id);
    setIsSubmitting(false);
    if (!result.ok) { setMessage(result.message); return; }
    setWeapons(result.inventory.weapons);
    setEquippedWeaponId(result.inventory.equippedWeaponId);
    showToast(toastMessages.equipment.equipped(weaponLabel(weapon)));
  }

  async function handleUnequip() {
    setIsSubmitting(true);
    setMessage("");
    const result = await unequipWeapon();
    setIsSubmitting(false);
    if (!result.ok) { setMessage(result.message); return; }
    setWeapons(result.inventory.weapons);
    setEquippedWeaponId(null);
    showToast(toastMessages.equipment.unequipped());
  }

  if (!character) return <section className="screen-panel"><article className="panel"><p className="panel-message">캐릭터를 먼저 생성해주세요.</p></article></section>;

  const equippedWeapon = weapons.find((weapon) => weapon.id === equippedWeaponId) ?? null;
  return (
    <section className="screen-panel">
      <article className="panel">
        <div className="panel-head"><span>EQUIPMENT</span><h2>무기</h2></div>
        <div className="kv-grid">
          <div className="kv"><span>장착 무기</span><strong>{equippedWeapon ? weaponLabel(equippedWeapon) : "장착한 무기 없음"}</strong></div>
          {equippedWeapon && <div className="kv"><span>효과</span><strong>{weaponEffect(equippedWeapon)}</strong></div>}
        </div>
        {equippedWeapon && <div className="button-row equipment-actions"><button className="btn ghost" type="button" onClick={handleUnequip} disabled={isSubmitting}>무기 해제</button></div>}
      </article>

      <article className="panel">
        <div className="panel-head"><span>BOX</span><h2>무기 상자</h2></div>
        <div className="panel-action-body">
          <p className="panel-message">현재 레벨 무기 1개를 무작위로 획득합니다. 비용: 100 CR</p>
          <button className="btn primary panel-primary-action" type="button" onClick={handleOpenBox} disabled={isSubmitting || character.credits < 100}>{isSubmitting ? "개봉 중..." : "무기 상자 개봉 (100 CR)"}</button>
          {character.credits < 100 && <p className="panel-message is-error">크레딧이 부족합니다.</p>}
        </div>
      </article>

      <article className="panel">
        <div className="panel-head"><span>INVENTORY</span><h2>보유 무기</h2></div>
        {isLoading ? <p className="panel-message">무기를 불러오는 중...</p> : weapons.length === 0 ? <p className="panel-message">보유한 무기가 없습니다.</p> : <div className="weapon-list">{weapons.map((weapon) => <article className={`weapon-card ${weapon.id === equippedWeaponId ? "is-equipped" : ""}`} key={weapon.id}><div><strong>{weaponLabel(weapon)}</strong><span>{weaponEffect(weapon)}</span></div><button className="btn ghost" type="button" disabled={isSubmitting || weapon.id === equippedWeaponId} onClick={() => handleEquip(weapon)}>{weapon.id === equippedWeaponId ? "장착 중" : "장착"}</button></article>)}</div>}
        {message && <p className="auth-message is-error" role="status">{message}</p>}
      </article>
    </section>
  );
}

function weaponLabel(weapon: Weapon) { return `LV.${weapon.weaponLevel} ${weaponNames[weapon.weaponType]}`; }

function weaponEffect(weapon: Weapon) {
  const level = weapon.weaponLevel;
  const power = 3 + Math.floor(level * 1.5);
  if (weapon.weaponType === "longsword") return `물리 공격력 +${power}`;
  if (weapon.weaponType === "greatsword") return `물리 공격력 +${2 + Math.floor(level * 0.1)}%`;
  if (weapon.weaponType === "dagger") return `명중 -${2 + Math.floor(level * 0.05)}, 적중 시 물공 ${(6 + level * 0.12).toFixed(1)}% 추가 피해`;
  if (weapon.weaponType === "bow") return `명중 -${1 + Math.floor(level * 0.03)}, 적중 시 +${2 + Math.floor(level * 1.1)} 고정 피해`;
  if (weapon.weaponType === "wand") return `마법 공격력 +${power}`;
  return `마법 공격력 +${2 + Math.floor(level * 0.1)}%`;
}
