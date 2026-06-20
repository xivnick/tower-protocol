import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { huntTrainingDummy } from "../../api/characterApi";
import type { HuntLogEntry, HuntResult } from "../../api/characterApi";
import { formatCharacterExperience, formatCharacterLevel } from "../../shared/progression";
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
  const [selectedGround, setSelectedGround] = useState<"training-dummy" | null>(null);

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

  if (selectedGround === "training-dummy") {
    return <TrainingDummyGround character={character} onBack={() => setSelectedGround(null)} onCharacterChange={onCharacterChange} onCharacterRefresh={onCharacterRefresh} onToast={onToast} />;
  }

  return <HuntGroundList onSelectTrainingDummy={() => setSelectedGround("training-dummy")} />;
}

function HuntGroundList({ onSelectTrainingDummy }: { onSelectTrainingDummy: () => void }) {
  return (
    <section className="screen-panel hunt-screen">
      <article className="panel">
        <div className="panel-head">
          <span>HUNTING GROUNDS</span>
          <h2>사냥터 선택</h2>
        </div>
        <button className="hunt-ground-option" type="button" onClick={onSelectTrainingDummy}>
          <span>TRAINING</span>
          <strong>허수아비 훈련소</strong>
          <small>일반공격과 치명타를 시험할 수 있는 비공격형 훈련 대상</small>
          <i aria-hidden="true">-&gt;</i>
        </button>
      </article>
    </section>
  );
}

function TrainingDummyGround({
  character,
  onBack,
  onCharacterChange,
  onCharacterRefresh,
  onToast,
}: {
  character: Character;
  onBack: () => void;
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
  const availableAt = character.hunt_available_at ? Date.parse(character.hunt_available_at) : 0;
  const remainingTenths = Math.max(0, Math.ceil((availableAt - now) / 100));
  const combatStats = calculateCombatStats(character);
  const visibleLogs = useMemo(() => result?.logs.filter((entry) => entry.timeTenths <= playbackTenths) ?? [], [playbackTenths, result]);
  const targetHp = visibleLogs.length > 0 ? visibleLogs[visibleLogs.length - 1].targetHp : trainingDummy.maxHp;
  const isPlaybackComplete = Boolean(result && playbackTenths >= result.durationTicks);
  const canHunt = !isSubmitting && remainingTenths === 0 && (!result || isPlaybackComplete);
  const playerDetails = [
    `물리 공격력 ${combatStats.physicalAttack}`,
    `마법 공격력 ${combatStats.magicAttack}`,
    `물리 방어 ${combatStats.physicalDefense}`,
    `마법 방어 ${combatStats.magicDefense}`,
    `재생 ${formatAmount(combatStats.hpRegenPerSecond)}`,
    `공속 ${formatAmount(combatStats.attacksPerSecond)}`,
    `쿨감 ${formatAmount(combatStats.cooldownReduction * 100)}%`,
    `명중 ${combatStats.accuracy}`,
    `회피율 ${formatAmount(combatStats.evasionRateAgainstAccuracy100 * 100)}%`,
    `치명타 확률 ${combatStats.criticalChance}%`,
    `치명타 피해 ${combatStats.criticalDamage}%`,
  ];
  const dummyDetails = [
    "물리 공격력 0", "마법 공격력 0", `물리 방어 ${trainingDummy.physicalDefense}`, "마법 방어 0", `재생 ${trainingDummy.regenerationPerSecond}`,
    "공속 0", "쿨감 0%", "명중 0", "회피율 0%", "치명타 확률 0%", "치명타 피해 0%",
  ];

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

    onCharacterChange(nextResult.character);
    setResult(nextResult);
    onToast({ message: `허수아비 격파 · 경험치 +${nextResult.gainedExperience}`, tone: "system" });

    if (nextResult.levelAfter > nextResult.levelBefore) {
      onToast({ message: `레벨업! -> LV.${nextResult.levelAfter}`, tone: "epic" });
    }
  }

  return (
    <section className="screen-panel hunt-screen">
      <article className="panel hunt-location-panel">
        <div className="hunt-location-info">
          <div>
            <span>HUNTING GROUND</span>
            <strong>허수아비 훈련소</strong>
            <small>비공격형 훈련 대상 · 매초 체력 재생</small>
          </div>
          <button className="text-button" type="button" onClick={onBack}>← 사냥터 선택</button>
        </div>
      </article>
      <article className="panel hunt-ground-panel">
        <div className="panel-head compact">
          <span>COMBATANTS</span>
          <h2>전투 스탯</h2>
        </div>
        <div className="combatant-grid">
          <CombatantCard label="PLAYER" name={character.name} currentHp={combatStats.maxHp} maxHp={combatStats.maxHp} details={playerDetails} />
          <CombatantCard label="MONSTER" name="허수아비" currentHp={targetHp} maxHp={trainingDummy.maxHp} details={dummyDetails} />
        </div>
      </article>

      <article className="panel combat-record-panel">
        <div className="panel-head compact action-head">
          <div>
            <span>COMBAT RECORD</span>
            <h2>전투 기록</h2>
          </div>
          <button className="btn primary" type="button" onClick={handleHunt} disabled={!canHunt}>
            {isSubmitting ? "시뮬레이션 중..." : remainingTenths > 0 ? `재정비 ${formatTime(remainingTenths)}` : result && !isPlaybackComplete ? "기록 재생 중..." : "전투 시뮬레이션"}
          </button>
        </div>
        {message && <p className="panel-message is-error" role="status">{message}</p>}
        <ol className="combat-log" aria-label="전투 로그" ref={logRef}>
          {visibleLogs.length === 0 ? (
            <li className="is-empty">전투 시뮬레이션을 시작하면 기록이 표시됩니다.</li>
          ) : (
            visibleLogs.map((entry, index) => (
              <li className={`is-${entry.kind}`} key={`${entry.timeTenths}-${entry.kind}-${index}`}>
                <time>[{formatTime(entry.timeTenths)}]</time>
                <span>{formatLogEntry(entry)}</span>
              </li>
            ))
          )}
        </ol>
      </article>

      {result && isPlaybackComplete && <HuntResultPanel result={result} />}
    </section>
  );
}

function CombatantCard({
  label,
  name,
  currentHp,
  maxHp,
  details,
}: {
  label: string;
  name: string;
  currentHp: number;
  maxHp: number;
  details: string[];
}) {
  const hpPercent = Math.max(0, Math.min(100, (currentHp / maxHp) * 100));

  return (
    <div className="combatant-card">
      <span>{label}</span>
      <strong>{name}</strong>
      <div className="combat-hp" role="progressbar" aria-label={`${name} 체력`} aria-valuemin={0} aria-valuemax={maxHp} aria-valuenow={currentHp}>
        <i style={{ width: `${hpPercent}%` }} />
      </div>
      <b>HP {formatAmount(currentHp)} / {formatAmount(maxHp)}</b>
      <ul>{details.map((detail) => <li key={detail}>{detail}</li>)}</ul>
    </div>
  );
}

function HuntResultPanel({ result }: { result: HuntResult }) {
  const seconds = result.durationTicks / 10;
  const dps = seconds > 0 ? (result.totalDamage / seconds).toFixed(1) : "0.0";

  return (
    <article className="panel hunt-result-panel">
      <div className="panel-head compact">
        <span>COMBAT RESULT</span>
        <h2>허수아비 격파</h2>
      </div>
      <div className="hunt-result-summary">
        <Kv label="전투 시간" value={formatTime(result.durationTicks)} />
        <Kv label="일반공격" value={`${result.attackCount}회`} />
        <Kv label="치명타" value={`${result.criticalCount}회`} />
        <Kv label="총 피해" value={`${result.totalDamage.toLocaleString()}`} />
        <Kv label="재생량" value={`+${formatAmount(result.totalRegeneration)} HP`} />
        <Kv label="보상" value={`경험치 +${result.gainedExperience}`} />
      </div>
      <p className="hunt-result-footnote">DPS {dps} · 다음 훈련은 전투 시간만큼 재정비합니다.</p>
    </article>
  );
}

function Kv({ label, value }: { label: string; value: string }) {
  return <div><span>{label}</span><strong>{value}</strong></div>;
}

function formatLogEntry(entry: HuntLogEntry) {
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
