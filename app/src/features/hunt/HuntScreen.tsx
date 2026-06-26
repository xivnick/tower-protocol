import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { configureAutoHunt, encounterHuntMonster, fleeHuntEncounter, fleeTrainingDummyHunt, getHuntGrounds, getMyHuntState, huntTrainingDummy, selectHuntGround, settleTrainingDummyHunt } from "../../api/characterApi";
import type { HuntGround, HuntLogEntry, HuntResult, HuntState, MonsterInfo } from "../../api/characterApi";
import { formatCharacterLevel, getRequiredExperienceForLevel } from "../../shared/progression";
import { calculateCombatStats, COMBAT_STAT_LABELS } from "../../shared/stats";
import type { Character } from "../../types/character";
import type { ToastInput } from "../../types/toast";
import { toastMessages } from "../../shared/toastMessages";
import { useCombatClock } from "../../shared/useCombatClock";
import { useToast } from "../toast/ToastProvider";

const trainingDummy = {
  maxHp(level: number) {
    const vitality = 10 + ((level - 1) * 5);
    return 100 + (level * 20) + (vitality * 10);
  },
};

const DEFAULT_HUNT_GROUNDS: HuntGround[] = [
  { id: "training-dummy", name: "허수아비 훈련장", recommendedMinLevel: 1, recommendedMaxLevel: 100 },
  { id: "wooden-doll", name: "목각인형 훈련장", recommendedMinLevel: 1, recommendedMaxLevel: 100 },
];

export function HuntScreen({
  character,
  onCharacterChange,
  onCharacterRefresh,
  onHuntStateChange,
}: {
  character: Character | null;
  onCharacterChange: (character: Character | null) => void;
  onCharacterRefresh: () => Promise<boolean>;
  onHuntStateChange: (huntState: HuntState | null) => void;
}) {
  useEffect(() => {
    void onCharacterRefresh();
  }, []);

  if (!character) {
    return (
      <section className="screen-panel">
        <article className="panel">
          <div className="panel-head">
            <span>HUNTING GROUNDS</span>
            <h2>사냥터</h2>
          </div>
          <div className="panel-action-body">
            <p className="panel-message">사냥을 시작하려면 캐릭터를 생성해주세요.</p>
            <Link className="btn primary panel-primary-action" to="/character">캐릭터 생성</Link>
          </div>
        </article>
      </section>
    );
  }

  return <TrainingDummyGround character={character} onCharacterChange={onCharacterChange} onCharacterRefresh={onCharacterRefresh} onHuntStateChange={onHuntStateChange} />;
}

function TrainingDummyGround({
  character,
  onCharacterChange,
  onCharacterRefresh,
  onHuntStateChange,
}: {
  character: Character;
  onCharacterChange: (character: Character | null) => void;
  onCharacterRefresh: () => Promise<boolean>;
  onHuntStateChange: (huntState: HuntState | null) => void;
}) {
  const { showToast } = useToast();
  const [result, setResult] = useState<HuntResult | null>(null);
  const [lastResult, setLastResult] = useState<HuntResult | null>(null);
  const [huntState, setHuntState] = useState<HuntState | null>(null);
  const [isMonsterInfoOpen, setIsMonsterInfoOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEncountering, setIsEncountering] = useState(false);
  const [isStartingBattle, setIsStartingBattle] = useState(false);
  const [isResolving, setIsResolving] = useState(false);
  const [isLocationMenuOpen, setIsLocationMenuOpen] = useState(false);
  const [huntGrounds, setHuntGrounds] = useState<HuntGround[]>(DEFAULT_HUNT_GROUNDS);
  const [now, setNow] = useState(Date.now());
  const [frozenPlaybackTenths, setFrozenPlaybackTenths] = useState(0);
  const logRef = useRef<HTMLOListElement>(null);
  const completedResultRef = useRef<HuntResult | null>(null);
  const settlementAttemptRef = useRef<string | null>(null);
  const autoActionRef = useRef<string | null>(null);
  const autoEncounterDuringRecoveryRef = useRef(false);
  const huntAvailableAt = result?.huntState?.availableAt ?? huntState?.availableAt;
  const availableAt = huntAvailableAt ? Date.parse(huntAvailableAt) : 0;
  const remainingTenths = Math.max(0, Math.ceil((availableAt - now) / 100));
  const combatStats = calculateCombatStats(character);
  const selectedGroundId = huntState?.selectedHuntGroundId ?? "training-dummy";
  const selectedGround = huntGrounds.find((ground) => ground.id === selectedGroundId) ?? huntGrounds[0] ?? DEFAULT_HUNT_GROUNDS[0];
  const dummyMaxHp = result?.enemy.maxHp ?? trainingDummy.maxHp(character.level);
  const isBattleInProgress = result?.status === "in_progress";
  const combatNow = useCombatClock(isBattleInProgress);
  const playbackTenths = isBattleInProgress && result
    ? getElapsedTenths(result.startedAt, result.durationTicks, combatNow)
    : frozenPlaybackTenths;
  const visibleLogs = useMemo(() => result?.logs.filter((entry) => entry.timeTenths <= playbackTenths) ?? [], [playbackTenths, result]);
  const displayedLogs = useMemo(() => groupCombatLogs(visibleLogs), [visibleLogs]);
  const enemyLogs = visibleLogs.filter((entry) => entry.target !== "player");
  const playerLogs = visibleLogs.filter((entry) => entry.target === "player");
  const targetHp = enemyLogs.length > 0 ? enemyLogs[enemyLogs.length - 1].targetHp : dummyMaxHp;
  const playerShield = useMemo(() => getVisibleShield(visibleLogs, "player", playbackTenths), [playbackTenths, visibleLogs]);
  const enemyShield = useMemo(() => getVisibleShield(visibleLogs, "enemy", playbackTenths), [playbackTenths, visibleLogs]);
  const hasEncounteredMonster = result?.status === "encountered";
  const recoveredPlayerHp = getRecoveredPlayerHp(huntState, now);
  const playerHp = isBattleInProgress
    ? playerLogs.length > 0 ? playerLogs[playerLogs.length - 1].targetHp : result?.player.startHp ?? result?.player.maxHp ?? combatStats.maxHp
    : recoveredPlayerHp ?? huntState?.playerCurrentHp ?? result?.player.currentHp ?? result?.player.startHp ?? result?.player.maxHp ?? combatStats.maxHp;
  const isGoingToDifferentGround = Boolean(isBattleInProgress && result && selectedGroundId !== result.huntGroundId);
  const isPlaybackComplete = Boolean(result && (!isBattleInProgress || playbackTenths >= result.durationTicks));
  const isRecovering = Boolean(!isBattleInProgress && huntState?.recoveryEndsAt && Date.parse(huntState.recoveryEndsAt) > now);
  const recoveryLockStatus = huntState?.lastBattle?.status ?? result?.status;
  const recoveryLockStartedAt = huntState?.playerRecoveryStartedAt ? Date.parse(huntState.playerRecoveryStartedAt) : 0;
  const isRecoveryLocked = Boolean(recoveryLockStartedAt && (recoveryLockStatus === "defeated" || recoveryLockStatus === "fled") && recoveryLockStartedAt + 10_000 > now);
  const isRetreatLocked = Boolean(isRecoveryLocked && recoveryLockStatus === "fled");
  const canEncounter = !isSubmitting && !isResolving && !isRecoveryLocked && remainingTenths === 0 && !hasEncounteredMonster && (!result || !isBattleInProgress);
  const canAutoEncounter = !isSubmitting && !isResolving && !isRecoveryLocked && remainingTenths === 0 && !hasEncounteredMonster && (!result || !isBattleInProgress);
  const canStartBattle = !isSubmitting && !isResolving && !isStartingBattle && hasEncounteredMonster;
  const canFleeEncounter = Boolean(hasEncounteredMonster && !isSubmitting && !isResolving && !isStartingBattle);
  const canFlee = Boolean(result && isBattleInProgress && !isResolving && playbackTenths < result.durationTicks);
  const showFleeButton = Boolean(hasEncounteredMonster || isBattleInProgress || isStartingBattle);
  const autoHuntEnabled = huntState?.autoHuntEnabled ?? false;
  const autoHuntRemaining = huntState?.autoHuntRemaining ?? 0;
  const displayLevel = result ? (isPlaybackComplete ? result.levelAfter : result.player.level) : character.level;
  const displayExperience = result ? (isPlaybackComplete ? result.experienceAfter : result.player.experience ?? 0) : character.experience;
  const requiredExperience = getRequiredExperienceForLevel(displayLevel + 1) ?? 1;
  const experiencePercent = displayLevel >= 100 ? 100 : (displayExperience / requiredExperience) * 100;

  useEffect(() => {
    let isActive = true;

    void getHuntGrounds().then((result) => {
      if (!isActive || !result.ok || result.grounds.length === 0) return;
      setHuntGrounds(result.grounds);
    });

    void getMyHuntState().then((nextState) => {
      if (!isActive || !nextState.ok || !nextState.state) return;

      setHuntState(nextState.state);
      const battle = nextState.state.lastBattle;
      if (!battle) return;

      const restoredResult = { ok: true, character: null, huntState: nextState.state, ...battle, message: "" };
      onHuntStateChange(nextState.state);
      setResult(restoredResult);
      if (battle.status !== "in_progress" && battle.status !== "encountered") setLastResult(restoredResult);
      setFrozenPlaybackTenths(getElapsedTenths(battle.startedAt, battle.durationTicks));
    });

    return () => { isActive = false; };
  }, []);

  useEffect(() => {
    if (remainingTenths === 0 && !isRecovering && !isRecoveryLocked) return;

    const intervalId = window.setInterval(() => setNow(Date.now()), 100);
    return () => window.clearInterval(intervalId);
  }, [isRecovering, isRecoveryLocked, remainingTenths]);

  useEffect(() => {
    if (visibleLogs.length > 0 && logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [visibleLogs.length]);

  useEffect(() => {
    if (!result || hasEncounteredMonster || isBattleInProgress || !isPlaybackComplete || completedResultRef.current === result) return;

    if (result.status === "timed_out") {
      if (!result.character) return;
      completedResultRef.current = result;
      onCharacterChange(result.character);
      showToast(toastMessages.hunt.timedOut());
      return;
    }

    if (result.status === "defeated") {
      if (!result.character) return;
      completedResultRef.current = result;
      onCharacterChange(result.character);
      showToast(toastMessages.hunt.defeated());
      return;
    }

    if (result.status !== "victory") return;

    if (!result.character) return;

    completedResultRef.current = result;
    onCharacterChange(result.character);
    showToast(toastMessages.hunt.completed(result.gainedExperience, result.gainedCredits ?? result.rewards?.credits ?? 0));

    if (result.levelAfter > result.levelBefore) {
      showToast(toastMessages.character.levelUp(result.levelAfter));
    }
  }, [hasEncounteredMonster, isBattleInProgress, isPlaybackComplete, onCharacterChange, result, showToast]);

  useEffect(() => {
    if (!result || result.status !== "in_progress" || !isPlaybackComplete || isResolving || settlementAttemptRef.current === result.startedAt) return;

    let isActive = true;
    const timeoutId = window.setTimeout(() => {
      settlementAttemptRef.current = result.startedAt;
      setIsResolving(true);
      void settleTrainingDummyHunt().then((nextResult) => {
        if (!isActive) return;
        setIsResolving(false);
        if (!nextResult.ok) {
          showToast({ message: nextResult.message, tone: "error" });
          return;
        }
        setHuntState(nextResult.huntState);
        onHuntStateChange(nextResult.huntState);
        setFrozenPlaybackTenths(nextResult.durationTicks);
        setResult(nextResult);
        setLastResult(nextResult);
      });
    }, 180);

    return () => {
      isActive = false;
      window.clearTimeout(timeoutId);
    };
  }, [isPlaybackComplete, result]);

  useEffect(() => {
    if (!autoHuntEnabled || isSubmitting || isResolving || isBattleInProgress) return;
    if (hasEncounteredMonster) {
      if (isRecovering) return;
      const key = `battle-${result?.startedAt}`;
      if (autoActionRef.current === key) return;
      autoActionRef.current = key;
      const delay = autoEncounterDuringRecoveryRef.current ? 0 : 500;
      const timeoutId = window.setTimeout(() => void handleHunt(), delay);
      return () => window.clearTimeout(timeoutId);
    }
    if (autoHuntRemaining === 0) {
      if (autoActionRef.current === "complete") return;
      autoActionRef.current = "complete";
      void handleAutoHunt(false, toastMessages.hunt.autoHuntCompleted());
      return;
    }
    if (!canAutoEncounter) return;
    const key = `encounter-${autoHuntRemaining}-${huntState?.lastBattle?.startedAt ?? "ready"}`;
    if (autoActionRef.current === key) return;
    autoActionRef.current = key;
    autoEncounterDuringRecoveryRef.current = isRecovering;
    const timeoutId = window.setTimeout(() => void handleEncounter(false), 500);
    return () => window.clearTimeout(timeoutId);
  }, [autoHuntEnabled, autoHuntRemaining, canAutoEncounter, hasEncounteredMonster, isBattleInProgress, isRecovering, isResolving, isSubmitting, result?.startedAt]);

  async function handleHunt() {
    if (!canStartBattle) return;

    setIsStartingBattle(true);
    setIsSubmitting(true);
    const nextResult = await huntTrainingDummy();
    setIsSubmitting(false);

    if (!nextResult.ok) {
      setIsStartingBattle(false);
      autoActionRef.current = null;
      showToast({ message: nextResult.message, tone: "error" });
      void onCharacterRefresh();
      return;
    }

    completedResultRef.current = null;
    settlementAttemptRef.current = null;
    setFrozenPlaybackTenths(0);
    setHuntState(nextResult.huntState);
    onHuntStateChange(nextResult.huntState);
    setResult(nextResult);
    setIsStartingBattle(false);
    if (autoHuntEnabled) showToast(toastMessages.hunt.autoBattleStarted(nextResult.enemy.level, nextResult.enemy.name));
  }

  async function handleEncounter(showSearching = true) {
    if (!canEncounter) return;

    const startedAt = Date.now();
    if (showSearching) setIsEncountering(true);
    setIsSubmitting(true);
    const nextResult = await encounterHuntMonster();
    const remainingTransitionMs = showSearching ? Math.max(0, 500 - (Date.now() - startedAt)) : 0;
    if (remainingTransitionMs > 0) await new Promise<void>((resolve) => window.setTimeout(resolve, remainingTransitionMs));
    setIsSubmitting(false);
    if (showSearching) setIsEncountering(false);

    if (!nextResult.ok) {
      autoActionRef.current = null;
      showToast({ message: nextResult.message, tone: "error" });
      void onCharacterRefresh();
      return;
    }

    setHuntState(nextResult.huntState);
    onHuntStateChange(nextResult.huntState);
    setFrozenPlaybackTenths(0);
    setResult(nextResult);
  }

  async function handleAutoHunt(enabled: boolean, completionToast?: ToastInput) {
    const nextState = await configureAutoHunt(enabled);
    if (!nextState.ok || !nextState.state) {
      showToast({ message: nextState.message, tone: "error" });
      return;
    }
    autoActionRef.current = null;
    setHuntState(nextState.state);
    onHuntStateChange(nextState.state);
    showToast(completionToast ?? (enabled ? (autoHuntEnabled ? toastMessages.hunt.autoHuntUpdated() : toastMessages.hunt.autoHuntStarted()) : toastMessages.hunt.autoHuntStopped()));
  }

  async function handleGroundChange(huntGroundId: string) {
    setIsLocationMenuOpen(false);
    if (huntGroundId === selectedGroundId) return;
    const nextState = await selectHuntGround(huntGroundId);
    if (!nextState.ok || !nextState.state) {
      showToast({ message: nextState.message, tone: "error" });
      return;
    }
    setHuntState((currentState) => currentState ? {
      ...currentState,
      selectedHuntGroundId: nextState.state!.selectedHuntGroundId,
    } : nextState.state);
    onHuntStateChange(nextState.state);
  }

  async function handleEncounterFlee() {
    if (!canFleeEncounter) return;

    setIsResolving(true);
    const nextState = await fleeHuntEncounter();
    setIsResolving(false);

    if (!nextState.ok || !nextState.state) {
      showToast({ message: nextState.message, tone: "error" });
      return;
    }

    setHuntState(nextState.state);
    onHuntStateChange(nextState.state);
    setResult(null);
    setFrozenPlaybackTenths(0);
    showToast({ message: nextState.message, tone: "system" });
  }

  async function handleFlee() {
    if (!canFlee || !result) return;

    const previousLastResult = lastResult;
    setIsResolving(true);
    setLastResult({ ...result, status: "fled", durationTicks: playbackTenths });
    const nextResult = await fleeTrainingDummyHunt();
    setIsResolving(false);

    if (!nextResult.ok) {
      setLastResult(previousLastResult);
      showToast({ message: nextResult.message, tone: "error" });
      return;
    }

    setHuntState(nextResult.huntState);
    onHuntStateChange(nextResult.huntState);
    setResult(nextResult);
    setFrozenPlaybackTenths(getFleeTenths(nextResult));
    showToast({ message: nextResult.message, tone: "system" });
  }

  return (
    <section className="screen-panel hunt-screen">
      <div className="hunt-location-picker">
        <button
          className="hunt-location-strip"
          type="button"
          aria-expanded={isLocationMenuOpen}
          aria-controls="hunt-location-menu"
          onClick={() => setIsLocationMenuOpen((current) => !current)}
        >
          <span>{isGoingToDifferentGround ? "GOING TO.." : "LOCATION"}</span>
          <strong>{selectedGround.name}</strong>
          <small>{formatRecommendedLevel(selectedGround)}</small>
          <svg className="hunt-location-icon" aria-hidden="true" viewBox="0 0 16 16">
            <path d="m4 6 4 4 4-4" />
          </svg>
        </button>
        {isLocationMenuOpen && (
          <div className="hunt-location-menu" id="hunt-location-menu" role="menu" aria-label="사냥터 선택">
            {huntGrounds.map((ground) => (
              <button
                className={ground.id === selectedGroundId ? "is-selected" : ""}
                type="button"
                role="menuitemradio"
                aria-checked={ground.id === selectedGroundId}
                key={ground.id}
                onClick={() => void handleGroundChange(ground.id)}
              >
                <strong>{ground.name}</strong>
                <small>{formatRecommendedLevel(ground)}</small>
              </button>
            ))}
          </div>
        )}
      </div>
      <article className="auto-hunt-panel">
        <span>자동 전투</span>
        <strong>{autoHuntRemaining.toString().padStart(2, "0")} / 10</strong>
        <div>
          <button className="btn ghost" type="button" onClick={() => void handleAutoHunt(false)} disabled={!autoHuntEnabled}>중단</button>
          <button className="btn primary" type="button" onClick={() => void handleAutoHunt(true)}>{autoHuntEnabled ? "갱신" : "시작"}</button>
        </div>
      </article>
      <article className="panel combat-record-panel">
          <div className="panel-head compact action-head">
            <div>
              <span>COMBAT</span>
              <h2>전투</h2>
            </div>
            <div className="hunt-action-buttons">
              {showFleeButton && <button className="btn ghost" type="button" onClick={isBattleInProgress ? handleFlee : handleEncounterFlee} disabled={isResolving || isSubmitting || (!canFlee && !canFleeEncounter)}>도망치기</button>}
              {!hasEncounteredMonster && !isBattleInProgress && !isStartingBattle && <button className="btn primary" type="button" onClick={() => void handleEncounter()} disabled={!canEncounter}>
                {isEncountering ? "찾는 중.." : isResolving ? "탐색 중..." : remainingTenths > 0 ? "도망치는 중.." : isRetreatLocked ? "후퇴 후 회복 중.." : isRecoveryLocked ? "회복 중..." : "몬스터 찾기"}
              </button>}
              {hasEncounteredMonster && !isStartingBattle && <button className="btn primary" type="button" onClick={handleHunt} disabled={!canStartBattle}>
                {isSubmitting ? "전투 준비 중..." : "전투 시작"}
              </button>}
              {(isBattleInProgress || isStartingBattle) && <button className="btn primary" type="button" disabled>
                전투 중...
              </button>}
            </div>
          </div>
          <div className="combat-hp-grid">
            <CombatHpCard
              label="PLAYER"
              name={result ? `LV.${result.player.level} ${result.player.name}` : `LV.${character.level} ${character.name}`}
              currentHp={playerHp}
              maxHp={result?.player.maxHp ?? huntState?.playerMaxHp ?? combatStats.maxHp}
              shield={playerShield}
              detail={{ value: `EXP ${displayExperience.toLocaleString()} / ${requiredExperience.toLocaleString()}`, percent: experiencePercent, isExperience: true }}
              linkToCharacter
            />
            <CombatHpCard
              label="ENEMY"
              name={result ? `LV.${result.enemy.level} ${result.enemy.name}` : "???"}
              currentHp={result ? targetHp : null}
              maxHp={result ? dummyMaxHp : null}
              shield={enemyShield}
              onInfoClick={result?.enemy.info ? () => setIsMonsterInfoOpen((current) => !current) : undefined}
              isInfoOpen={isMonsterInfoOpen}
              isExpanded={isMonsterInfoOpen}
              expandedContent={result?.enemy.info ? <MonsterInfoStats info={result.enemy.info} /> : null}
            />
          </div>
          <ol className="combat-log" aria-label="전투 로그" ref={logRef}>
            {result ? (
              <>
                {displayedLogs.map((log, index) => (
                  <li className={`is-${log.kind}`} key={`${log.timeTenths}-${log.kind}-${index}`}>
                    <time className={getLogTimeTone(log.entries[0])}>[{formatTime(log.timeTenths)}]</time>
                    <span>{log.kind === "combined_regeneration" ? formatCombinedRegeneration(log.entries) : formatLogEntry(log.entries[0], result.player.name, result.enemy.name, result.enemy.level, result.gainedExperience, result.gainedCredits ?? result.rewards?.credits ?? 0)}</span>
                  </li>
                ))}
              </>
            ) : (
              <li className="is-empty">{hasEncounteredMonster ? "조우 완료. 전투를 시작하세요." : "몬스터 찾기를 기다리고 있습니다."}</li>
            )}
          </ol>
      </article>
      {lastResult && <HuntResultPanel result={lastResult} />}
    </section>
  );
}

function CombatHpCard({
  label,
  name,
  currentHp,
  maxHp,
  shield = 0,
  detail,
  linkToCharacter = false,
  onInfoClick,
  isInfoOpen = false,
  isExpanded = false,
  expandedContent,
}: {
  label: string;
  name: string;
  currentHp: number | null;
  maxHp: number | null;
  shield?: number;
  detail?: { value: string; percent: number; isUnknown?: boolean; isExperience?: boolean };
  linkToCharacter?: boolean;
  onInfoClick?: () => void;
  isInfoOpen?: boolean;
  isExpanded?: boolean;
  expandedContent?: ReactNode;
}) {
  const isUnknown = currentHp === null || maxHp === null;
  const hpPercent = isUnknown ? 0 : Math.max(0, Math.min(100, (currentHp / maxHp) * 100));
  const shieldPercent = isUnknown ? 0 : Math.max(0, Math.min(100 - hpPercent, (shield / maxHp) * 100));

  return (
    <div className="combat-hp-card">
      <span>{label}</span>
      <strong>{name}</strong>
      {linkToCharacter && (
        <Link className="combat-character-link" to="/character" aria-label="캐릭터 정보 보기">
          <svg aria-hidden="true" viewBox="0 0 16 16">
            <path d="M6.5 3.5h6v6M12.5 3.5 7 9m3 3.5H3.5v-6" />
          </svg>
        </Link>
      )}
      {onInfoClick && (
        <button className="combat-info-button" type="button" onClick={onInfoClick} aria-label={`${name} 정보 보기`} aria-expanded={isInfoOpen}>
          <svg aria-hidden="true" viewBox="0 0 16 16">
            <circle cx="8" cy="8" r="5.5" />
            <path d="M8 7v3.5M8 5.2h.01" />
          </svg>
        </button>
      )}
      <div className={`combat-hp ${isUnknown ? "is-unknown" : ""}`} role="progressbar" aria-label={`${name} 체력`} aria-valuemin={0} aria-valuemax={maxHp ?? undefined} aria-valuenow={currentHp ?? undefined}>
        {!isUnknown && <i style={{ width: `${hpPercent}%` }} />}
        {!isUnknown && shieldPercent > 0 && <em style={{ left: `${hpPercent}%`, width: `${shieldPercent}%` }} />}
      </div>
      <b>{isUnknown ? "HP ???" : `HP ${formatAmount(currentHp ?? 0)} / ${formatAmount(maxHp ?? 0)}${shield > 0 ? ` +${formatAmount(shield)} SH` : ""}`}</b>
      {detail && <CombatDetail {...detail} />}
      {expandedContent && <div className={`combat-card-expansion ${isExpanded ? "is-expanded" : ""}`}><div>{expandedContent}</div></div>}
    </div>
  );
}

function MonsterInfoStats({ info }: { info: MonsterInfo }) {
  return (
    <div className="combat-stat-grid monster-info-stats">
      <MonsterCombatStat {...COMBAT_STAT_LABELS.physicalAttack} value={info.physicalAttack} />
      <MonsterCombatStat {...COMBAT_STAT_LABELS.magicAttack} value={info.magicAttack} />
      <MonsterCombatStat {...COMBAT_STAT_LABELS.physicalDefense} value={info.physicalDefense} />
      <MonsterCombatStat {...COMBAT_STAT_LABELS.magicDefense} value={info.magicDefense} />
      <MonsterCombatStat {...COMBAT_STAT_LABELS.maxHp} value={info.maxHp} />
      <MonsterCombatStat {...COMBAT_STAT_LABELS.regeneration} value={(info.regeneration / info.maxHp) * 100} suffix="%/초" digits={1} />
      <MonsterCombatStat {...COMBAT_STAT_LABELS.attackSpeed} value={info.attacksPerSecond} digits={2} />
      <MonsterCombatStat {...COMBAT_STAT_LABELS.cooldownReduction} value={info.cooldownReduction * 100} suffix="%" digits={1} />
      <MonsterCombatStat {...COMBAT_STAT_LABELS.accuracy} value={info.accuracy} />
      <MonsterCombatStat {...COMBAT_STAT_LABELS.evasionRate} value={info.evasionRate} suffix="%" digits={1} />
      <MonsterCombatStat {...COMBAT_STAT_LABELS.criticalChance} value={info.criticalChance} suffix="%" digits={1} />
      <MonsterCombatStat {...COMBAT_STAT_LABELS.criticalDamage} value={info.criticalDamage} suffix="%" />
    </div>
  );
}

function MonsterCombatStat({ label, shortLabel, value, suffix = "", digits = 0 }: { label: string; shortLabel?: string; value: number; suffix?: string; digits?: number }) {
  return (
    <div className="combat-stat">
      <span className="combat-label">
        <span className="combat-label-full">{label}</span>
        <span className="combat-label-short">{shortLabel ?? label}</span>
      </span>
      <strong><b>{formatCombatStat(value, digits)}{suffix}</b></strong>
    </div>
  );
}

function formatCombatStat(value: number, digits: number) {
  return digits > 0 ? value.toFixed(digits) : Math.round(value).toLocaleString();
}

function formatRecommendedLevel(ground: HuntGround) {
  return `추천 LV.${ground.recommendedMinLevel}–${ground.recommendedMaxLevel}`;
}

function formatEquipmentReward(equipment: NonNullable<HuntResult["rewards"]>["equipment"]) {
  if (!equipment) return "";
  if (equipment.kind === "weapon") return `LV.${equipment.level} ${getWeaponLabel(equipment.type)}`;
  return `LV.${equipment.level} ${getArmorLabel(equipment.type)}`;
}

function getWeaponLabel(weaponType: string) {
  if (weaponType === "longsword") return "장검";
  if (weaponType === "greatsword") return "대검";
  if (weaponType === "dagger") return "단검";
  if (weaponType === "bow") return "활";
  if (weaponType === "wand") return "완드";
  if (weaponType === "staff") return "스태프";
  return weaponType;
}

function getArmorLabel(armorType: string) {
  if (armorType === "plate") return "판금갑옷";
  if (armorType === "leather") return "가죽갑옷";
  if (armorType === "robe") return "로브";
  return armorType;
}

function CombatDetail({ value, percent, isUnknown = false, isExperience = false }: { value: string; percent: number; isUnknown?: boolean; isExperience?: boolean }) {
  if (isUnknown && !value) {
    return <div className="combat-card-detail is-empty" aria-hidden="true" />;
  }

  return (
    <div className={`combat-card-detail ${isExperience ? "is-experience" : ""}`}>
      <i className={isUnknown ? "is-unknown" : ""}><strong style={{ width: `${Math.max(0, Math.min(100, percent))}%` }} /></i>
      <b>{value}</b>
    </div>
  );
}

function HuntResultPanel({ result }: { result: HuntResult }) {
  const fledAt = getFleeTenths(result);
  const durationTicks = result.status === "fled" ? fledAt : result.durationTicks;
  const totalDamage = result.status === "fled"
    ? result.logs.filter((entry) => entry.timeTenths <= fledAt && (entry.kind === "attack" || entry.kind === "critical")).reduce((total, entry) => total + entry.amount, 0)
    : result.totalDamage;
  const resultStatus = result.status === "fled" ? "도망침" : result.status === "timed_out" ? "시간 초과" : result.status === "defeated" ? "전투에서 패배했습니다." : null;
  const seconds = durationTicks / 10;
  const dps = seconds > 0 ? (totalDamage / seconds).toFixed(1) : "0.0";
  const credits = result.gainedCredits ?? result.rewards?.credits ?? 0;
  const equipmentReward = result.rewards?.equipment;
  const essenceReward = result.rewards?.essence;

  return (
    <article className="panel last-battle-result-panel">
      <div className="panel-head compact">
        <span>LAST BATTLE</span>
        <h2>마지막 전투 결과</h2>
      </div>
      <div className="hunt-result-summary">
        <Kv label="전투 시간" value={formatTime(durationTicks)} />
        <Kv label="DPS" value={dps} />
        <Kv label={resultStatus ? "전투 결과" : "경험치"} value={resultStatus ?? `+${result.gainedExperience} EXP`} />
        {!resultStatus && <Kv label="크레딧" value={`+${credits.toLocaleString()} CR`} />}
        {!resultStatus && equipmentReward && <Kv label="장비" value={formatEquipmentReward(equipmentReward)} />}
        {!resultStatus && essenceReward && <Kv label="정수" value={`${essenceReward.name} I`} />}
      </div>
    </article>
  );
}

function Kv({ label, value }: { label: string; value: string }) {
  return <div><span>{label}</span><strong>{value}</strong></div>;
}

function formatLogEntry(entry: HuntLogEntry, playerName: string, enemyName: string, enemyLevel: number, gainedExperience: number, gainedCredits: number): ReactNode {
  const damage = <b className="combat-log-damage">-{formatAmount(entry.amount)} HP</b>;
  const recovery = <b className="combat-log-recovery">+{formatAmount(entry.amount)} HP</b>;
  const essenceUser = entry.source === "enemy" ? enemyName : playerName;
  const essenceName = entry.name ?? "정수";
  const essenceGrade = entry.grade ? formatEssenceGrade(entry.grade) : "";
  if (entry.kind === "encounter") return `LV.${enemyLevel} ${enemyName}과 조우했습니다.`;
  if (entry.kind === "defeat") return `전투 승리 +${gainedExperience} EXP · +${gainedCredits} CR`;
  if (entry.kind === "player_defeat") return "전투에서 패배했습니다.";
  if (entry.kind === "fled") return "전투에서 도망쳤습니다.";
  if (entry.kind === "timeout") return "시간 초과 · 전투 종료";
  if (entry.kind === "essence_cast") return <><b className={entry.source === "enemy" ? "combat-log-enemy" : "combat-log-player"}>{essenceUser}</b> {essenceName} {essenceGrade} 발동</>;
  if (entry.kind === "essence_damage") return <><b className={entry.source === "enemy" ? "combat-log-enemy" : "combat-log-player"}>{essenceName}</b> 피해 <i className={`combat-log-arrow ${entry.source === "enemy" ? "is-enemy" : "is-player"}`}>≫</i> {damage}</>;
  if (entry.kind === "essence_shield") return <><b className={entry.source === "enemy" ? "combat-log-enemy" : "combat-log-player"}>{essenceUser}</b> 방어막 <b className="combat-log-recovery">+{formatAmount(entry.amount)}</b></>;
  if (entry.kind === "shield_absorb") return <><b className={entry.target === "enemy" ? "combat-log-enemy" : "combat-log-player"}>{entry.target === "enemy" ? enemyName : playerName}</b> 방어막 흡수 <b className="combat-log-shield">-{formatAmount(entry.amount)} SH</b></>;
  if (entry.kind === "essence_extra_hit") return <><b className={entry.source === "enemy" ? "combat-log-enemy" : "combat-log-player"}>{essenceName}</b> 추가타 <i className={`combat-log-arrow ${entry.source === "enemy" ? "is-enemy" : "is-player"}`}>≫</i> {damage}</>;
  if (entry.kind === "essence_reflect") return <><b className="combat-log-enemy">{essenceName}</b> 반격 <i className="combat-log-arrow is-enemy">≫</i> {damage}</>;
  if (entry.kind === "miss") return <><b className="combat-log-player">{playerName}</b> 공격이 빗나갔습니다.</>;
  if (entry.kind === "enemy_miss") return <><b className="combat-log-enemy">{enemyName}</b> 공격을 <b className="combat-log-evasion">회피</b>했습니다.</>;
  if (entry.kind === "regeneration") return <><b className="combat-log-enemy">{enemyName}</b> 재생 {recovery}</>;
  if (entry.kind === "player_regeneration") return <><b className="combat-log-player">{playerName}</b> 재생 {recovery}</>;
  if (entry.kind === "enemy_attack") return <><b className="combat-log-enemy">{enemyName}</b> 공격 <i className="combat-log-arrow is-enemy">≫</i> {damage}</>;
  if (entry.kind === "reflect") return <><b className="combat-log-player">{playerName}</b> 반사 피해 <i className="combat-log-arrow is-player">≫</i> {damage}</>;
  if (entry.kind === "critical") return <><b className="combat-log-player">{playerName}</b> <b className="combat-log-critical">치명타</b> <i className="combat-log-arrow is-player">≫</i> {damage}</>;
  return <><b className="combat-log-player">{playerName}</b> 공격 <i className="combat-log-arrow is-player">≫</i> {damage}</>;
}

function getLogTimeTone(entry: HuntLogEntry) {
  if (entry.kind === "enemy_attack" || entry.kind === "enemy_miss" || (entry.kind.startsWith("essence_") && entry.source === "enemy")) return "is-enemy-action";
  if (entry.kind === "attack" || entry.kind === "critical" || entry.kind === "miss" || entry.kind === "reflect" || (entry.kind.startsWith("essence_") && entry.source === "player")) return "is-player-action";
  return "";
}

function groupCombatLogs(logs: HuntLogEntry[]) {
  const groups: Array<{ kind: HuntLogEntry["kind"] | "combined_regeneration"; timeTenths: number; entries: HuntLogEntry[] }> = [];
  for (const entry of logs) {
    const previous = groups[groups.length - 1];
    const isRegeneration = entry.kind === "regeneration" || entry.kind === "player_regeneration";
    if (isRegeneration && previous?.kind === "combined_regeneration" && previous.timeTenths === entry.timeTenths) {
      previous.entries.push(entry);
      continue;
    }
    groups.push({ kind: isRegeneration ? "combined_regeneration" : entry.kind, timeTenths: entry.timeTenths, entries: [entry] });
  }
  return groups;
}

function formatCombinedRegeneration(entries: HuntLogEntry[]): ReactNode {
  const player = entries.find((entry) => entry.kind === "player_regeneration");
  const enemy = entries.find((entry) => entry.kind === "regeneration");
  return <>
    재생
    {player && <> <i className="combat-log-arrow is-player">≫</i> <b className="combat-log-recovery">+{formatAmount(player.amount)} HP</b></>}
    {enemy && <> <i className="combat-log-arrow is-enemy">≫</i> <b className="combat-log-recovery">+{formatAmount(enemy.amount)} HP</b></>}
  </>;
}

function formatTime(tenths: number) {
  return `${(tenths / 10).toFixed(1)}s`;
}

function formatAmount(value: number) {
  return Number.isInteger(value) ? value.toLocaleString() : value.toFixed(1);
}

function formatEssenceGrade(grade: number) {
  return ["", "I", "II", "III", "IV", "V"][grade] ?? `${grade}`;
}

function getRecoveredPlayerHp(huntState: HuntState | null, now: number) {
  const startHp = huntState?.playerRecoveryStartHp;
  const maxHp = huntState?.playerMaxHp;
  const startedAt = huntState?.playerRecoveryStartedAt;
  const recoveryEndsAt = huntState?.recoveryEndsAt;
  if (startHp === null || startHp === undefined || maxHp === null || maxHp === undefined || !startedAt || !recoveryEndsAt) return null;

  const startedAtMs = Date.parse(startedAt);
  const recoveryEndsAtMs = Date.parse(recoveryEndsAt);
  if (Number.isNaN(startedAtMs) || Number.isNaN(recoveryEndsAtMs)) return null;
  if (now >= recoveryEndsAtMs) return maxHp;

  const recoveredSteps = Math.max(0, Math.floor((now - startedAtMs) / 1000));
  const recoveryDurationSeconds = Math.round((recoveryEndsAtMs - startedAtMs) / 1000);
  if (recoveryDurationSeconds >= 10) {
    return Math.min(maxHp, Math.floor(startHp + ((maxHp - startHp) * recoveredSteps / recoveryDurationSeconds)));
  }
  return Math.min(maxHp, Math.floor(startHp + (maxHp * 0.2 * recoveredSteps)));
}

function getVisibleShield(logs: HuntLogEntry[], target: "player" | "enemy", playbackTenths: number) {
  const shieldLog = [...logs].reverse().find((entry) => entry.kind === "essence_shield" && entry.target === target);
  if (!shieldLog || playbackTenths > shieldLog.timeTenths + 40) return 0;

  return logs
    .filter((entry) => entry.timeTenths > shieldLog.timeTenths && entry.timeTenths <= playbackTenths && entry.target === target)
    .reduce((remaining, entry) => {
      if (remaining <= 0) return 0;
      if (entry.kind === "shield_absorb") {
        return Math.max(0, remaining - entry.amount);
      }
      return remaining;
    }, shieldLog.amount);
}

function getElapsedTenths(startedAt: string, durationTicks: number, now = Date.now()) {
  const startedAtMs = Date.parse(startedAt);
  if (Number.isNaN(startedAtMs)) return durationTicks;
  return Math.max(0, Math.min(durationTicks, Math.floor((now - startedAtMs) / 100)));
}

function getFleeTenths(result: HuntResult) {
  for (let index = result.logs.length - 1; index >= 0; index -= 1) {
    if (result.logs[index].kind === "fled") return result.logs[index].timeTenths;
  }
  return result.durationTicks;
}
