import { useEffect, useMemo, useState } from "react";
import { equipEssence, getMyEssences, unequipEssence } from "../../api/essenceApi";
import type { Essence } from "../../api/essenceApi";
import { toastMessages } from "../../shared/toastMessages";
import { useDocumentTitle } from "../../shared/useDocumentTitle";
import type { Character } from "../../types/character";
import { useToast } from "../toast/ToastProvider";

const slotIndexes = [1, 2, 3];

const ESSENCE_DETAILS: Record<string, { summary: string; effects: string[] }> = {
  "angry-boar-might": { summary: "다음 일반 공격 강화", effects: ["CD 8.0초 · 다음 일반 공격 피해 +60%", "CD 4.5초 · 다음 일반 공격 피해 +90%", "CD 4.5초 · 다음 일반 공격 피해 +180%", "CD 3.5초 · 다음 일반 공격 피해 +220%", "CD 3.2초 · 다음 일반 공격 피해 +260%"] },
  "forest-wolf-flurry": { summary: "일반 공격 추가타", effects: ["CD 9.0초 · 4초 동안 일반 공격 시 30% 추가타", "CD 5.0초 · 4초 동안 일반 공격 시 40% 추가타", "CD 5.0초 · 4초 동안 일반 공격 시 80% 추가타", "CD 4.0초 · 4초 동안 일반 공격 시 95% 추가타", "CD 4.0초 · 5초 동안 일반 공격 시 110% 추가타"] },
  "firefly-spirit-ember": { summary: "즉시 마법 피해", effects: ["CD 5.0초 · 마법 공격력 60% 피해", "CD 2.5초 · 마법 공격력 80% 피해", "CD 2.5초 · 마법 공격력 160% 피해", "CD 2.0초 · 마법 공격력 180% 피해", "CD 2.0초 · 마법 공격력 220% 피해"] },
  "stone-beetle-stonehide": { summary: "방어막", effects: ["CD 9.0초 · 4초 동안 최대 HP 8% 방어막", "CD 5.0초 · 4초 동안 최대 HP 10% 방어막", "CD 5.0초 · 4초 동안 최대 HP 20% 방어막", "CD 4.0초 · 4초 동안 최대 HP 24% 방어막", "CD 4.0초 · 5초 동안 최대 HP 28% 방어막"] },
  "forest-warden-stag-charge": { summary: "돌진 및 잃은 HP 회복", effects: ["CD 8.0초 · 물리 공격력 100% 피해 · 잃은 HP 5% 회복", "CD 5.0초 · 물리 공격력 130% 피해 · 잃은 HP 7% 회복", "CD 5.0초 · 물리 공격력 220% 피해 · 잃은 HP 10% 회복", "CD 4.0초 · 물리 공격력 260% 피해 · 잃은 HP 12% 회복", "CD 4.0초 · 물리 공격력 320% 피해 · 잃은 HP 14% 회복"] },
  "green-viper-fang": { summary: "독 지속 피해", effects: ["CD 7.0초 · 물리 50% 피해 · 4초 독", "CD 4.5초 · 물리 60% 피해 · 4초 독", "CD 4.5초 · 물리 90% 피해 · 5초 독", "CD 3.8초 · 물리 110% 피해 · 5초 독", "CD 3.8초 · 물리 130% 피해 · 6초 독"] },
  "vine-hunter-bind": { summary: "마법 속박", effects: ["CD 8.0초 · 마법 공격력 60% 피해", "CD 5.0초 · 마법 공격력 80% 피해", "CD 5.0초 · 마법 공격력 140% 피해", "CD 4.0초 · 마법 공격력 170% 피해", "CD 4.0초 · 마법 공격력 210% 피해"] },
  "moss-slime-regeneration": { summary: "잃은 HP 재생", effects: ["패시브 · 매초 잃은 HP 2% 회복", "패시브 · 매초 잃은 HP 4% 회복", "패시브 · 매초 잃은 HP 8% 회복", "패시브 · 매초 잃은 HP 10% 회복", "패시브 · 매초 잃은 HP 12% 회복"] },
  "leafshade-panther-counter": { summary: "회피 후 반격 강화", effects: ["패시브 · 회피 후 다음 일반 공격 +60%", "패시브 · 회피 후 다음 일반 공격 +120%", "패시브 · 회피 후 다음 일반 공격 +240%", "패시브 · 회피 후 다음 일반 공격 +300%", "패시브 · 회피 후 다음 일반 공격 +360%"] },
  "redthorn-beast-spines": { summary: "가시 추가 피해", effects: ["CD 8.0초 · 4초 동안 가시 15%", "CD 5.0초 · 4초 동안 가시 25%", "CD 5.0초 · 4초 동안 가시 50%", "CD 4.0초 · 4초 동안 가시 60%", "CD 4.0초 · 5초 동안 가시 75%"] },
  "blackneedle-bat-leech": { summary: "흡혈 물리 피해", effects: ["CD 7.0초 · 물리 70% 피해 · 피해의 20% 흡혈", "CD 4.5초 · 물리 90% 피해 · 피해의 25% 흡혈", "CD 4.5초 · 물리 180% 피해 · 피해의 30% 흡혈", "CD 3.8초 · 물리 220% 피해 · 피해의 35% 흡혈", "CD 3.8초 · 물리 260% 피해 · 피해의 40% 흡혈"] },
  "bigeye-bat-night-sight": { summary: "명중률 보정", effects: ["패시브 · 명중률 +5%", "패시브 · 명중률 +10%", "패시브 · 명중률 +18%", "패시브 · 명중률 +22%", "패시브 · 명중률 +28%"] },
  "blade-beetle-edge": { summary: "일반 공격 출혈", effects: ["CD 8.0초 · 5초 동안 출혈 15%", "CD 5.0초 · 5초 동안 출혈 25%", "CD 5.0초 · 5초 동안 출혈 45%", "CD 4.0초 · 5초 동안 출혈 55%", "CD 4.0초 · 6초 동안 출혈 65%"] },
  "crystal-lizard-refraction": { summary: "마법 추가 피해", effects: ["CD 8.0초 · 4초 동안 마법 추가 피해 15%", "CD 5.0초 · 4초 동안 마법 추가 피해 25%", "CD 5.0초 · 4초 동안 마법 추가 피해 50%", "CD 4.0초 · 4초 동안 마법 추가 피해 60%", "CD 4.0초 · 5초 동안 마법 추가 피해 75%"] },
  "crystaljaw-centipede-crush": { summary: "방어막 파쇄", effects: ["CD 8.0초 · 물리 공격력 100% 피해", "CD 5.0초 · 물리 공격력 130% 피해", "CD 5.0초 · 물리 공격력 240% 피해", "CD 4.0초 · 물리 공격력 280% 피해", "CD 4.0초 · 물리 공격력 340% 피해"] },
  "cave-vampire-bat-bloodcry": { summary: "흡혈 물리 피해", effects: ["CD 8.0초 · 물리 80% 피해 · 피해의 15% 흡혈", "CD 5.0초 · 물리 100% 피해 · 피해의 20% 흡혈", "CD 5.0초 · 물리 190% 피해 · 피해의 25% 흡혈", "CD 4.0초 · 물리 230% 피해 · 피해의 30% 흡혈", "CD 4.0초 · 물리 280% 피해 · 피해의 35% 흡혈"] },
};

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
  const isBusy = pendingAction !== null;

  return (
    <section className="screen-panel">
      <article className="panel">
        <div className="panel-head">
          <span>ESSENCE SLOTS</span>
          <h2>장착 정수</h2>
        </div>
        <div className="hunt-result-summary">
          {slots.map(({ slotIndex, essence, isLocked }) => (
            <div key={slotIndex}>
              <span>SLOT {slotIndex}</span>
              <strong>{isLoading ? "정수 불러오는 중..." : isLocked ? `${getSlotUnlockLevel(slotIndex)} 해금` : essence ? `${essence.name} ${formatGrade(essence.grade)}` : "비어 있음"}</strong>
              {!isLoading && !isLocked && essence && <button className="text-button" type="button" disabled={isBusy} onClick={() => void handleUnequip(slotIndex)}>{pendingAction === `unequip:${slotIndex}` ? "해제 중..." : "해제"}</button>}
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

function formatGrade(grade: number) {
  return ["", "I", "II", "III", "IV", "V"][grade] ?? `${grade}`;
}

function getUnlockedSlotCount(level: number) {
  if (level >= 30) return 3;
  if (level >= 10) return 2;
  return 1;
}

function getSlotUnlockLevel(slotIndex: number) {
  return slotIndex === 2 ? "LV.10" : "LV.30";
}

function getEssenceSummary(essence: Essence) {
  return ESSENCE_DETAILS[essence.code]?.summary ?? "정수 효과";
}

function getEssenceEffect(essence: Essence) {
  return ESSENCE_DETAILS[essence.code]?.effects[essence.grade - 1] ?? "정수 효과를 전투 중 자동 사용합니다.";
}
