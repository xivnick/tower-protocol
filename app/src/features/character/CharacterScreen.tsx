import type { FormEvent } from "react";
import { useEffect, useRef, useState } from "react";
import { allocateCharacterStats, checkCharacterNameAvailability, createMyCharacter, deleteMyCharacter, resetCharacterStats, trainMyCharacter } from "../../api/characterApi";
import type { CharacterStatAllocation, TrainingRewardTier } from "../../api/characterApi";
import { useDocumentTitle } from "../../shared/useDocumentTitle";
import { formatCharacterExperience, formatCharacterLevel } from "../../shared/progression";
import { BASE_PRIMARY_STAT, calculateCombatStats, PRIMARY_STATS } from "../../shared/stats";
import { getCharacterNameValidationMessage, validateCharacterName } from "../../shared/validation";
import type { Character } from "../../types/character";
import type { ToastInput, ToastTone } from "../../types/toast";

export function CharacterScreen({
  character,
  onCharacterChange,
  onToast,
}: {
  character: Character | null;
  onCharacterChange: (character: Character | null) => void;
  onToast: (toast: ToastInput) => void;
}) {
  useDocumentTitle("TOWER://CHARACTER");

  if (character) {
    return (
      <section className="screen-panel">
        <article className="panel">
          <div className="panel-head">
            <span>CHARACTER</span>
            <h2>캐릭터 정보</h2>
          </div>
          <div className="kv-grid">
            <Kv label="이름" value={character.name} />
            <Kv label="레벨" value={formatCharacterLevel(character.level)} />
            <Kv label="경험치" value={formatCharacterExperience(character.level, character.experience)} />
          </div>
        </article>

        <CharacterStatsPanel character={character} onCharacterChange={onCharacterChange} onToast={onToast} />
        <CharacterTrainingPanel character={character} onCharacterChange={onCharacterChange} onToast={onToast} />
        <CharacterDeletePanel character={character} onCharacterChange={onCharacterChange} onToast={onToast} />
      </section>
    );
  }

  return <CharacterCreatePanel onCharacterChange={onCharacterChange} />;
}

function CharacterCreatePanel({ onCharacterChange }: { onCharacterChange: (character: Character) => void }) {
  const [name, setName] = useState("");
  const [hint, setHint] = useState("");
  const [hintType, setHintType] = useState<"is-ok" | "is-error" | "">("");
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"info" | "error">("info");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const requestIdRef = useRef(0);
  const trimmedName = name.trim();
  const nameValidationMessage = name ? getCharacterNameValidationMessage(name) : "";
  const canSubmit = !isSubmitting
    && trimmedName.length > 0
    && !nameValidationMessage
    && hintType !== "is-error";

  useEffect(() => {
    window.clearTimeout(requestIdRef.current);

    if (!name) {
      setHint("");
      setHintType("");
      return;
    }

    if (!validateCharacterName(name)) {
      setHint(getCharacterNameValidationMessage(name));
      setHintType("is-error");
      return;
    }

    const requestId = window.setTimeout(async () => {
      setHint("캐릭터 이름 확인 중...");
      setHintType("");
      const result = await checkCharacterNameAvailability(name);
      setHint(result.message);
      setHintType(result.ok && result.available ? "is-ok" : "is-error");
    }, 350);

    requestIdRef.current = requestId;
    return () => window.clearTimeout(requestId);
  }, [name]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!validateCharacterName(trimmedName)) {
      setMessage(getCharacterNameValidationMessage(trimmedName));
      setMessageType("error");
      return;
    }

    const availability = await checkCharacterNameAvailability(trimmedName);

    if (!availability.ok || !availability.available) {
      setMessage(availability.message);
      setMessageType("error");
      return;
    }

    setIsSubmitting(true);
    setMessage("캐릭터 생성 중...");
    setMessageType("info");

    const result = await createMyCharacter(trimmedName);

    setIsSubmitting(false);

    if (!result.ok || !result.character) {
      setMessage(result.message);
      setMessageType("error");
      return;
    }

    onCharacterChange(result.character);
  }

  return (
    <section className="screen-panel">
      <article className="panel">
        <div className="panel-head">
          <span>CHARACTER</span>
          <h2>캐릭터 생성</h2>
        </div>
        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          <label htmlFor="characterNameInput">
            <span>캐릭터 이름</span>
            <input
              id="characterNameInput"
              name="characterName"
              type="text"
              autoComplete="off"
              maxLength={16}
              placeholder="2-16자, 한글/영문/숫자/_"
              value={name}
              onChange={(event) => {
                setName(event.target.value);
                setMessage("");
              }}
              required
              disabled={isSubmitting}
            />
            <small className={`field-hint ${hintType}`} aria-live="polite">{hint}</small>
          </label>
          <button className="btn primary" type="submit" disabled={!canSubmit}>
            {isSubmitting ? "생성 중..." : "캐릭터 생성"}
          </button>
        </form>
        {message && <p className={`auth-message ${messageType === "error" ? "is-error" : ""}`} role="status">{message}</p>}
      </article>
    </section>
  );
}

function CharacterStatsPanel({
  character,
  onCharacterChange,
  onToast,
}: {
  character: Character;
  onCharacterChange: (character: Character | null) => void;
  onToast: (toast: ToastInput) => void;
}) {
  const [pendingStats, setPendingStats] = useState<CharacterStatAllocation>(createEmptyStatAllocation());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [message, setMessage] = useState("");
  const pendingTotal = getPendingTotal(pendingStats);
  const remainingPoints = character.stat_points - pendingTotal;
  const previewCharacter = applyPendingStats(character, pendingStats);
  const currentCombatStats = calculateCombatStats(character);
  const previewCombatStats = calculateCombatStats(previewCharacter);
  const canApply = pendingTotal > 0 && !isSubmitting && !isResetting;
  const canReset = hasAllocatedStats(character) && !isSubmitting && !isResetting;

  useEffect(() => {
    setPendingStats(createEmptyStatAllocation());
    setMessage("");
  }, [character.id, character.stat_points]);

  function changePendingStat(statKey: keyof CharacterStatAllocation, amount: number) {
    setMessage("");
    setPendingStats((current) => {
      const nextValue = current[statKey] + amount;

      if (nextValue < 0) {
        return current;
      }

      if (amount > 0 && getPendingTotal(current) + amount > character.stat_points) {
        return current;
      }

      return { ...current, [statKey]: nextValue };
    });
  }

  async function handleApply() {
    if (!canApply) {
      return;
    }

    setIsSubmitting(true);
    setMessage("");

    const result = await allocateCharacterStats(pendingStats);

    setIsSubmitting(false);

    if (!result.ok || !result.character) {
      setMessage(result.message);
      return;
    }

    onCharacterChange(result.character);
    onToast({ message: `스탯 적용 -${pendingTotal}P`, tone: "system" });
  }

  async function handleResetStats() {
    if (!canReset) {
      return;
    }

    setIsResetting(true);
    setMessage("");

    const result = await resetCharacterStats();

    setIsResetting(false);

    if (!result.ok || !result.character) {
      setMessage(result.message);
      return;
    }

    onCharacterChange(result.character);
    onToast({ message: "스탯 초기화", tone: "system" });
  }

  return (
    <article className="panel">
      <div className="panel-head">
        <span>STATS</span>
        <h2>스탯</h2>
      </div>
      <div className="stat-meter-row">
        <span>미분배 {remainingPoints.toLocaleString()}P</span>
        <span>예정 {pendingTotal.toLocaleString()}P</span>
      </div>
      <div className="stat-list">
        {PRIMARY_STATS.map((stat) => {
          const pendingValue = pendingStats[stat.key];
          const currentValue = character[stat.key];
          const previewValue = currentValue + pendingValue;
          return (
            <div className="stat-row" key={stat.key}>
              <div>
                <strong>{stat.label}</strong>
              </div>
              <div className="stat-controls">
                <button className="icon-button" type="button" onClick={() => changePendingStat(stat.key, -1)} disabled={isSubmitting || isResetting || pendingValue <= 0} aria-label={`${stat.label} 1 감소`}>
                  -1
                </button>
                <span className={`stat-value ${pendingValue > 0 ? "is-changed" : ""}`}>
                  {pendingValue > 0 ? <small>{currentValue.toLocaleString()}</small> : null}
                  {pendingValue > 0 ? <i aria-hidden="true">-&gt;</i> : null}
                  <b>{previewValue.toLocaleString()}</b>
                </span>
                <button className="icon-button" type="button" onClick={() => changePendingStat(stat.key, 1)} disabled={isSubmitting || isResetting || remainingPoints < 1} aria-label={`${stat.label} 1 증가`}>
                  +1
                </button>
              </div>
            </div>
          );
        })}
      </div>
      <div className="button-row stat-actions">
        <button className="btn ghost" type="button" onClick={() => setPendingStats(createEmptyStatAllocation())} disabled={isSubmitting || isResetting || pendingTotal === 0}>
          배분 취소
        </button>
        <button className="btn primary" type="button" onClick={handleApply} disabled={!canApply}>
          {isSubmitting ? "적용 중..." : "적용"}
        </button>
      </div>

      <div className="combat-stat-grid">
        <CombatStat label="물리 공격력" shortLabel="물공" current={currentCombatStats.physicalAttack} preview={previewCombatStats.physicalAttack} />
        <CombatStat label="마법 공격력" shortLabel="마공" current={currentCombatStats.magicAttack} preview={previewCombatStats.magicAttack} />
        <CombatStat label="물리 방어" shortLabel="물방" current={currentCombatStats.physicalDefense} preview={previewCombatStats.physicalDefense} />
        <CombatStat label="마법 방어" shortLabel="마방" current={currentCombatStats.magicDefense} preview={previewCombatStats.magicDefense} />
        <CombatStat label="최대 체력" shortLabel="체력" current={currentCombatStats.maxHp} preview={previewCombatStats.maxHp} />
        <CombatStat label="재생" current={currentCombatStats.hpRegenPerSecond} preview={previewCombatStats.hpRegenPerSecond} digits={2} />
        <CombatStat label="공속" current={currentCombatStats.attacksPerSecond} preview={previewCombatStats.attacksPerSecond} digits={2} />
        <CombatStat label="쿨타임 감소" shortLabel="쿨감" current={currentCombatStats.cooldownReduction * 100} preview={previewCombatStats.cooldownReduction * 100} suffix="%" digits={1} />
        <CombatStat label="명중" shortLabel="명중" current={currentCombatStats.accuracy} preview={previewCombatStats.accuracy} />
        <CombatStat label="회피" shortLabel="회피" current={currentCombatStats.evasion} preview={previewCombatStats.evasion} />
        <CombatStat label="치명타 확률" shortLabel="치확" current={currentCombatStats.criticalChance} preview={previewCombatStats.criticalChance} suffix="%" digits={1} />
        <CombatStat label="치명타 피해" shortLabel="치피" current={currentCombatStats.criticalDamage} preview={previewCombatStats.criticalDamage} suffix="%" />
      </div>
      <div className="stat-reset-area">
        <button className="btn ghost" type="button" onClick={handleResetStats} disabled={!canReset}>
          {isResetting ? "초기화 중..." : "스탯 초기화"}
        </button>
        <small>비용 무료</small>
      </div>
      {message && <p className="auth-message is-error" role="status">{message}</p>}
    </article>
  );
}

function CharacterTrainingPanel({
  character,
  onCharacterChange,
  onToast,
}: {
  character: Character;
  onCharacterChange: (character: Character | null) => void;
  onToast: (toast: ToastInput) => void;
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const isMaxLevel = character.level >= 100;

  async function handleTrain() {
    if (isSubmitting || isMaxLevel) {
      return;
    }

    setIsSubmitting(true);
    setMessage("");

    const [result] = await Promise.all([
      trainMyCharacter(),
      wait(400),
    ]);

    setIsSubmitting(false);

    if (!result.ok || !result.character) {
      setMessage(result.message);
      return;
    }

    onCharacterChange(result.character);
    onToast(formatTrainingToast(result.gainedExperience, result.rewardTier));

    if (result.levelAfter > result.levelBefore) {
      window.setTimeout(() => {
        onToast({ message: `레벨업! -> LV.${result.levelAfter}`, tone: "epic" });
      }, 300);
    }
  }

  return (
    <article className="panel">
      <div className="panel-head">
        <span>TRAINING</span>
        <h2>기초 훈련</h2>
      </div>
      <div className="panel-action-body">
        <p className="panel-message">{isMaxLevel ? "최고 레벨에 도달했습니다." : "훈련을 실행하면 경험치를 획득합니다."}</p>
        <button className="btn primary panel-primary-action" type="button" onClick={handleTrain} disabled={isSubmitting || isMaxLevel}>
          {isSubmitting ? "훈련 중..." : "훈련 실행"}
        </button>
        {message && <p className="auth-message is-error" role="status">{message}</p>}
      </div>
    </article>
  );
}

function formatTrainingToast(gainedExperience: number, rewardTier: TrainingRewardTier): ToastInput {
  const label = rewardTier === "great" ? "훈련 대성공" : rewardTier === "good" ? "훈련 성공" : "훈련 완료";
  return {
    message: `${label} +${gainedExperience.toLocaleString()} EXP`,
    tone: getTrainingRewardTone(rewardTier),
  };
}

function getTrainingRewardTone(rewardTier: TrainingRewardTier): ToastTone {
  if (rewardTier === "great") return "rare";
  if (rewardTier === "good") return "uncommon";
  return "common";
}

function wait(ms: number) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function createEmptyStatAllocation(): CharacterStatAllocation {
  return {
    strength: 0,
    agility: 0,
    dexterity: 0,
    vitality: 0,
    endurance: 0,
    intelligence: 0,
    wisdom: 0,
  };
}

function getPendingTotal(stats: CharacterStatAllocation) {
  return Object.values(stats).reduce((total, value) => total + value, 0);
}

function applyPendingStats(character: Character, pendingStats: CharacterStatAllocation): Character {
  return {
    ...character,
    strength: character.strength + pendingStats.strength,
    agility: character.agility + pendingStats.agility,
    dexterity: character.dexterity + pendingStats.dexterity,
    vitality: character.vitality + pendingStats.vitality,
    endurance: character.endurance + pendingStats.endurance,
    intelligence: character.intelligence + pendingStats.intelligence,
    wisdom: character.wisdom + pendingStats.wisdom,
  };
}

function hasAllocatedStats(character: Character) {
  return PRIMARY_STATS.some((stat) => character[stat.key] > BASE_PRIMARY_STAT);
}

function CombatStat({
  label,
  shortLabel,
  current,
  preview,
  suffix = "",
  digits = 0,
}: {
  label: string;
  shortLabel?: string;
  current: number;
  preview: number;
  suffix?: string;
  digits?: number;
}) {
  const isChanged = current !== preview;

  return (
    <div className={`combat-stat ${isChanged ? "is-changed" : ""}`}>
      <span className="combat-label">
        <span className="combat-label-full">{label}</span>
        <span className="combat-label-short">{shortLabel ?? label}</span>
      </span>
      <strong>
        {isChanged ? (
          <>
            <small>{formatStatNumber(current, digits)}{suffix}</small>
            <i aria-hidden="true">-&gt;</i>
          </>
        ) : null}
        <b>{formatStatNumber(preview, digits)}{suffix}</b>
      </strong>
    </div>
  );
}

function formatStatNumber(value: number, digits: number) {
  return digits > 0 ? value.toFixed(digits) : Math.round(value).toLocaleString();
}

function CharacterDeletePanel({
  character,
  onCharacterChange,
  onToast,
}: {
  character: Character;
  onCharacterChange: (character: Character | null) => void;
  onToast: (toast: ToastInput) => void;
}) {
  const [confirmName, setConfirmName] = useState("");
  const [isConfirming, setIsConfirming] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const canDelete = confirmName.trim() === character.name && !isSubmitting;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canDelete) {
      setMessage("캐릭터 이름을 정확히 입력해주세요.");
      return;
    }

    setIsSubmitting(true);
    setMessage("캐릭터 삭제 중...");

    const result = await deleteMyCharacter(character.id);

    setIsSubmitting(false);

    if (!result.ok) {
      setMessage(result.message);
      return;
    }

    onCharacterChange(null);
    onToast({ message: "캐릭터를 삭제했습니다.", tone: "system" });
  }

  return (
    <article className="panel danger-panel">
      <div className="panel-head">
        <span>DANGER</span>
        <h2>캐릭터 삭제</h2>
      </div>

      {isConfirming ? (
        <form className="auth-form danger-form" onSubmit={handleSubmit} noValidate>
          <label htmlFor="characterDeleteInput">
            <span>캐릭터 이름 확인</span>
            <input
              id="characterDeleteInput"
              name="characterDelete"
              type="text"
              autoComplete="off"
              placeholder={character.name}
              value={confirmName}
              onChange={(event) => {
                setConfirmName(event.target.value);
                setMessage("");
              }}
              disabled={isSubmitting}
            />
            <small className="field-hint">삭제하려면 캐릭터 이름을 입력해주세요.</small>
          </label>
          <div className="button-row">
            <button className="btn danger" type="submit" disabled={!canDelete}>
              {isSubmitting ? "삭제 중..." : "캐릭터 삭제"}
            </button>
            <button
              className="btn ghost"
              type="button"
              onClick={() => {
                setIsConfirming(false);
                setConfirmName("");
                setMessage("");
              }}
              disabled={isSubmitting}
            >
              취소
            </button>
          </div>
          {message && <p className="auth-message is-error" role="status">{message}</p>}
        </form>
      ) : (
        <div className="panel-action-body">
          <p className="panel-message">삭제 후 되돌릴 수 없습니다.</p>
          <button className="btn danger panel-primary-action" type="button" onClick={() => setIsConfirming(true)}>
            캐릭터 삭제
          </button>
        </div>
      )}
    </article>
  );
}

function Kv({ label, value }: { label: string; value: string }) {
  return (
    <div className="kv">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
