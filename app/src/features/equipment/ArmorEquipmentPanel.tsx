import { useEffect, useState } from "react";
import { equipArmor, getMyArmors, openArmorBox, sellArmor, unequipArmor } from "../../api/equipmentApi";
import type { Armor } from "../../api/equipmentApi";
import type { ArmorType } from "../../shared/armorStats";
import { toastMessages } from "../../shared/toastMessages";
import type { Character } from "../../types/character";
import { useToast } from "../toast/ToastProvider";
import { armorEffect, armorLabel, armorSummary } from "./EquippedEquipmentPanel";

const armorNames: Record<ArmorType, string> = { plate: "중갑", leather: "경갑", robe: "로브" };
type ArmorFilter = "all" | ArmorType;

export function ArmorEquipmentPanel({ character, onCharacterChange, onEquippedArmorChange, refreshKey = 0 }: {
  character: Character;
  onCharacterChange: (character: Character | null) => void;
  onEquippedArmorChange: (armor: Armor | null) => void;
  refreshKey?: number;
}) {
  const { showToast } = useToast();
  const [armors, setArmors] = useState<Armor[]>([]);
  const [equippedArmorId, setEquippedArmorId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isOpeningBox, setIsOpeningBox] = useState(false);
  const [openedArmor, setOpenedArmor] = useState<Armor | null>(null);
  const [pendingArmorId, setPendingArmorId] = useState<string | null>(null);
  const [isUnequipping, setIsUnequipping] = useState(false);
  const [sellingArmorId, setSellingArmorId] = useState<string | null>(null);
  const [selectedArmorId, setSelectedArmorId] = useState<string | null>(null);
  const [armorFilter, setArmorFilter] = useState<ArmorFilter>("all");
  const isBusy = isOpeningBox || pendingArmorId !== null || isUnequipping || sellingArmorId !== null;

  async function loadArmors() {
    setIsLoading(true);
    const result = await getMyArmors();
    setIsLoading(false);
    if (!result.ok) { setMessage(result.message); return; }
    setArmors(result.inventory.armors);
    setEquippedArmorId(result.inventory.equippedArmorId);
    onEquippedArmorChange(result.inventory.armors.find((armor) => armor.id === result.inventory.equippedArmorId) ?? null);
  }

  useEffect(() => { void loadArmors(); }, [character.id, refreshKey]);

  async function handleOpenBox() {
    setIsOpeningBox(true); setMessage("");
    const result = await openArmorBox();
    setIsOpeningBox(false);
    if (!result.ok || !result.armor) { setMessage(result.message || "방어구 상자를 열지 못했습니다."); return; }
    if (result.character) onCharacterChange(result.character);
    setOpenedArmor(result.armor);
    showToast(toastMessages.equipment.armorFound(armorLabel(result.armor)));
    await loadArmors();
  }

  async function handleEquip(armor: Armor) {
    setPendingArmorId(armor.id); setMessage("");
    const result = await equipArmor(armor.id);
    setPendingArmorId(null);
    if (!result.ok) { setMessage(result.message); return; }
    setArmors(result.inventory.armors); setEquippedArmorId(result.inventory.equippedArmorId);
    onEquippedArmorChange(result.inventory.armors.find((candidate) => candidate.id === result.inventory.equippedArmorId) ?? null);
    showToast(toastMessages.equipment.armorEquipped(armorLabel(armor)));
  }

  async function handleUnequip() {
    setIsUnequipping(true); setMessage("");
    const result = await unequipArmor();
    setIsUnequipping(false);
    if (!result.ok) { setMessage(result.message); return; }
    setArmors(result.inventory.armors); setEquippedArmorId(null); onEquippedArmorChange(null);
    showToast(toastMessages.equipment.armorUnequipped());
  }

  async function handleSell(armor: Armor) {
    setSellingArmorId(armor.id); setMessage("");
    const result = await sellArmor(armor.id);
    setSellingArmorId(null);
    if (!result.ok) { setMessage(result.message); return; }
    if (result.character) onCharacterChange(result.character);
    setArmors((current) => current.filter((candidate) => candidate.id !== armor.id));
    setOpenedArmor((current) => current?.id === armor.id ? null : current);
    setSelectedArmorId(null);
    showToast(toastMessages.equipment.armorSold(result.gainedCredits));
  }

  const equippedArmor = armors.find((armor) => armor.id === equippedArmorId) ?? null;
  const filteredArmors = armors.filter((armor) => armorFilter === "all" || armor.armorType === armorFilter)
    .sort((left, right) => right.armorLevel - left.armorLevel || right.createdAt.localeCompare(left.createdAt));

  return <>
    <article className="panel">
      <div className="panel-head action-head"><div><span>BOX</span><h2>방어구 상자</h2></div><div className="box-open-action"><button className="btn primary" type="button" onClick={handleOpenBox} disabled={isBusy || character.credits < 100}>{isOpeningBox ? "개봉 중..." : "방어구 상자 개봉"}</button><small className={character.credits < 100 ? "is-insufficient" : ""}>100 CR</small></div></div>
      <div className="panel-action-body"><p className="panel-message">방어구 1개를 무작위로 획득합니다.</p>
        {openedArmor && <div className="weapon-box-result" role="status"><span>획득 방어구</span><strong>{armorLabel(openedArmor)}</strong><small>{armorEffect(openedArmor, character)}</small><div className="button-row equipment-actions">{openedArmor.id === equippedArmorId ? <span className="weapon-equipped-note">장착 중인 방어구는 판매할 수 없습니다.</span> : <><button className="btn primary" type="button" disabled={isBusy} onClick={() => handleEquip(openedArmor)}>{pendingArmorId === openedArmor.id ? "장착 중..." : "장착"}</button><div className="weapon-sale-action"><button className="btn ghost" type="button" disabled={isBusy} onClick={() => handleSell(openedArmor)}>{sellingArmorId === openedArmor.id ? "판매 중..." : "판매"}</button><small>20 CR</small></div></>}</div></div>}
      </div>
    </article>
    <article className="panel">
      <div className="panel-head"><span>INVENTORY</span><h2>보유 방어구</h2><div className="weapon-filter-list" role="group" aria-label="방어구 종류 필터"><button className={`weapon-filter ${armorFilter === "all" ? "is-active" : ""}`} type="button" onClick={() => setArmorFilter("all")} disabled={isBusy}>전체 {armors.length}</button>{(Object.keys(armorNames) as ArmorType[]).map((type) => <button className={`weapon-filter ${armorFilter === type ? "is-active" : ""}`} type="button" onClick={() => setArmorFilter(type)} disabled={isBusy} key={type}>{armorNames[type]}</button>)}</div></div>
      {isLoading ? <p className="panel-message">방어구를 불러오는 중...</p> : armors.length === 0 ? <p className="panel-message">보유한 방어구가 없습니다.</p> : filteredArmors.length === 0 ? <p className="panel-message">조건에 맞는 방어구가 없습니다.</p> : <div className="weapon-list">{filteredArmors.map((armor) => {
        const isSelected = armor.id === selectedArmorId; const isEquipped = armor.id === equippedArmorId;
        return <article className={`weapon-entry ${isSelected ? "is-open" : ""} ${isEquipped ? "is-equipped" : ""}`} key={armor.id}><button className="weapon-row" type="button" onClick={() => setSelectedArmorId(isSelected ? null : armor.id)} aria-expanded={isSelected}><div className="weapon-row-title"><strong>{armorLabel(armor)}</strong><small>{armorSummary(armor)}</small></div><span>{isEquipped ? "장착 중" : "상세"}</span></button>{isSelected && <div className="weapon-detail"><div className="weapon-detail-info"><span>효과</span><strong>{armorEffect(armor, character)}</strong></div><div className="button-row">{!isEquipped && <button className="btn primary" type="button" disabled={isBusy} onClick={() => handleEquip(armor)}>{pendingArmorId === armor.id ? "장착 중..." : "장착"}</button>}{isEquipped ? <><button className="btn ghost" type="button" disabled={isBusy} onClick={handleUnequip}>{isUnequipping ? "해제 중..." : "해제"}</button><span className="weapon-equipped-note">장착 중인 방어구는 판매할 수 없습니다.</span></> : <div className="weapon-sale-action"><button className="btn ghost" type="button" disabled={isBusy} onClick={() => handleSell(armor)}>{sellingArmorId === armor.id ? "판매 중..." : "판매"}</button><small>20 CR</small></div>}</div></div>}</article>;
      })}</div>}
      {message && <p className="auth-message is-error" role="status">{message}</p>}
    </article>
  </>;
}
