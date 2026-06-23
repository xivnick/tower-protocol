import { useEffect, useState } from "react";
import { equipWeapon, getMyWeapons, openWeaponBox, sellWeapon, unequipWeapon } from "../../api/equipmentApi";
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

type WeaponFilter = "all" | WeaponType;

export function EquipmentScreen({ character, onCharacterChange }: { character: Character | null; onCharacterChange: (character: Character | null) => void }) {
  useDocumentTitle("TOWER://EQUIPMENT");
  const { showToast } = useToast();
  const [weapons, setWeapons] = useState<Weapon[]>([]);
  const [equippedWeaponId, setEquippedWeaponId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isOpeningBox, setIsOpeningBox] = useState(false);
  const [openedWeapon, setOpenedWeapon] = useState<Weapon | null>(null);
  const [pendingWeaponId, setPendingWeaponId] = useState<string | null>(null);
  const [isUnequipping, setIsUnequipping] = useState(false);
  const [sellingWeaponId, setSellingWeaponId] = useState<string | null>(null);
  const [selectedWeaponId, setSelectedWeaponId] = useState<string | null>(null);
  const [weaponFilter, setWeaponFilter] = useState<WeaponFilter>("all");
  const isBusy = isOpeningBox || pendingWeaponId !== null || isUnequipping || sellingWeaponId !== null;

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
    setIsOpeningBox(true);
    setMessage("");
    const result = await openWeaponBox();
    setIsOpeningBox(false);
    if (!result.ok || !result.weapon) {
      setMessage(result.message || "무기 상자를 열지 못했습니다.");
      return;
    }
    if (result.character) onCharacterChange(result.character);
    setOpenedWeapon(result.weapon);
    showToast(toastMessages.equipment.weaponFound(weaponLabel(result.weapon)));
    await loadWeapons();
  }

  async function handleEquip(weapon: Weapon) {
    setPendingWeaponId(weapon.id);
    setMessage("");
    const result = await equipWeapon(weapon.id);
    setPendingWeaponId(null);
    if (!result.ok) { setMessage(result.message); return; }
    setWeapons(result.inventory.weapons);
    setEquippedWeaponId(result.inventory.equippedWeaponId);
    showToast(toastMessages.equipment.equipped(weaponLabel(weapon)));
  }

  async function handleUnequip() {
    setIsUnequipping(true);
    setMessage("");
    const result = await unequipWeapon();
    setIsUnequipping(false);
    if (!result.ok) { setMessage(result.message); return; }
    setWeapons(result.inventory.weapons);
    setEquippedWeaponId(null);
    showToast(toastMessages.equipment.unequipped());
  }

  async function handleSell(weapon: Weapon) {
    setSellingWeaponId(weapon.id);
    setMessage("");
    const result = await sellWeapon(weapon.id);
    setSellingWeaponId(null);
    if (!result.ok) { setMessage(result.message); return; }
    if (result.character) onCharacterChange(result.character);
    setWeapons((current) => current.filter((candidate) => candidate.id !== weapon.id));
    setSelectedWeaponId(null);
    showToast(toastMessages.equipment.sold(result.gainedCredits));
  }

  if (!character) return <section className="screen-panel"><article className="panel"><p className="panel-message">캐릭터를 먼저 생성해주세요.</p></article></section>;

  const equippedWeapon = weapons.find((weapon) => weapon.id === equippedWeaponId) ?? null;
  const filteredWeapons = weaponFilter === "all" ? weapons : weapons.filter((weapon) => weapon.weaponType === weaponFilter);
  return (
    <section className="screen-panel">
      <article className="panel">
        <div className="panel-head"><span>EQUIPMENT</span><h2>무기</h2></div>
        <div className="kv-grid">
          <div className="kv"><span>장착 무기</span><strong>{equippedWeapon ? weaponLabel(equippedWeapon) : "장착한 무기 없음"}</strong></div>
          {equippedWeapon && <div className="kv"><span>효과</span><strong>{weaponEffect(equippedWeapon)}</strong></div>}
        </div>
        {equippedWeapon && <div className="button-row equipment-actions"><button className="btn ghost" type="button" onClick={handleUnequip} disabled={isBusy}>{isUnequipping ? "해제 중..." : "무기 해제"}</button></div>}
      </article>

      <article className="panel">
        <div className="panel-head action-head">
          <div><span>BOX</span><h2>무기 상자</h2></div>
          <div className="box-open-action">
            <button className="btn primary" type="button" onClick={handleOpenBox} disabled={isBusy || character.credits < 100}>{isOpeningBox ? "개봉 중..." : "무기 상자 개봉"}</button>
            <small className={character.credits < 100 ? "is-insufficient" : ""}>100 CR</small>
          </div>
        </div>
        <div className="panel-action-body">
          <p className="panel-message">무기 1개를 무작위로 획득합니다.</p>
          {openedWeapon && <div className="weapon-box-result" role="status">
            <span>획득 무기</span>
            <strong>{weaponLabel(openedWeapon)}</strong>
            <small>{weaponEffect(openedWeapon)}</small>
          </div>}
        </div>
      </article>

      <article className="panel">
        <div className="panel-head">
          <span>INVENTORY</span><h2>보유 무기</h2>
          <div className="weapon-filter-list" role="group" aria-label="무기 종류 필터">
            <button className={`weapon-filter ${weaponFilter === "all" ? "is-active" : ""}`} type="button" onClick={() => setWeaponFilter("all")} disabled={isBusy}>전체 {weapons.length}</button>
            {(Object.keys(weaponNames) as WeaponType[]).map((type) => <button className={`weapon-filter ${weaponFilter === type ? "is-active" : ""}`} type="button" onClick={() => setWeaponFilter(type)} disabled={isBusy} key={type}>{weaponNames[type]}</button>)}
          </div>
        </div>
        {isLoading ? <p className="panel-message">무기를 불러오는 중...</p> : weapons.length === 0 ? <p className="panel-message">보유한 무기가 없습니다.</p> : filteredWeapons.length === 0 ? <p className="panel-message">조건에 맞는 무기가 없습니다.</p> : <div className="weapon-list">{filteredWeapons.map((weapon) => {
          const isSelected = weapon.id === selectedWeaponId;
          const isEquipped = weapon.id === equippedWeaponId;
          return <article className={`weapon-entry ${isSelected ? "is-open" : ""} ${isEquipped ? "is-equipped" : ""}`} key={weapon.id}>
            <button className="weapon-row" type="button" onClick={() => setSelectedWeaponId(isSelected ? null : weapon.id)} aria-expanded={isSelected}>
              <div className="weapon-row-title"><strong>{weaponLabel(weapon)}</strong><small>{weaponSummary(weapon)}</small></div>
              <span>{isEquipped ? "장착 중" : "상세"}</span>
            </button>
            {isSelected && <div className="weapon-detail">
              <div className="weapon-detail-info"><span>효과</span><strong>{weaponEffect(weapon)}</strong></div>
              <div className="button-row">
                {!isEquipped && <button className="btn primary" type="button" disabled={isBusy} onClick={() => handleEquip(weapon)}>{pendingWeaponId === weapon.id ? "장착 중..." : "장착"}</button>}
                {isEquipped ? <span className="weapon-equipped-note">장착 중인 무기는 판매할 수 없습니다.</span> : <div className="weapon-sale-action"><button className="btn ghost" type="button" disabled={isBusy} onClick={() => handleSell(weapon)}>{sellingWeaponId === weapon.id ? "판매 중..." : "판매"}</button><small>20 CR</small></div>}
              </div>
            </div>}
          </article>;
        })}</div>}
        {message && <p className="auth-message is-error" role="status">{message}</p>}
      </article>
    </section>
  );
}

function weaponLabel(weapon: Weapon) { return `LV.${weapon.weaponLevel} ${weaponNames[weapon.weaponType]}`; }

function weaponSummary(weapon: Weapon) {
  if (weapon.weaponType === "longsword") return "물리 공격력 증가";
  if (weapon.weaponType === "greatsword") return "물리 공격력 증폭";
  if (weapon.weaponType === "dagger") return "전체 공속 증가";
  if (weapon.weaponType === "bow") return "추가 고정 피해";
  if (weapon.weaponType === "wand") return "마법 공격력 증가";
  return "마법 공격력 증폭";
}

function weaponEffect(weapon: Weapon) {
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
