import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { huntTrainingDummy } from "../../api/characterApi";
import type { HuntLogEntry, HuntResult } from "../../api/characterApi";
import { formatCharacterExperience, formatCharacterLevel } from "../../shared/progression";
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
  const [result, setResult] = useState<HuntResult | null>(null);
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [now, setNow] = useState(Date.now());
  const availableAt = character?.hunt_available_at ? Date.parse(character.hunt_available_at) : 0;
  const remainingTenths = Math.max(0, Math.ceil((availableAt - now) / 100));

  useEffect(() => {
    void onCharacterRefresh();
  }, []);

  useEffect(() => {
    if (remainingTenths === 0) return;

    const intervalId = window.setInterval(() => setNow(Date.now()), 100);
    return () => window.clearInterval(intervalId);
  }, [remainingTenths]);

  const huntSummary = useMemo(() => result ? summarizeHunt(result) : null, [result]);
  const canHunt = Boolean(character) && !isSubmitting && remainingTenths === 0;

  async function handleHunt() {
    if (!canHunt) return;

    setIsSubmitting(true);
    setMessage("");
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

  return (
    <section className="screen-panel hunt-screen">
      <article className="panel">
        <div className="panel-head">
          <span>HUNTING GROUNDS</span>
          <h2>허수아비 훈련소</h2>
        </div>
        <div className="hunt-layout">
          <div className="hunt-target-card">
            <span>TRAINING TARGET</span>
            <strong>허수아비</strong>
            <p>일반공격을 하지 않으며, 매초 체력을 재생합니다.</p>
            <dl>
              <div><dt>HP</dt><dd>{trainingDummy.maxHp}</dd></div>
              <div><dt>물리 방어</dt><dd>{trainingDummy.physicalDefense}</dd></div>
              <div><dt>재생</dt><dd>초당 {trainingDummy.regenerationPerSecond} HP</dd></div>
            </dl>
          </div>
          <div className="hunt-player-card">
            <span>COMBATANT</span>
            <strong>{character.name}</strong>
            <p>{formatCharacterLevel(character.level)} · {formatCharacterExperience(character.level, character.experience)}</p>
            <small>일반공격만 사용합니다.</small>
          </div>
        </div>
        <div className="hunt-action-row">
          <button className="btn primary" type="button" onClick={handleHunt} disabled={!canHunt}>
            {isSubmitting ? "전투 시뮬레이션 중..." : remainingTenths > 0 ? `재정비 ${formatTenths(remainingTenths)}` : "전투 시뮬레이션"}
          </button>
          <small>전투 시간만큼 다음 훈련까지 대기합니다.</small>
        </div>
        {message && <p className="panel-message is-error" role="status">{message}</p>}
      </article>

      {result && huntSummary && (
        <article className="panel hunt-result-panel">
          <div className="panel-head compact">
            <span>COMBAT RESULT</span>
            <h2>허수아비 격파</h2>
          </div>
          <div className="hunt-result-summary">
            <Kv label="전투 시간" value={formatTenths(result.durationTicks)} />
            <Kv label="일반공격" value={`${result.attackCount}회`} />
            <Kv label="치명타" value={`${result.criticalCount}회`} />
            <Kv label="총 피해" value={`${result.totalDamage.toLocaleString()}`} />
            <Kv label="재생량" value={`+${formatAmount(result.totalRegeneration)} HP`} />
            <Kv label="보상" value={`경험치 +${result.gainedExperience}`} />
          </div>
          <ol className="combat-log" aria-label="전투 로그">
            {result.logs.map((entry, index) => (
              <li className={`is-${entry.kind}`} key={`${entry.timeTenths}-${entry.kind}-${index}`}>
                <time>{formatTenths(entry.timeTenths)}</time>
                <span>{formatLogEntry(entry)}</span>
              </li>
            ))}
          </ol>
          <p className="hunt-result-footnote">DPS {huntSummary.dps} · 허수아비 잔여 HP 0</p>
        </article>
      )}
    </section>
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

function formatTenths(tenths: number) {
  return `${(tenths / 10).toFixed(1)}초`;
}

function formatAmount(value: number) {
  return Number.isInteger(value) ? value.toLocaleString() : value.toFixed(1);
}

function summarizeHunt(result: HuntResult) {
  const seconds = result.durationTicks / 10;
  return { dps: seconds > 0 ? (result.totalDamage / seconds).toFixed(1) : "0.0" };
}
