import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { huntTrainingDummy } from "../../api/characterApi";
import type { HuntLogEntry, HuntResult } from "../../api/characterApi";
import { formatCharacterLevel, getRequiredExperienceForLevel } from "../../shared/progression";
import { calculateCombatStats } from "../../shared/stats";
import type { Character } from "../../types/character";
import type { ToastInput } from "../../types/toast";

const trainingDummy = {
  maxHp: 100,
  physicalDefense: 10,
  regenerationPerSecond: 1,
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [playbackTenths, setPlaybackTenths] = useState(0);
  const logRef = useRef<HTMLOListElement>(null);
  const completedResultRef = useRef<HuntResult | null>(null);
  const availableAt = character.hunt_available_at ? Date.parse(character.hunt_available_at) : 0;
  const remainingTenths = Math.max(0, Math.ceil((availableAt - now) / 100));
  const combatStats = calculateCombatStats(character);
  const visibleLogs = useMemo(() => result?.logs.filter((entry) => entry.timeTenths <= playbackTenths) ?? [], [playbackTenths, result]);
  const targetHp = visibleLogs.length > 0 ? visibleLogs[visibleLogs.length - 1].targetHp : trainingDummy.maxHp;
  const isPlaybackComplete = Boolean(result && playbackTenths >= result.durationTicks);
  const canHunt = !isSubmitting && remainingTenths === 0 && (!result || isPlaybackComplete);
  const requiredExperience = getRequiredExperienceForLevel(character.level + 1) ?? 1;
  const experiencePercent = character.level >= 100 ? 100 : (character.experience / requiredExperience) * 100;

  useEffect(() => {
    if (remainingTenths === 0) return;

    const intervalId = window.setInterval(() => setNow(Date.now()), 100);
    return () => window.clearInterval(intervalId);
  }, [remainingTenths]);

  useEffect(() => {
    if (!result) return;

    const intervalId = window.setInterval(() => {
      setPlaybackTenths((current) => Math.min(current + 1, result.durationTicks));
    }, 100);

    return () => window.clearInterval(intervalId);
  }, [result]);

  useEffect(() => {
    if (visibleLogs.length > 0 && logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [visibleLogs.length]);

  useEffect(() => {
    if (!result || !isPlaybackComplete || completedResultRef.current === result) return;

    completedResultRef.current = result;
    onToast({ message: `전투 완료 · 경험치 +${result.gainedExperience}`, tone: "system" });

    if (result.levelAfter > result.levelBefore) {
      onToast({ message: `레벨업! -> LV.${result.levelAfter}`, tone: "epic" });
    }
  }, [isPlaybackComplete, onToast, result]);

  async function handleHunt() {
    if (!canHunt) return;

    setIsSubmitting(true);
    setMessage("");
    setResult(null);
    setPlaybackTenths(0);
    const nextResult = await huntTrainingDummy();
    setIsSubmitting(false);

    if (!nextResult.ok || !nextResult.character) {
      setMessage(nextResult.message);
      onToast({ message: nextResult.message, tone: "error" });
      void onCharacterRefresh();
      return;
    }

    completedResultRef.current = null;
    onCharacterChange(nextResult.character);
    setResult(nextResult);
  }

  return (
    <section className="screen-panel hunt-screen">
      <div className="hunt-location-strip">
        <span>LOCATION</span>
        <strong>허수아비 훈련소</strong>
        <small>권장 LV.1–100</small>
      </div>
      <article className="panel hunt-status-panel">
        <div className="panel-head compact action-head">
          <div>
            <span>PLAYER</span>
            <h2>내 상태</h2>
          </div>
          <button className="btn primary" type="button" onClick={handleHunt} disabled={!canHunt}>
            {isSubmitting || remainingTenths > 0 || (result && !isPlaybackComplete) ? "전투 중..." : "전투 시작"}
          </button>
        </div>
        <div className="hunt-status-grid">
          <Kv label="캐릭터" value={character.name} />
          <Kv label="레벨" value={formatCharacterLevel(character.level)} />
          <StatusMeter label="체력" value={`${combatStats.maxHp.toLocaleString()} / ${combatStats.maxHp.toLocaleString()} HP`} percent={100} />
          <StatusMeter label="경험치" value={`${character.experience.toLocaleString()} / ${requiredExperience.toLocaleString()} EXP`} percent={experiencePercent} />
        </div>
        {message && !result && <p className="panel-message is-error" role="status">{message}</p>}
      </article>

      <article className="panel combat-record-panel">
          <div className="panel-head compact">
            <div>
              <span>COMBAT</span>
              <h2>전투 상황</h2>
            </div>
          </div>
          <div className="combat-hp-grid">
            <CombatHpCard label="PLAYER" name={character.name} currentHp={combatStats.maxHp} maxHp={combatStats.maxHp} />
            <CombatHpCard label="ENEMY" name={result ? "허수아비" : "???"} currentHp={result ? targetHp : null} maxHp={result ? trainingDummy.maxHp : null} />
          </div>
          {message && <p className="panel-message is-error" role="status">{message}</p>}
          <ol className="combat-log" aria-label="전투 로그" ref={logRef}>
            {result ? (
              <>
                {visibleLogs.map((entry, index) => (
                  <li className={`is-${entry.kind}`} key={`${entry.timeTenths}-${entry.kind}-${index}`}>
                    <time>[{formatTime(entry.timeTenths)}]</time>
                    <span>{formatLogEntry(entry)}</span>
                  </li>
                ))}
              </>
            ) : (
              <li className="is-empty">전투 시작을 기다리고 있습니다.</li>
            )}
          </ol>
          {result && isPlaybackComplete && <HuntResultPanel result={result} />}
      </article>
    </section>
  );
}

function CombatHpCard({
  label,
  name,
  currentHp,
  maxHp,
}: {
  label: string;
  name: string;
  currentHp: number | null;
  maxHp: number | null;
}) {
  const isUnknown = currentHp === null || maxHp === null;
  const hpPercent = isUnknown ? 0 : Math.max(0, Math.min(100, (currentHp / maxHp) * 100));

  return (
    <div className="combat-hp-card">
      <span>{label}</span>
      <strong>{name}</strong>
      <div className={`combat-hp ${isUnknown ? "is-unknown" : ""}`} role="progressbar" aria-label={`${name} 체력`} aria-valuemin={0} aria-valuemax={maxHp ?? undefined} aria-valuenow={currentHp ?? undefined}>
        {!isUnknown && <i style={{ width: `${hpPercent}%` }} />}
      </div>
      <b>{isUnknown ? "HP ???" : `HP ${formatAmount(currentHp ?? 0)} / ${formatAmount(maxHp ?? 0)}`}</b>
    </div>
  );
}

function HuntResultPanel({ result }: { result: HuntResult }) {
  const seconds = result.durationTicks / 10;
  const dps = seconds > 0 ? (result.totalDamage / seconds).toFixed(1) : "0.0";

  return (
    <section className="hunt-result-section">
      <div className="hunt-result-head">
        <span>COMBAT RESULT</span>
        <strong>전투 결과</strong>
      </div>
      <div className="hunt-result-summary">
        <Kv label="전투 시간" value={formatTime(result.durationTicks)} />
        <Kv label="DPS" value={dps} />
        <Kv label="경험치" value={`+${result.gainedExperience} EXP`} />
      </div>
    </section>
  );
}

function Kv({ label, value }: { label: string; value: string }) {
  return <div><span>{label}</span><strong>{value}</strong></div>;
}

function StatusMeter({ label, value, percent }: { label: string; value: string; percent: number }) {
  return (
    <div className="hunt-status-meter">
      <span>{label}</span>
      <strong>{value}</strong>
      <i><b style={{ width: `${Math.max(0, Math.min(100, percent))}%` }} /></i>
    </div>
  );
}

function formatLogEntry(entry: HuntLogEntry) {
  if (entry.kind === "encounter") return "허수아비와 조우했습니다.";
  if (entry.kind === "defeat") return "허수아비 격파";
  if (entry.kind === "regeneration") return `허수아비 재생 -> 허수아비 · +${formatAmount(entry.amount)} HP (${formatAmount(entry.targetHp)} / ${trainingDummy.maxHp})`;
  if (entry.kind === "critical") return `치명타! -> 허수아비 · -${entry.amount} HP (${formatAmount(entry.targetHp)} / ${trainingDummy.maxHp})`;
  return `일반 공격 -> 허수아비 · -${entry.amount} HP (${formatAmount(entry.targetHp)} / ${trainingDummy.maxHp})`;
}

function formatTime(tenths: number) {
  return `${(tenths / 10).toFixed(1)}s`;
}

function formatAmount(value: number) {
  return Number.isInteger(value) ? value.toLocaleString() : value.toFixed(1);
}
