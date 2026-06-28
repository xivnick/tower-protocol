import { useEffect, useMemo, useState } from "react";
import { equipEssence, getMyEssences, unequipEssence } from "../../api/essenceApi";
import type { Essence } from "../../api/essenceApi";
import { toastMessages } from "../../shared/toastMessages";
import { useDocumentTitle } from "../../shared/useDocumentTitle";
import type { Character } from "../../types/character";
import { useToast } from "../toast/ToastProvider";
import { getEssenceEffect, getEssenceSummary } from "../../shared/essenceDetails";

const slotIndexes = [1, 2, 3];

export function EssenceScreen({ character }: { character: Character | null }) {
  useDocumentTitle("TOWER://ESSENCE");
  const { showToast } = useToast();
  const [essences, setEssences] = useState<Essence[]>([]);
  const [selectedEssenceId, setSelectedEssenceId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const unlockedSlotCount = getUnlockedSlotCount(character?.level ?? 1);

  const slots = useMemo(() => slotIndexes.map((slotIndex) => ({
    slotIndex,
    essence: essences.find((essence) => essence.equippedSlotIndex === slotIndex) ?? null,
    isLocked: slotIndex > unlockedSlotCount,
  })), [essences, unlockedSlotCount]);

  async function loadEssences() {
    setIsLoading(true);
    setMessage("");
    const result = await getMyEssences();
    setIsLoading(false);
    if (!result.ok) {
      setMessage(result.message);
      return;
    }
    setEssences(result.inventory.essences);
  }

  useEffect(() => {
    if (character) void loadEssences();
  }, [character?.id]);

  async function handleEquip(essence: Essence, slotIndex: number) {
    setPendingAction(`${essence.id}:${slotIndex}`);
    setMessage("");
    const result = await equipEssence(essence.id, slotIndex);
    setPendingAction(null);
    if (!result.ok) {
      setMessage(result.message);
      return;
    }
    setEssences(result.inventory.essences);
    setSelectedEssenceId(essence.id);
    showToast(toastMessages.essence.equipped(essence.name, slotIndex));
  }

  async function handleUnequip(slotIndex: number) {
    setPendingAction(`unequip:${slotIndex}`);
    setMessage("");
    const result = await unequipEssence(slotIndex);
    setPendingAction(null);
    if (!result.ok) {
      setMessage(result.message);
      return;
    }
    setEssences(result.inventory.essences);
    showToast(toastMessages.essence.unequipped(slotIndex));
  }

  if (!character) return <section className="screen-panel"><article className="panel"><p className="panel-message">캐릭터를 먼저 생성해주세요.</p></article></section>;

  const selectedEssence = essences.find((essence) => essence.id === selectedEssenceId) ?? essences[0] ?? null;
  const sortedEssences = useMemo(() => [...essences].sort((left, right) => getEssenceMonsterOrder(left.code) - getEssenceMonsterOrder(right.code) || left.createdAt.localeCompare(right.createdAt)), [essences]);
  const isBusy = pendingAction !== null;

  return (
    <section className="screen-panel">
      <article className="panel">
        <div className="panel-head action-head">
          <div><span>EQUIPPED</span><h2>장착 중인 정수</h2></div>
        </div>
        <div className="equipped-summary">
          {slots.map(({ slotIndex, essence, isLocked }) => (
            <div className="equipped-summary-row" key={slotIndex}>
              <span>SLOT {slotIndex}</span>
              {isLocked ? <strong>{getSlotUnlockLevel(slotIndex)} 해금</strong> : essence ? (
                <div className="equipped-summary-content">
                  <strong><span className="equipped-summary-title"><b>{essence.name} {formatGrade(essence.grade)}</b>{!isLoading && <button className="text-button" type="button" disabled={isBusy} onClick={() => void handleUnequip(slotIndex)}>{pendingAction === `unequip:${slotIndex}` ? "해제 중..." : "해제"}</button>}</span><small>{getEssenceEffect(essence)}</small></strong>
                </div>
              ) : <strong>{isLoading ? "정수 불러오는 중..." : "장착한 정수 없음"}</strong>}
            </div>
          ))}
        </div>
      </article>

      <article className="panel">
        <div className="panel-head">
          <span>INVENTORY</span>
          <h2>보유 정수</h2>
        </div>
        {isLoading ? <p className="panel-message">정수를 불러오는 중...</p> : essences.length === 0 ? <p className="panel-message">보유한 정수가 없습니다.</p> : (
          <div className="weapon-list">
            {sortedEssences.map((essence) => {
              const isSelected = essence.id === selectedEssence?.id;
              return (
                <article className={`weapon-entry ${isSelected ? "is-open" : ""} ${essence.equippedSlotIndex ? "is-equipped" : ""}`} key={essence.id}>
                  <button className="weapon-row" type="button" onClick={() => setSelectedEssenceId(isSelected ? null : essence.id)} aria-expanded={isSelected}>
                    <div className="weapon-row-title">
                      <strong>{essence.name} {formatGrade(essence.grade)}</strong>
                      <small>{getEssenceSummary(essence)}</small>
                    </div>
                    <span>x{essence.quantity}</span>
                  </button>
                  {isSelected && <div className="weapon-detail">
                    <div className="weapon-detail-info"><span>효과</span><strong>{getEssenceEffect(essence)}</strong></div>
                    <div className="button-row">
                      {slotIndexes.filter((slotIndex) => slotIndex <= unlockedSlotCount).map((slotIndex) => (
                        <button className="btn primary" type="button" disabled={isBusy} onClick={() => void handleEquip(essence, slotIndex)} key={slotIndex}>
                          {pendingAction === `${essence.id}:${slotIndex}` ? "장착 중..." : `SLOT ${slotIndex}`}
                        </button>
                      ))}
                    </div>
                  </div>}
                </article>
              );
            })}
          </div>
        )}
        {message && <p className="auth-message is-error" role="status">{message}</p>}
      </article>
    </section>
  );
}

export function formatGrade(grade: number) {
  return ["", "I", "II", "III", "IV", "V"][grade] ?? `${grade}`;
}

export function getUnlockedSlotCount(level: number) {
  if (level >= 30) return 3;
  if (level >= 10) return 2;
  return 1;
}

export function getSlotUnlockLevel(slotIndex: number) {
  return slotIndex === 2 ? "LV.10" : "LV.30";
}

function getEssenceMonsterOrder(code: string) {
  const order = [
    "angry-boar-might", "forest-wolf-flurry", "firefly-spirit-ember", "stone-beetle-stonehide",
    "forest-warden-stag-charge", "green-viper-fang", "vine-hunter-bind", "moss-slime-regeneration",
    "leafshade-panther-counter", "redthorn-beast-spines", "blackneedle-bat-leech", "bigeye-bat-night-sight",
    "blade-beetle-edge", "crystal-lizard-refraction", "crystaljaw-centipede-crush", "cave-vampire-bat-bloodcry",
  ];
  const index = order.indexOf(code);
  return index < 0 ? Number.MAX_SAFE_INTEGER : index;
}
