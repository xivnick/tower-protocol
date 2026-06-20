import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { fleeTrainingDummyHunt, getMyHuntState, getTrainingDummyInfo, huntTrainingDummy, selectHuntGround, settleTrainingDummyHunt } from "../../api/characterApi";
import type { HuntLogEntry, HuntResult, HuntState, MonsterInfo } from "../../api/characterApi";
import { formatCharacterLevel, getRequiredExperienceForLevel } from "../../shared/progression";
import { calculateCombatStats, COMBAT_STAT_LABELS } from "../../shared/stats";
import type { Character } from "../../types/character";
import type { ToastInput } from "../../types/toast";

const trainingDummy = {
  maxHp(level: number) {
    const vitality = 10 + ((level - 1) * 5);
    return 100 + (level * 20) + (vitality * 10);
  },
};

const HUNT_GROUNDS = [
  { id: "training-dummy", name: "허수아비 훈련장", recommendedLevel: "추천 LV.1–100" },
  { id: "wooden-doll", name: "목각인형 훈련장", recommendedLevel: "추천 LV.1–100" },
];

export function HuntScreen({
  character,
  onCharacterChange,
  onCharacterRefresh,
  onHuntStateChange,
  onToast,
}: {
  character: Character | null;
  onCharacterChange: (character: Character | null) => void;
  onCharacterRefresh: () => Promise<boolean>;
  onHuntStateChange: (huntState: HuntState | null) => void;
  onToast: (toast: ToastInput) => void;
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

  return <TrainingDummyGround character={character} onCharacterChange={onCharacterChange} onCharacterRefresh={onCharacterRefresh} onHuntStateChange={onHuntStateChange} onToast={onToast} />;
}

function TrainingDummyGround({
  character,
  onCharacterChange,
  onCharacterRefresh,
  onHuntStateChange,
  onToast,
}: {
  character: Character;
  onCharacterChange: (character: Character | null) => void;
  onCharacterRefresh: () => Promise<boolean>;
  onHuntStateChange: (huntState: HuntState | null) => void;
  onToast: (toast: ToastInput) => void;
}) {
  const [result, setResult] = useState<HuntResult | null>(null);
  const [lastResult, setLastResult] = useState<HuntResult | null>(null);
  const [message, setMessage] = useState("");
  const [huntState, setHuntState] = useState<HuntState | null>(null);
  const [monsterInfo, setMonsterInfo] = useState<MonsterInfo | null>(null);
  const [isMonsterInfoOpen, setIsMonsterInfoOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResolving, setIsResolving] = useState(false);
  const [isLocationMenuOpen, setIsLocationMenuOpen] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [playbackTenths, setPlaybackTenths] = useState(0);
  const recoveryToastRef = useRef<string | null>(null);
  const logRef = useRef<HTMLOListElement>(null);
  const completedResultRef = useRef<HuntResult | null>(null);
  const settlementAttemptRef = useRef<string | null>(null);
  const huntAvailableAt = result?.huntState?.availableAt ?? huntState?.availableAt;
  const availableAt = huntAvailableAt ? Date.parse(huntAvailableAt) : 0;
  const remainingTenths = Math.max(0, Math.ceil((availableAt - now) / 100));
  const combatStats = calculateCombatStats(character);
  const visibleLogs = useMemo(() => result?.logs.filter((entry) => entry.timeTenths <= playbackTenths) ?? [], [playbackTenths, result]);
  const selectedGroundId = huntState?.selectedHuntGroundId ?? "training-dummy";
  const selectedGround = HUNT_GROUNDS.find((ground) => ground.id === selectedGroundId) ?? HUNT_GROUNDS[0];
  const dummyMaxHp = result?.enemy.maxHp ?? monsterInfo?.maxHp ?? trainingDummy.maxHp(character.level);
  const enemyLogs = visibleLogs.filter((entry) => entry.target !== "player");
  const playerLogs = visibleLogs.filter((entry) => entry.target === "player");
  const targetHp = enemyLogs.length > 0 ? enemyLogs[enemyLogs.length - 1].targetHp : dummyMaxHp;
  const playerHp = playerLogs.length > 0 ? playerLogs[playerLogs.length - 1].targetHp : result?.player.startHp ?? huntState?.playerCurrentHp ?? result?.player.maxHp ?? combatStats.maxHp;
  const isBattleInProgress = result?.status === "in_progress";
  const isGoingToDifferentGround = Boolean(isBattleInProgress && result && selectedGroundId !== result.huntGroundId);
  const isPlaybackComplete = Boolean(result && (!isBattleInProgress || playbackTenths >= result.durationTicks));
  const isDefeatRecovering = Boolean(huntState?.isDefeatRecovery && huntState.recoveryEndsAt && Date.parse(huntState.recoveryEndsAt) > now);
  const canHunt = !isSubmitting && !isResolving && remainingTenths === 0 && (!result || !isBattleInProgress);
  const canFlee = Boolean(result && isBattleInProgress && !isResolving && playbackTenths < result.durationTicks);
  const displayLevel = result ? (isPlaybackComplete ? result.levelAfter : result.player.level) : character.level;
  const displayExperience = result ? (isPlaybackComplete ? result.experienceAfter : result.player.experience ?? 0) : character.experience;
  const requiredExperience = getRequiredExperienceForLevel(displayLevel + 1) ?? 1;
  const experiencePercent = displayLevel >= 100 ? 100 : (displayExperience / requiredExperience) * 100;

  useEffect(() => {
    let isActive = true;

    void getMyHuntState().then((nextState) => {
      if (!isActive || !nextState.ok || !nextState.state) return;

      setHuntState(nextState.state);
      const battle = nextState.state.lastBattle;
      if (!battle) return;

      const restoredResult = { ok: true, character: null, huntState: nextState.state, ...battle, message: "" };
      onHuntStateChange(nextState.state);
      setResult(restoredResult);
      if (battle.status !== "in_progress") setLastResult(restoredResult);
      setPlaybackTenths(getElapsedTenths(battle.startedAt, battle.durationTicks));
    });

    return () => { isActive = false; };
  }, []);

  useEffect(() => {
    let isActive = true;
    void getTrainingDummyInfo().then((nextInfo) => {
      if (isActive && nextInfo.ok) setMonsterInfo(nextInfo.info);
    });
    return () => { isActive = false; };
  }, [character.level]);

  useEffect(() => {
    if (remainingTenths === 0 && !isDefeatRecovering) return;

    const intervalId = window.setInterval(() => setNow(Date.now()), 100);
    return () => window.clearInterval(intervalId);
  }, [isDefeatRecovering, remainingTenths]);

  useEffect(() => {
    const recoveryEndsAt = huntState?.recoveryEndsAt;
    if (!recoveryEndsAt || Date.parse(recoveryEndsAt) > now || recoveryToastRef.current === recoveryEndsAt) return;
    recoveryToastRef.current = recoveryEndsAt;
    onToast({ message: "체력이 모두 회복되었습니다.", tone: "system" });
  }, [huntState?.recoveryEndsAt, now, onToast]);

  useEffect(() => {
    if (!result || !isBattleInProgress || isPlaybackComplete) return;

    const intervalId = window.setInterval(() => {
      setPlaybackTenths((current) => Math.min(current + 1, result.durationTicks));
    }, 100);

    return () => window.clearInterval(intervalId);
  }, [isBattleInProgress, isPlaybackComplete, result]);

  useEffect(() => {
    if (visibleLogs.length > 0 && logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [visibleLogs.length]);

  useEffect(() => {
    if (!result || !isPlaybackComplete || completedResultRef.current === result) return;

    if (result.status === "timed_out") {
      if (!result.character) return;
      completedResultRef.current = result;
      onCharacterChange(result.character);
      onToast({ message: "시간 제한에 도달해 전투를 종료했습니다.", tone: "system" });
      return;
    }

    if (result.status === "defeated") {
      if (!result.character) return;
      completedResultRef.current = result;
      onCharacterChange(result.character);
      onToast({ message: "패배..", tone: "error" });
      return;
    }

    if (result.status !== "victory") return;

    if (!result.character) return;

    completedResultRef.current = result;
    onCharacterChange(result.character);
    onToast({ message: `전투 완료 · +${result.gainedExperience} EXP`, tone: "system" });

    if (result.levelAfter > result.levelBefore) {
      onToast({ message: `레벨업! -> LV.${result.levelAfter}`, tone: "epic" });
    }
  }, [isPlaybackComplete, onCharacterChange, onToast, result]);

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
          setMessage(nextResult.message);
          return;
        }
        setHuntState(nextResult.huntState);
        onHuntStateChange(nextResult.huntState);
        setResult(nextResult);
        setLastResult(nextResult);
      });
    }, 180);

    return () => {
      isActive = false;
      window.clearTimeout(timeoutId);
    };
  }, [isPlaybackComplete, result]);

  async function handleHunt() {
    if (!canHunt) return;

    setIsSubmitting(true);
    setMessage("");
    setResult(null);
    setPlaybackTenths(0);
    const nextResult = await huntTrainingDummy();
    setIsSubmitting(false);

    if (!nextResult.ok) {
      setMessage(nextResult.message);
      onToast({ message: nextResult.message, tone: "error" });
      void onCharacterRefresh();
      return;
    }

    completedResultRef.current = null;
    settlementAttemptRef.current = null;
    setHuntState(nextResult.huntState);
    onHuntStateChange(nextResult.huntState);
    setResult(nextResult);
  }

  async function handleGroundChange(huntGroundId: string) {
    setIsLocationMenuOpen(false);
    if (huntGroundId === selectedGroundId) return;
    const nextState = await selectHuntGround(huntGroundId);
    if (!nextState.ok || !nextState.state) {
      setMessage(nextState.message);
      return;
    }
    setHuntState(nextState.state);
    onHuntStateChange(nextState.state);
  }

  async function handleFlee() {
    if (!canFlee || !result) return;

    const previousLastResult = lastResult;
    setIsResolving(true);
    setMessage("");
    setLastResult({ ...result, status: "fled", durationTicks: playbackTenths });
    const nextResult = await fleeTrainingDummyHunt();
    setIsResolving(false);

    if (!nextResult.ok) {
      setLastResult(previousLastResult);
      setMessage(nextResult.message);
      onToast({ message: nextResult.message, tone: "error" });
      return;
    }

    setHuntState(nextResult.huntState);
    onHuntStateChange(nextResult.huntState);
    setResult(nextResult);
    setPlaybackTenths(getFleeTenths(nextResult));
    onToast({ message: nextResult.message, tone: "system" });
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
          <small>{selectedGround.recommendedLevel}</small>
          <svg className="hunt-location-icon" aria-hidden="true" viewBox="0 0 16 16">
            <path d="m4 6 4 4 4-4" />
          </svg>
        </button>
        {isLocationMenuOpen && (
          <div className="hunt-location-menu" id="hunt-location-menu" role="menu" aria-label="사냥터 선택">
            {HUNT_GROUNDS.map((ground) => (
              <button
                className={ground.id === selectedGroundId ? "is-selected" : ""}
                type="button"
                role="menuitemradio"
                aria-checked={ground.id === selectedGroundId}
                key={ground.id}
                onClick={() => void handleGroundChange(ground.id)}
              >
                <strong>{ground.name}</strong>
                <small>{ground.recommendedLevel}</small>
              </button>
            ))}
          </div>
        )}
      </div>
      <article className="panel combat-record-panel">
          <div className="panel-head compact action-head">
            <div>
              <span>COMBAT</span>
              <h2>전투</h2>
            </div>
            <div className="hunt-action-buttons">
              {canFlee && <button className="btn ghost" type="button" onClick={handleFlee} disabled={isResolving}>도망치기</button>}
              <button className="btn primary" type="button" onClick={handleHunt} disabled={!canHunt}>
                {isSubmitting || isResolving || isBattleInProgress ? "전투 중..." : "전투 시작"}
              </button>
            </div>
          </div>
          <div className="combat-hp-grid">
            <CombatHpCard
              label="PLAYER"
              name={result ? `LV.${result.player.level} ${result.player.name}` : `LV.${character.level} ${character.name}`}
              currentHp={playerHp}
              maxHp={result?.player.maxHp ?? huntState?.playerMaxHp ?? combatStats.maxHp}
              detail={{ value: `EXP ${displayExperience.toLocaleString()} / ${requiredExperience.toLocaleString()}`, percent: experiencePercent, isExperience: true }}
              linkToCharacter
            />
            <CombatHpCard
              label="ENEMY"
              name={result ? `LV.${result.enemy.level} ${result.enemy.name}` : "???"}
              currentHp={result ? targetHp : null}
              maxHp={result ? dummyMaxHp : null}
              onInfoClick={() => setIsMonsterInfoOpen((current) => !current)}
              isInfoOpen={isMonsterInfoOpen}
              isExpanded={isMonsterInfoOpen}
              expandedContent={monsterInfo ? <MonsterInfoStats info={monsterInfo} /> : null}
            />
          </div>
          {message && <p className="panel-message is-error" role="status">{message}</p>}
          <ol className="combat-log" aria-label="전투 로그" ref={logRef}>
            {result ? (
              <>
                {visibleLogs.map((entry, index) => (
                  <li className={`is-${entry.kind}`} key={`${entry.timeTenths}-${entry.kind}-${index}`}>
                    <time>[{formatTime(entry.timeTenths)}]</time>
                    <span>{formatLogEntry(entry, result.enemy.name, result.gainedExperience)}</span>
                  </li>
                ))}
              </>
            ) : (
              <li className="is-empty">전투 시작을 기다리고 있습니다.</li>
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
  detail?: { value: string; percent: number; isUnknown?: boolean; isExperience?: boolean };
  linkToCharacter?: boolean;
  onInfoClick?: () => void;
  isInfoOpen?: boolean;
  isExpanded?: boolean;
  expandedContent?: ReactNode;
}) {
  const isUnknown = currentHp === null || maxHp === null;
  const hpPercent = isUnknown ? 0 : Math.max(0, Math.min(100, (currentHp / maxHp) * 100));

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
      </div>
      <b>{isUnknown ? "HP ???" : `HP ${formatAmount(currentHp ?? 0)} / ${formatAmount(maxHp ?? 0)}`}</b>
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
      <MonsterCombatStat {...COMBAT_STAT_LABELS.regeneration} value={info.regeneration} digits={2} />
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
  const resultStatus = result.status === "fled" ? "도망침" : result.status === "timed_out" ? "시간 초과" : result.status === "defeated" ? "패배.." : null;
  const seconds = durationTicks / 10;
  const dps = seconds > 0 ? (totalDamage / seconds).toFixed(1) : "0.0";

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
      </div>
    </article>
  );
}

function Kv({ label, value }: { label: string; value: string }) {
  return <div><span>{label}</span><strong>{value}</strong></div>;
}

function formatLogEntry(entry: HuntLogEntry, enemyName: string, gainedExperience: number) {
  if (entry.kind === "encounter") return `${enemyName}와 조우했습니다.`;
  if (entry.kind === "defeat") return `전투 승리 +${gainedExperience} EXP`;
  if (entry.kind === "player_defeat") return "패배..";
  if (entry.kind === "fled") return "전투에서 도망쳤습니다.";
  if (entry.kind === "timeout") return "시간 초과 · 전투 종료";
  if (entry.kind === "regeneration") return `${enemyName} 재생 · +${formatAmount(entry.amount)} HP`;
  if (entry.kind === "enemy_attack") return `${enemyName} 공격 -> 플레이어 · -${formatAmount(entry.amount)} HP`;
  if (entry.kind === "critical") return `치명타! -> ${enemyName} · -${formatAmount(entry.amount)} HP`;
  return `일반 공격 -> ${enemyName} · -${formatAmount(entry.amount)} HP`;
}

function formatTime(tenths: number) {
  return `${(tenths / 10).toFixed(1)}s`;
}

function formatAmount(value: number) {
  return Number.isInteger(value) ? value.toLocaleString() : value.toFixed(1);
}

function getElapsedTenths(startedAt: string, durationTicks: number) {
  const startedAtMs = Date.parse(startedAt);
  if (Number.isNaN(startedAtMs)) return durationTicks;
  return Math.max(0, Math.min(durationTicks, Math.floor((Date.now() - startedAtMs) / 100)));
}

function getFleeTenths(result: HuntResult) {
  for (let index = result.logs.length - 1; index >= 0; index -= 1) {
    if (result.logs[index].kind === "fled") return result.logs[index].timeTenths;
  }
  return result.durationTicks;
}
