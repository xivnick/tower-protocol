import { useEffect, useMemo, useState } from "react";
import { equipEssence, getMyEssences, unequipEssence } from "../../api/essenceApi";
import type { Essence } from "../../api/essenceApi";
import { toastMessages } from "../../shared/toastMessages";
import { useDocumentTitle } from "../../shared/useDocumentTitle";
import type { Character } from "../../types/character";
import { useToast } from "../toast/ToastProvider";

const slotIndexes = [1, 2, 3];

export function EssenceScreen({ character }: { character: Character | null }) {
  useDocumentTitle("TOWER://ESSENCE");
  const { showToast } = useToast();
  const [essences, setEssences] = useState<Essence[]>([]);
  const [selectedEssenceId, setSelectedEssenceId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [pendingAction, setPendingAction] = useState<string | null>(null);

  const slots = useMemo(() => slotIndexes.map((slotIndex) => ({
    slotIndex,
    essence: essences.find((essence) => essence.equippedSlotIndex === slotIndex) ?? null,
  })), [essences]);

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
  const isBusy = pendingAction !== null;

  return (
    <section className="screen-panel">
      <article className="panel">
        <div className="panel-head">
          <span>ESSENCE SLOTS</span>
          <h2>장착 정수</h2>
        </div>
        <div className="hunt-result-summary">
          {slots.map(({ slotIndex, essence }) => (
            <div key={slotIndex}>
              <span>SLOT {slotIndex}</span>
              <strong>{isLoading ? "정수 불러오는 중..." : essence ? `${essence.name} ${formatGrade(essence.grade)}` : "비어 있음"}</strong>
              {!isLoading && essence && <button className="text-button" type="button" disabled={isBusy} onClick={() => void handleUnequip(slotIndex)}>{pendingAction === `unequip:${slotIndex}` ? "해제 중..." : "해제"}</button>}
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
            {essences.map((essence) => {
              const isSelected = essence.id === selectedEssence?.id;
              return (
                <article className={`weapon-entry ${isSelected ? "is-open" : ""} ${essence.equippedSlotIndex ? "is-equipped" : ""}`} key={essence.id}>
                  <button className="weapon-row" type="button" onClick={() => setSelectedEssenceId(isSelected ? null : essence.id)} aria-expanded={isSelected}>
                    <div className="weapon-row-title">
                      <strong>{essence.name} {formatGrade(essence.grade)}</strong>
                      <small>{getEssenceSummary(essence)}</small>
                    </div>
                    <span>{essence.equippedSlotIndex ? `SLOT ${essence.equippedSlotIndex}` : `x${essence.quantity}`}</span>
                  </button>
                  {isSelected && <div className="weapon-detail">
                    <div className="weapon-detail-info"><span>효과</span><strong>{getEssenceEffect(essence)}</strong></div>
                    <div className="button-row">
                      {slotIndexes.map((slotIndex) => (
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

function formatGrade(grade: number) {
  return ["", "I", "II", "III", "IV", "V"][grade] ?? `${grade}`;
}

function getEssenceSummary(essence: Essence) {
  if (essence.code === "angry-boar-might") return "다음 일반 공격 강화";
  if (essence.code === "forest-wolf-flurry") return "일반 공격 추가타";
  if (essence.code === "firefly-spirit-ember") return "즉시 마법 피해";
  if (essence.code === "stone-beetle-stonehide") return "방어막";
  return "정수 효과";
}

function getEssenceEffect(essence: Essence) {
  if (essence.code === "angry-boar-might") return "CD 8.0초 · 다음 일반 공격 피해 +60%";
  if (essence.code === "forest-wolf-flurry") return "CD 9.0초 · 4초 동안 일반 공격 시 30% 추가타";
  if (essence.code === "firefly-spirit-ember") return "CD 5.0초 · 마법 공격력 60% 피해";
  if (essence.code === "stone-beetle-stonehide") return "CD 9.0초 · 4초 동안 최대 HP 8% 방어막";
  return "정수 효과를 전투 중 자동 사용합니다.";
}
