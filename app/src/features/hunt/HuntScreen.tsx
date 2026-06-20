import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { fleeTrainingDummyHunt, getMyHuntState, huntTrainingDummy, settleTrainingDummyHunt } from "../../api/characterApi";
import type { HuntLogEntry, HuntResult, HuntState } from "../../api/characterApi";
import { formatCharacterLevel, getRequiredExperienceForLevel } from "../../shared/progression";
import { calculateCombatStats } from "../../shared/stats";
import type { Character } from "../../types/character";
import type { ToastInput } from "../../types/toast";

const trainingDummy = {
  maxHp(level: number) {
    const vitality = 10 + ((level - 1) * 5);
    return 100 + (level * 20) + (vitality * 10);
  },
};

export function HuntScreen({
  character,
  onCharacterChange,
  onCharacterRefresh,
  onToast,
}: {
  character: Character | null;
  onCharacterChange: (character: Character | null) => void;
  onCharacterRefresh: () => Promise<boolean>;
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

  return <TrainingDummyGround character={character} onCharacterChange={onCharacterChange} onCharacterRefresh={onCharacterRefresh} onToast={onToast} />;
}

function TrainingDummyGround({
  character,
  onCharacterChange,
  onCharacterRefresh,
  onToast,
}: {
  character: Character;
  onCharacterChange: (character: Character | null) => void;
  onCharacterRefresh: () => Promise<boolean>;
  onToast: (toast: ToastInput) => void;
}) {
  const [result, setResult] = useState<HuntResult | null>(null);
  const [message, setMessage] = useState("");
  const [huntState, setHuntState] = useState<HuntState | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResolving, setIsResolving] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [playbackTenths, setPlaybackTenths] = useState(0);
  const logRef = useRef<HTMLOListElement>(null);
  const completedResultRef = useRef<HuntResult | null>(null);
  const settlementAttemptRef = useRef<string | null>(null);
  const huntAvailableAt = result?.huntState?.availableAt ?? huntState?.availableAt;
  const availableAt = huntAvailableAt ? Date.parse(huntAvailableAt) : 0;
  const remainingTenths = Math.max(0, Math.ceil((availableAt - now) / 100));
  const combatStats = calculateCombatStats(character);
  const visibleLogs = useMemo(() => result?.logs.filter((entry) => entry.timeTenths <= playbackTenths) ?? [], [playbackTenths, result]);
  const dummyMaxHp = result?.enemy.maxHp ?? trainingDummy.maxHp(character.level);
  const targetHp = visibleLogs.length > 0 ? visibleLogs[visibleLogs.length - 1].targetHp : dummyMaxHp;
  const isBattleInProgress = result?.status === "in_progress";
  const isPlaybackComplete = Boolean(result && (!isBattleInProgress || playbackTenths >= result.durationTicks));
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

      setResult({ ok: true, character: null, huntState: nextState.state, ...battle, message: "" });
      setPlaybackTenths(getElapsedTenths(battle.startedAt, battle.durationTicks));
    });

    return () => { isActive = false; };
  }, []);

  useEffect(() => {
    if (remainingTenths === 0) return;

    const intervalId = window.setInterval(() => setNow(Date.now()), 100);
    return () => window.clearInterval(intervalId);
  }, [remainingTenths]);

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
    if (!result || result.status !== "victory" || !isPlaybackComplete || completedResultRef.current === result) return;

    if (!result.character) return;

    completedResultRef.current = result;
    onCharacterChange(result.character);
    onToast({ message: `전투 완료 · 경험치 +${result.gainedExperience}`, tone: "system" });

    if (result.levelAfter > result.levelBefore) {
      onToast({ message: `레벨업! -> LV.${result.levelAfter}`, tone: "epic" });
    }
  }, [isPlaybackComplete, onCharacterChange, onToast, result]);

  useEffect(() => {
    if (!result || result.status !== "in_progress" || !isPlaybackComplete || isResolving || settlementAttemptRef.current === result.startedAt) return;

    let isActive = true;
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
      setResult(nextResult);
    });

    return () => { isActive = false; };
  }, [isPlaybackComplete, isResolving, result]);

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
    setResult(nextResult);
  }

  async function handleFlee() {
    if (!canFlee) return;

    setIsResolving(true);
    setMessage("");
    const nextResult = await fleeTrainingDummyHunt();
    setIsResolving(false);

    if (!nextResult.ok) {
      setMessage(nextResult.message);
      onToast({ message: nextResult.message, tone: "error" });
      return;
    }

    setHuntState(nextResult.huntState);
    setResult(nextResult);
    setPlaybackTenths(getFleeTenths(nextResult));
    onToast({ message: nextResult.message, tone: "system" });
  }

  return (
    <section className="screen-panel hunt-screen">
      <div className="hunt-location-strip">
        <span>LOCATION</span>
        <strong>허수아비 훈련소</strong>
        <small>권장 LV.1–100</small>
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
              currentHp={result?.player.maxHp ?? combatStats.maxHp}
              maxHp={result?.player.maxHp ?? combatStats.maxHp}
              detail={{ label: "경험치", value: `${displayExperience.toLocaleString()} / ${requiredExperience.toLocaleString()} EXP`, percent: experiencePercent }}
              linkToCharacter
            />
            <CombatHpCard
              label="ENEMY"
              name={result ? `LV.${result.enemy.level} ${result.enemy.name}` : "???"}
              currentHp={result ? targetHp : null}
              maxHp={result ? dummyMaxHp : null}
              detail={{ label: "몬스터 정보", value: "???", percent: 0, isUnknown: true }}
            />
          </div>
          {message && <p className="panel-message is-error" role="status">{message}</p>}
          <ol className="combat-log" aria-label="전투 로그" ref={logRef}>
            {result ? (
              <>
                {visibleLogs.map((entry, index) => (
                  <li className={`is-${entry.kind}`} key={`${entry.timeTenths}-${entry.kind}-${index}`}>
                    <time>[{formatTime(entry.timeTenths)}]</time>
                    <span>{formatLogEntry(entry, dummyMaxHp)}</span>
                  </li>
                ))}
              </>
            ) : (
              <li className="is-empty">전투 시작을 기다리고 있습니다.</li>
            )}
          </ol>
          {result && result.status !== "in_progress" && isPlaybackComplete && <HuntResultPanel result={result} />}
      </article>
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
}: {
  label: string;
  name: string;
  currentHp: number | null;
  maxHp: number | null;
  detail?: { label: string; value: string; percent: number; isUnknown?: boolean };
  linkToCharacter?: boolean;
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
      <div className={`combat-hp ${isUnknown ? "is-unknown" : ""}`} role="progressbar" aria-label={`${name} 체력`} aria-valuemin={0} aria-valuemax={maxHp ?? undefined} aria-valuenow={currentHp ?? undefined}>
        {!isUnknown && <i style={{ width: `${hpPercent}%` }} />}
      </div>
      <b>{isUnknown ? "HP ???" : `HP ${formatAmount(currentHp ?? 0)} / ${formatAmount(maxHp ?? 0)}`}</b>
      {detail && <CombatDetail {...detail} />}
    </div>
  );
}

function CombatDetail({ label, value, percent, isUnknown = false }: { label: string; value: string; percent: number; isUnknown?: boolean }) {
  return (
    <div className="combat-card-detail">
      <span>{label}</span>
      <b>{value}</b>
      <i className={isUnknown ? "is-unknown" : ""}><strong style={{ width: `${Math.max(0, Math.min(100, percent))}%` }} /></i>
    </div>
  );
}

function HuntResultPanel({ result }: { result: HuntResult }) {
  const fledAt = getFleeTenths(result);
  const durationTicks = result.status === "fled" ? fledAt : result.durationTicks;
  const totalDamage = result.status === "fled"
    ? result.logs.filter((entry) => entry.timeTenths <= fledAt && (entry.kind === "attack" || entry.kind === "critical")).reduce((total, entry) => total + entry.amount, 0)
    : result.totalDamage;
  const seconds = durationTicks / 10;
  const dps = seconds > 0 ? (totalDamage / seconds).toFixed(1) : "0.0";

  return (
    <section className="hunt-result-section">
      <div className="hunt-result-head">
        <span>COMBAT RESULT</span>
        <strong>{result.status === "fled" ? "도망" : "전투 결과"}</strong>
      </div>
      <div className="hunt-result-summary">
        <Kv label="전투 시간" value={formatTime(durationTicks)} />
        <Kv label="DPS" value={dps} />
        <Kv label="경험치" value={`+${result.gainedExperience} EXP`} />
      </div>
    </section>
  );
}

function Kv({ label, value }: { label: string; value: string }) {
  return <div><span>{label}</span><strong>{value}</strong></div>;
}

function formatLogEntry(entry: HuntLogEntry, dummyMaxHp: number) {
  if (entry.kind === "encounter") return "허수아비와 조우했습니다.";
  if (entry.kind === "defeat") return "허수아비 격파";
  if (entry.kind === "fled") return "전투에서 도망쳤습니다.";
  if (entry.kind === "regeneration") return `허수아비 재생 -> 허수아비 · +${formatAmount(entry.amount)} HP (${formatAmount(entry.targetHp)} / ${dummyMaxHp})`;
  if (entry.kind === "critical") return `치명타! -> 허수아비 · -${entry.amount} HP (${formatAmount(entry.targetHp)} / ${dummyMaxHp})`;
  return `일반 공격 -> 허수아비 · -${entry.amount} HP (${formatAmount(entry.targetHp)} / ${dummyMaxHp})`;
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
