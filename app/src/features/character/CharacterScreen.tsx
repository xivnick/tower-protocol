import type { FormEvent, MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent } from "react";
import { useEffect, useRef, useState } from "react";
import { allocateCharacterStats, checkCharacterNameAvailability, createMyCharacter, deleteMyCharacter, getMyTrainingState, resetCharacterStats, trainMyCharacter } from "../../api/characterApi";
import type { CharacterStatAllocation, TrainingState } from "../../api/characterApi";
import { useDocumentTitle } from "../../shared/useDocumentTitle";
import { formatCharacterExperience, formatCharacterLevel } from "../../shared/progression";
import { BASE_PRIMARY_STAT, calculateCombatStats, COMBAT_STAT_LABELS, PRIMARY_STATS } from "../../shared/stats";
import { calculateWeaponCombatBonus } from "../../shared/weaponStats";
import { getCharacterNameValidationMessage, validateCharacterName } from "../../shared/validation";
import type { Character } from "../../types/character";
import type { ToastInput } from "../../types/toast";
import { getMyPartTimeJobState, workPartTime } from "../../api/partTimeJobApi";
import type { PartTimeJobState } from "../../api/partTimeJobApi";
import { toastMessages } from "../../shared/toastMessages";
import { useToast } from "../toast/ToastProvider";
import { getMyWeapons } from "../../api/equipmentApi";
import type { Weapon } from "../../api/equipmentApi";

export function CharacterScreen({
  character,
  onCharacterChange,
  onCharacterRefresh,
}: {
  character: Character | null;
  onCharacterChange: (character: Character | null) => void;
  onCharacterRefresh: () => Promise<boolean>;
}) {
  useDocumentTitle("TOWER://CHARACTER");

  useEffect(() => {
    void onCharacterRefresh();
  }, []);

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
            <Kv label="크레딧" value={`${character.credits.toLocaleString()} CR`} />
          </div>
        </article>

        <CharacterStatsPanel character={character} onCharacterChange={onCharacterChange} onCharacterRefresh={onCharacterRefresh} />
        <CharacterTrainingPanel character={character} onCharacterChange={onCharacterChange} onCharacterRefresh={onCharacterRefresh} />
        <CharacterPartTimeJobPanel character={character} onCharacterChange={onCharacterChange} onCharacterRefresh={onCharacterRefresh} />
        <CharacterDeletePanel character={character} onCharacterChange={onCharacterChange} onCharacterRefresh={onCharacterRefresh} />
      </section>
    );
  }

  return <CharacterCreatePanel onCharacterChange={onCharacterChange} onCharacterRefresh={onCharacterRefresh} />;
}

function handleCharacterActionFailure({
  message,
  setMessage,
  onCharacterRefresh,
  showToast,
}: {
  message: string;
  setMessage: (message: string) => void;
  onCharacterRefresh: () => Promise<boolean>;
  showToast: (toast: ToastInput) => void;
}) {
  setMessage(message);
  showToast({ message, tone: "error" });

  void onCharacterRefresh()
    .then((isRefreshed) => {
      if (isRefreshed) {
        showToast(toastMessages.character.refreshed());
      }
    })
    .catch(() => {});
}

function CharacterCreatePanel({
  onCharacterChange,
  onCharacterRefresh,
}: {
  onCharacterChange: (character: Character) => void;
  onCharacterRefresh: () => Promise<boolean>;
}) {
  const { showToast } = useToast();
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
      handleCharacterActionFailure({ message: result.message, setMessage, onCharacterRefresh, showToast });
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
  onCharacterRefresh,
}: {
  character: Character;
  onCharacterChange: (character: Character | null) => void;
  onCharacterRefresh: () => Promise<boolean>;
}) {
  const { showToast } = useToast();
  const [pendingStats, setPendingStats] = useState<CharacterStatAllocation>(createEmptyStatAllocation());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [message, setMessage] = useState("");
  const [equippedWeapon, setEquippedWeapon] = useState<Weapon | null>(null);
  const [isCombatBreakdownOpen, setIsCombatBreakdownOpen] = useState(false);
  const statRepeatDelayRef = useRef<number | null>(null);
  const statRepeatIntervalRef = useRef<number | null>(null);
  const statPressRef = useRef<{ pointerId: number; button: HTMLButtonElement; isRepeating: boolean } | null>(null);
  const pendingTotal = getPendingTotal(pendingStats);
  const remainingPoints = character.stat_points - pendingTotal;
  const isPendingComplete = remainingPoints === 0 && pendingTotal > 0;
  const previewCharacter = applyPendingStats(character, pendingStats);
  const weaponBonus = calculateWeaponCombatBonus(equippedWeapon);
  const currentBaseCombatStats = calculateCombatStats(character);
  const previewBaseCombatStats = calculateCombatStats(previewCharacter);
  const currentCombatStats = calculateCombatStats(character, weaponBonus);
  const previewCombatStats = calculateCombatStats(previewCharacter, weaponBonus);
  const canApply = pendingTotal > 0 && !isSubmitting && !isResetting;
  const canReset = hasAllocatedStats(character) && !isSubmitting && !isResetting;

  useEffect(() => {
    setPendingStats(createEmptyStatAllocation());
    setMessage("");
  }, [character.id, character.stat_points]);

  useEffect(() => {
    let isActive = true;
    setEquippedWeapon(null);
    setIsCombatBreakdownOpen(false);

    void getMyWeapons().then((result) => {
      if (!isActive || !result.ok) return;
      setEquippedWeapon(result.inventory.weapons.find((weapon) => weapon.id === result.inventory.equippedWeaponId) ?? null);
    });

    return () => { isActive = false; };
  }, [character.id]);

  useEffect(() => () => stopStatRepeat(), []);

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

  function stopStatRepeat() {
    if (statRepeatDelayRef.current !== null) {
      window.clearTimeout(statRepeatDelayRef.current);
      statRepeatDelayRef.current = null;
    }

    if (statRepeatIntervalRef.current !== null) {
      window.clearInterval(statRepeatIntervalRef.current);
      statRepeatIntervalRef.current = null;
    }
  }

  function handleStatPointerDown(event: ReactPointerEvent<HTMLButtonElement>, statKey: keyof CharacterStatAllocation, amount: number) {
    if (event.button !== 0) {
      return;
    }

    stopStatRepeat();
    statPressRef.current = { pointerId: event.pointerId, button: event.currentTarget, isRepeating: false };
    event.currentTarget.setPointerCapture(event.pointerId);

    statRepeatDelayRef.current = window.setTimeout(() => {
      if (statPressRef.current?.pointerId !== event.pointerId) {
        return;
      }

      statPressRef.current.isRepeating = true;
      changePendingStat(statKey, amount);
      statRepeatIntervalRef.current = window.setInterval(() => {
        changePendingStat(statKey, amount);
      }, 90);
    }, 360);
  }

  function handleStatClick(event: ReactMouseEvent<HTMLButtonElement>, statKey: keyof CharacterStatAllocation, amount: number) {
    const statPress = statPressRef.current;
    if (statPress?.button === event.currentTarget) {
      statPressRef.current = null;
      if (statPress.isRepeating) {
        return;
      }

      changePendingStat(statKey, amount);
      return;
    }

    changePendingStat(statKey, amount);
  }

  function handleStatPointerUp(event: ReactPointerEvent<HTMLButtonElement>) {
    if (statPressRef.current?.pointerId !== event.pointerId) {
      return;
    }

    stopStatRepeat();
    window.setTimeout(() => {
      if (statPressRef.current?.pointerId === event.pointerId) {
        statPressRef.current = null;
      }
    }, 0);
  }

  function handleStatPointerCancel(event: ReactPointerEvent<HTMLButtonElement>) {
    if (statPressRef.current?.pointerId !== event.pointerId) {
      return;
    }

    stopStatRepeat();
    statPressRef.current = null;
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
      handleCharacterActionFailure({ message: result.message, setMessage, onCharacterRefresh, showToast });
      return;
    }

    onCharacterChange(result.character);
    showToast(toastMessages.character.statsApplied());
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
      handleCharacterActionFailure({ message: result.message, setMessage, onCharacterRefresh, showToast });
      return;
    }

    onCharacterChange(result.character);
    showToast(toastMessages.character.statsReset());
  }

  return (
    <article className="panel">
      <div className="panel-head stat-panel-head">
        <div>
          <span>STATS</span>
          <h2>능력치</h2>
        </div>
        <div className="stat-reset-area">
          <button className="btn ghost" type="button" onClick={handleResetStats} disabled={!canReset}>
            {isResetting ? "초기화 중..." : "스탯 초기화"}
          </button>
          <small>비용 무료</small>
        </div>
      </div>
      <div className="stat-meter-row">
        <span className={remainingPoints > 0 ? "is-unspent" : "is-empty"}>미분배 {remainingPoints.toLocaleString()}P</span>
        <span className={isPendingComplete ? "is-pending" : ""}>예정 {pendingTotal.toLocaleString()}P</span>
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
              <div className={`stat-controls ${pendingValue > 0 ? "is-changed" : ""}`}>
                <button
                  className="icon-button step-wide"
                  type="button"
                  onClick={(event) => handleStatClick(event, stat.key, -5)}
                  disabled={isSubmitting || isResetting || pendingValue < 5}
                  aria-label={`${stat.label} 5 감소`}
                >
                  -5
                </button>
                <button
                  className="icon-button"
                  type="button"
                  onPointerDown={(event) => handleStatPointerDown(event, stat.key, -1)}
                  onPointerUp={handleStatPointerUp}
                  onPointerCancel={handleStatPointerCancel}
                  onClick={(event) => handleStatClick(event, stat.key, -1)}
                  disabled={isSubmitting || isResetting || pendingValue <= 0}
                  aria-label={`${stat.label} 1 감소`}
                >
                  <span className="adjust-label-wide">-1</span>
                  <span className="adjust-label-mobile">-</span>
                </button>
                <span className={`stat-value ${pendingValue > 0 ? "is-changed" : ""}`}>
                  <span className="stat-previous">
                    <small>{currentValue.toLocaleString()}</small>
                    <i aria-hidden="true">-&gt;</i>
                  </span>
                  <b>{previewValue.toLocaleString()}</b>
                </span>
                <button
                  className="icon-button"
                  type="button"
                  onPointerDown={(event) => handleStatPointerDown(event, stat.key, 1)}
                  onPointerUp={handleStatPointerUp}
                  onPointerCancel={handleStatPointerCancel}
                  onClick={(event) => handleStatClick(event, stat.key, 1)}
                  disabled={isSubmitting || isResetting || remainingPoints < 1}
                  aria-label={`${stat.label} 1 증가`}
                >
                  <span className="adjust-label-wide">+1</span>
                  <span className="adjust-label-mobile">+</span>
                </button>
                <button
                  className="icon-button step-wide"
                  type="button"
                  onClick={(event) => handleStatClick(event, stat.key, 5)}
                  disabled={isSubmitting || isResetting || remainingPoints < 5}
                  aria-label={`${stat.label} 5 증가`}
                >
                  +5
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
        <CombatStat {...COMBAT_STAT_LABELS.physicalAttack} current={currentCombatStats.physicalAttack} currentBase={currentBaseCombatStats.physicalAttack} preview={previewCombatStats.physicalAttack} breakdown={createCombatBreakdown(previewBaseCombatStats.physicalAttack, previewCombatStats.physicalAttack)} isBreakdownOpen={isCombatBreakdownOpen} onToggle={() => setIsCombatBreakdownOpen((current) => !current)} />
        <CombatStat {...COMBAT_STAT_LABELS.magicAttack} current={currentCombatStats.magicAttack} currentBase={currentBaseCombatStats.magicAttack} preview={previewCombatStats.magicAttack} breakdown={createCombatBreakdown(previewBaseCombatStats.magicAttack, previewCombatStats.magicAttack)} isBreakdownOpen={isCombatBreakdownOpen} onToggle={() => setIsCombatBreakdownOpen((current) => !current)} />
        <CombatStat {...COMBAT_STAT_LABELS.physicalDefense} current={currentCombatStats.physicalDefense} preview={previewCombatStats.physicalDefense} isBreakdownOpen={isCombatBreakdownOpen} onToggle={() => setIsCombatBreakdownOpen((current) => !current)} />
        <CombatStat {...COMBAT_STAT_LABELS.magicDefense} current={currentCombatStats.magicDefense} preview={previewCombatStats.magicDefense} isBreakdownOpen={isCombatBreakdownOpen} onToggle={() => setIsCombatBreakdownOpen((current) => !current)} />
        <CombatStat {...COMBAT_STAT_LABELS.maxHp} current={currentCombatStats.maxHp} preview={previewCombatStats.maxHp} isBreakdownOpen={isCombatBreakdownOpen} onToggle={() => setIsCombatBreakdownOpen((current) => !current)} />
        <CombatStat {...COMBAT_STAT_LABELS.regeneration} current={currentCombatStats.hpRegenPerSecond} preview={previewCombatStats.hpRegenPerSecond} digits={2} isBreakdownOpen={isCombatBreakdownOpen} onToggle={() => setIsCombatBreakdownOpen((current) => !current)} />
        <CombatStat {...COMBAT_STAT_LABELS.attackSpeed} current={currentCombatStats.attacksPerSecond} currentBase={currentBaseCombatStats.attacksPerSecond} preview={previewCombatStats.attacksPerSecond} digits={2} breakdown={createCombatBreakdown(previewBaseCombatStats.attacksPerSecond, previewCombatStats.attacksPerSecond)} isBreakdownOpen={isCombatBreakdownOpen} onToggle={() => setIsCombatBreakdownOpen((current) => !current)} />
        <CombatStat {...COMBAT_STAT_LABELS.cooldownReduction} current={currentCombatStats.cooldownReduction * 100} preview={previewCombatStats.cooldownReduction * 100} suffix="%" digits={1} isBreakdownOpen={isCombatBreakdownOpen} onToggle={() => setIsCombatBreakdownOpen((current) => !current)} />
        <CombatStat {...COMBAT_STAT_LABELS.accuracy} current={currentCombatStats.accuracy} currentBase={currentBaseCombatStats.accuracy} preview={previewCombatStats.accuracy} breakdown={createCombatBreakdown(previewBaseCombatStats.accuracy, previewCombatStats.accuracy)} isBreakdownOpen={isCombatBreakdownOpen} onToggle={() => setIsCombatBreakdownOpen((current) => !current)} />
        <CombatStat {...COMBAT_STAT_LABELS.evasionRate} current={currentCombatStats.evasionRateAgainstAccuracy100 * 100} preview={previewCombatStats.evasionRateAgainstAccuracy100 * 100} suffix="%" digits={1} isBreakdownOpen={isCombatBreakdownOpen} onToggle={() => setIsCombatBreakdownOpen((current) => !current)} />
        <CombatStat {...COMBAT_STAT_LABELS.criticalChance} current={currentCombatStats.criticalChance} preview={previewCombatStats.criticalChance} suffix="%" digits={1} isBreakdownOpen={isCombatBreakdownOpen} onToggle={() => setIsCombatBreakdownOpen((current) => !current)} />
        <CombatStat {...COMBAT_STAT_LABELS.criticalDamage} current={currentCombatStats.criticalDamage} preview={previewCombatStats.criticalDamage} suffix="%" isBreakdownOpen={isCombatBreakdownOpen} onToggle={() => setIsCombatBreakdownOpen((current) => !current)} />
      </div>
      {message && <p className="auth-message is-error" role="status">{message}</p>}
    </article>
  );
}

function CharacterTrainingPanel({
  character,
  onCharacterChange,
  onCharacterRefresh,
}: {
  character: Character;
  onCharacterChange: (character: Character | null) => void;
  onCharacterRefresh: () => Promise<boolean>;
}) {
  const { showToast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [trainingState, setTrainingState] = useState<TrainingState | null>(null);
  const [now, setNow] = useState(Date.now());
  const isMaxLevel = character.level >= 100;
  const displayedTrainingState = getDisplayedTrainingState(trainingState, now);
  const isTrainingAvailable = displayedTrainingState.charges > 0;

  useEffect(() => {
    let isActive = true;

    void getMyTrainingState().then((result) => {
      if (!isActive) return;
      if (!result.ok || !result.state) {
        setMessage(result.message);
        return;
      }
      setTrainingState(result.state);
      setNow(Date.now());
    });

    return () => { isActive = false; };
  }, [character.id]);

  useEffect(() => {
    if (!trainingState || displayedTrainingState.charges >= trainingState.maxCharges) return;

    const intervalId = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(intervalId);
  }, [displayedTrainingState.charges, trainingState]);

  async function handleTrain() {
    if (isSubmitting || isMaxLevel || !isTrainingAvailable) {
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
      handleCharacterActionFailure({ message: result.message, setMessage, onCharacterRefresh, showToast });
      return;
    }

    onCharacterChange(result.character);
    if (result.trainingState) {
      setTrainingState(result.trainingState);
      setNow(Date.now());
    }
    showToast(toastMessages.training.completed(result.gainedExperience, result.rewardTier));

    if (result.levelAfter > result.levelBefore) {
      window.setTimeout(() => {
        showToast(toastMessages.character.levelUp(result.levelAfter));
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
        <button className="btn primary panel-primary-action" type="button" onClick={handleTrain} disabled={isSubmitting || isMaxLevel || !trainingState || !isTrainingAvailable}>
          {getTrainingButtonLabel({ isSubmitting, isMaxLevel, trainingState, displayedTrainingState })}
        </button>
        {message && <p className="auth-message is-error" role="status">{message}</p>}
      </div>
    </article>
  );
}

function CharacterPartTimeJobPanel({
  character,
  onCharacterChange,
  onCharacterRefresh,
}: {
  character: Character;
  onCharacterChange: (character: Character | null) => void;
  onCharacterRefresh: () => Promise<boolean>;
}) {
  const { showToast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [jobState, setJobState] = useState<PartTimeJobState | null>(null);
  const [now, setNow] = useState(Date.now());
  const displayedJobState = getDisplayedTrainingState(jobState, now);
  const isJobAvailable = displayedJobState.charges > 0;

  useEffect(() => {
    let isActive = true;

    void getMyPartTimeJobState().then((result) => {
      if (!isActive) return;
      if (!result.ok || !result.state) {
        setMessage(result.message);
        return;
      }
      setJobState(result.state);
      setNow(Date.now());
    });

    return () => { isActive = false; };
  }, [character.id]);

  useEffect(() => {
    if (!jobState || displayedJobState.charges >= jobState.maxCharges) return;

    const intervalId = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(intervalId);
  }, [displayedJobState.charges, jobState]);

  async function handleWork() {
    if (isSubmitting || !isJobAvailable) return;

    setIsSubmitting(true);
    setMessage("");
    const [result] = await Promise.all([workPartTime(), wait(400)]);
    setIsSubmitting(false);

    if (!result.ok || !result.character || !result.state) {
      handleCharacterActionFailure({ message: result.message, setMessage, onCharacterRefresh, showToast });
      return;
    }

    onCharacterChange(result.character);
    setJobState(result.state);
    setNow(Date.now());
    showToast(toastMessages.partTimeJob.completed(result.gainedCredits));
  }

  return (
    <article className="panel">
      <div className="panel-head">
        <span>WORK</span>
        <h2>단기 알바</h2>
      </div>
      <div className="panel-action-body">
        <p className="panel-message">알바를 실행하면 크레딧을 획득합니다.</p>
        <button className="btn primary panel-primary-action" type="button" onClick={handleWork} disabled={isSubmitting || !jobState || !isJobAvailable}>
          {getPartTimeJobButtonLabel({ isSubmitting, jobState, displayedJobState })}
        </button>
        {message && <p className="auth-message is-error" role="status">{message}</p>}
      </div>
    </article>
  );
}

function getDisplayedTrainingState(state: TrainingState | null, now: number) {
  if (!state || !state.nextRechargeAt) return { charges: state?.charges ?? 0, secondsUntilNextCharge: null };

  const nextRechargeAt = Date.parse(state.nextRechargeAt);
  if (Number.isNaN(nextRechargeAt)) return { charges: state.charges, secondsUntilNextCharge: null };

  const elapsedCharges = Math.max(0, Math.floor((now - nextRechargeAt) / 6000) + 1);
  const charges = Math.min(state.maxCharges, state.charges + elapsedCharges);
  const nextChargeAt = nextRechargeAt + (elapsedCharges * 6000);
  return { charges, secondsUntilNextCharge: charges >= state.maxCharges ? null : Math.max(0, Math.ceil((nextChargeAt - now) / 1000)) };
}

function getTrainingButtonLabel({
  isSubmitting,
  isMaxLevel,
  trainingState,
  displayedTrainingState,
}: {
  isSubmitting: boolean;
  isMaxLevel: boolean;
  trainingState: TrainingState | null;
  displayedTrainingState: { charges: number; secondsUntilNextCharge: number | null };
}) {
  if (isSubmitting) return "훈련 중...";
  if (isMaxLevel) return "훈련 실행";
  if (!trainingState) return "훈련 상태 확인 중...";
  if (displayedTrainingState.charges === 0) return `훈련까지 ${displayedTrainingState.secondsUntilNextCharge ?? 0}초...`;
  return `훈련 실행 (${displayedTrainingState.charges}/${trainingState.maxCharges})`;
}

function getPartTimeJobButtonLabel({
  isSubmitting,
  jobState,
  displayedJobState,
}: {
  isSubmitting: boolean;
  jobState: PartTimeJobState | null;
  displayedJobState: { charges: number; secondsUntilNextCharge: number | null };
}) {
  if (isSubmitting) return "알바 중...";
  if (!jobState) return "알바 상태 확인 중...";
  if (displayedJobState.charges === 0) return `알바까지 ${displayedJobState.secondsUntilNextCharge ?? 0}초...`;
  return `알바 실행 (${displayedJobState.charges}/${jobState.maxCharges})`;
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

type CombatBreakdown = {
  base: number;
  equipment: number;
};

function createCombatBreakdown(base: number, final: number): CombatBreakdown | undefined {
  const equipment = final - base;
  return Math.abs(equipment) > 0.00001 ? { base, equipment } : undefined;
}

function CombatStat({
  label,
  shortLabel,
  current,
  currentBase,
  preview,
  suffix = "",
  digits = 0,
  breakdown,
  isBreakdownOpen = false,
  onToggle,
}: {
  label: string;
  shortLabel?: string;
  current: number;
  currentBase?: number;
  preview: number;
  suffix?: string;
  digits?: number;
  breakdown?: CombatBreakdown;
  isBreakdownOpen?: boolean;
  onToggle?: () => void;
}) {
  const isChanged = current !== preview;
  const isInteractive = Boolean(onToggle);
  const className = `combat-stat ${isChanged ? "is-changed" : ""} ${isInteractive ? "is-interactive" : ""}`;
  const content = <>
    <span className="combat-label">
      <span className="combat-label-full">{label}</span>
      <span className="combat-label-short">{shortLabel ?? label}</span>
    </span>
    <strong>
      {isBreakdownOpen && breakdown ? (
        <>
          {isChanged ? (
            <>
              <small>{formatStatNumber(currentBase ?? current, digits)}{suffix}</small>
              <i aria-hidden="true">-&gt;</i>
            </>
          ) : null}
          <b>{formatStatNumber(breakdown.base, digits)}{suffix}</b>
          <i aria-hidden="true">{breakdown.equipment >= 0 ? "+" : "-"}</i>
          <small>{formatStatNumber(Math.abs(breakdown.equipment), digits)}{suffix}</small>
        </>
      ) : isChanged ? (
        <>
          <small>{formatStatNumber(current, digits)}{suffix}</small>
          <i aria-hidden="true">-&gt;</i>
        </>
      ) : null}
      {!isBreakdownOpen || !breakdown ? <b>{formatStatNumber(preview, digits)}{suffix}</b> : null}
    </strong>
  </>;

  if (isInteractive) return <button className={className} type="button" onClick={onToggle}>{content}</button>;
  return <div className={className}>{content}</div>;
}

function formatStatNumber(value: number, digits: number) {
  return digits > 0 ? value.toFixed(digits) : Math.round(value).toLocaleString();
}

function CharacterDeletePanel({
  character,
  onCharacterChange,
  onCharacterRefresh,
}: {
  character: Character;
  onCharacterChange: (character: Character | null) => void;
  onCharacterRefresh: () => Promise<boolean>;
}) {
  const { showToast } = useToast();
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
      handleCharacterActionFailure({ message: result.message, setMessage, onCharacterRefresh, showToast });
      return;
    }

    onCharacterChange(null);
    showToast(toastMessages.character.deleted());
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
