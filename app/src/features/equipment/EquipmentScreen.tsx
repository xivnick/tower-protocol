import { useEffect, useState } from "react";
import { equipWeapon, getMyWeapons, openWeaponBox, sellWeapon, unequipArmor, unequipWeapon } from "../../api/equipmentApi";
import type { Weapon, WeaponType } from "../../api/equipmentApi";
import { useDocumentTitle } from "../../shared/useDocumentTitle";
import { toastMessages } from "../../shared/toastMessages";
import type { Character } from "../../types/character";
import { useToast } from "../toast/ToastProvider";
import { EquippedEquipmentPanel, weaponEffect, weaponLabel, weaponSummary } from "./EquippedEquipmentPanel";
import { ArmorEquipmentPanel } from "./ArmorEquipmentPanel";
import type { Armor } from "../../api/equipmentApi";
import { EquipmentComparison, getWeaponComparisonEntries } from "./EquipmentComparison";

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
  const [equippedArmor, setEquippedArmor] = useState<Armor | null>(null);
  const [armorRefreshKey, setArmorRefreshKey] = useState(0);
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isOpeningBox, setIsOpeningBox] = useState(false);
  const [openedWeapon, setOpenedWeapon] = useState<Weapon | null>(null);
  const [pendingWeaponId, setPendingWeaponId] = useState<string | null>(null);
  const [isUnequipping, setIsUnequipping] = useState(false);
  const [isUnequippingArmor, setIsUnequippingArmor] = useState(false);
  const [sellingWeaponId, setSellingWeaponId] = useState<string | null>(null);
  const [selectedWeaponId, setSelectedWeaponId] = useState<string | null>(null);
  const [weaponFilter, setWeaponFilter] = useState<WeaponFilter>("all");
  const isBusy = isOpeningBox || pendingWeaponId !== null || isUnequipping || isUnequippingArmor || sellingWeaponId !== null;

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

  async function handleUnequipArmor() {
    setIsUnequippingArmor(true);
    setMessage("");
    const result = await unequipArmor();
    setIsUnequippingArmor(false);
    if (!result.ok) { setMessage(result.message); return; }
    setEquippedArmor(null);
    setArmorRefreshKey((current) => current + 1);
    showToast(toastMessages.equipment.armorUnequipped());
  }

  async function handleSell(weapon: Weapon) {
    setSellingWeaponId(weapon.id);
    setMessage("");
    const result = await sellWeapon(weapon.id);
    setSellingWeaponId(null);
    if (!result.ok) { setMessage(result.message); return; }
    if (result.character) onCharacterChange(result.character);
    setWeapons((current) => current.filter((candidate) => candidate.id !== weapon.id));
    setOpenedWeapon((current) => current?.id === weapon.id ? null : current);
    setSelectedWeaponId(null);
    showToast(toastMessages.equipment.sold(result.gainedCredits));
  }

  if (!character) return <section className="screen-panel"><article className="panel"><p className="panel-message">캐릭터를 먼저 생성해주세요.</p></article></section>;

  const equippedWeapon = weapons.find((weapon) => weapon.id === equippedWeaponId) ?? null;
  const filteredWeapons = weapons
    .filter((weapon) => weaponFilter === "all" || weapon.weaponType === weaponFilter)
    .sort((left, right) => right.weaponLevel - left.weaponLevel || right.createdAt.localeCompare(left.createdAt));
  return (
    <section className="screen-panel">
      <EquippedEquipmentPanel
        weapon={equippedWeapon}
        armor={equippedArmor}
        character={character}
        weaponAction={equippedWeapon ? <button className="text-button" type="button" onClick={handleUnequip} disabled={isBusy}>{isUnequipping ? "해제 중..." : "해제"}</button> : undefined}
        armorAction={equippedArmor ? <button className="text-button" type="button" onClick={handleUnequipArmor} disabled={isBusy}>{isUnequippingArmor ? "해제 중..." : "해제"}</button> : undefined}
      />

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
            <small>{weaponEffect(openedWeapon, character)}</small>
            <EquipmentComparison entries={getWeaponComparisonEntries(character, equippedWeapon, openedWeapon, equippedArmor)} />
            <div className="button-row equipment-actions">
              {openedWeapon.id === equippedWeaponId ? <span className="weapon-equipped-note">장착 중인 무기는 판매할 수 없습니다.</span> : <>
                <button className="btn primary" type="button" disabled={isBusy} onClick={() => handleEquip(openedWeapon)}>{pendingWeaponId === openedWeapon.id ? "장착 중..." : "장착"}</button>
                <div className="weapon-sale-action"><button className="btn ghost" type="button" disabled={isBusy} onClick={() => handleSell(openedWeapon)}>{sellingWeaponId === openedWeapon.id ? "판매 중..." : "판매"}</button><small>20 CR</small></div>
              </>}
            </div>
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
              <div className="weapon-detail-info"><span>효과</span><strong>{weaponEffect(weapon, character)}</strong></div>
              <EquipmentComparison entries={getWeaponComparisonEntries(character, equippedWeapon, weapon, equippedArmor)} />
              <div className="button-row">
                {!isEquipped && <button className="btn primary" type="button" disabled={isBusy} onClick={() => handleEquip(weapon)}>{pendingWeaponId === weapon.id ? "장착 중..." : "장착"}</button>}
                {isEquipped ? <span className="weapon-equipped-note">장착 중인 무기는 판매할 수 없습니다.</span> : <div className="weapon-sale-action"><button className="btn ghost" type="button" disabled={isBusy} onClick={() => handleSell(weapon)}>{sellingWeaponId === weapon.id ? "판매 중..." : "판매"}</button><small>20 CR</small></div>}
              </div>
            </div>}
          </article>;
        })}</div>}
        {message && <p className="auth-message is-error" role="status">{message}</p>}
      </article>

      <ArmorEquipmentPanel character={character} equippedWeapon={equippedWeapon} onCharacterChange={onCharacterChange} onEquippedArmorChange={setEquippedArmor} refreshKey={armorRefreshKey} />
    </section>
  );
}
