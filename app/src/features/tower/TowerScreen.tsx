import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { challengeTowerFloorOne, getMyTowerState, settleTowerFloorOne } from "../../api/towerApi";
import type { TowerState } from "../../api/towerApi";
import type { HuntBattle, HuntLogEntry } from "../../api/characterApi";
import { toastMessages } from "../../shared/toastMessages";
import { calculateCombatStats } from "../../shared/stats";
import { useCombatClock } from "../../shared/useCombatClock";
import { useDocumentTitle } from "../../shared/useDocumentTitle";
import type { Character } from "../../types/character";
import { CombatLog } from "../combat/CombatLog";
import { useToast } from "../toast/ToastProvider";

const FLOOR_ONE = 1;

export function TowerScreen({ character }: { character: Character | null }) {
  useDocumentTitle("TOWER://FLOOR 01");

  if (!character) {
    return (
      <section className="screen-panel">
        <article className="panel">
          <div className="panel-head">
            <span>TOWER</span>
            <h2>탑</h2>
          </div>
          <div className="panel-action-body">
            <p className="panel-message">탑에 도전하려면 캐릭터를 생성해주세요.</p>
            <Link className="btn primary panel-primary-action" to="/character">캐릭터 생성</Link>
          </div>
        </article>
      </section>
    );
  }

  return <TowerFloorOne character={character} />;
}

function TowerFloorOne({ character }: { character: Character }) {
  const { showToast } = useToast();
  const [towerState, setTowerState] = useState<TowerState | null>(null);
  const [message, setMessage] = useState("탑 정보를 불러오는 중...");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const settlementAttemptRef = useRef<string | null>(null);
  const logRef = useRef<HTMLOListElement>(null);
  const isLogPinnedToBottomRef = useRef(true);
  const battle = towerState?.lastBattle ?? null;
  const isBattleInProgress = battle?.status === "in_progress";
  const combatNow = useCombatClock(isBattleInProgress);
  const playbackTenths = battle ? getElapsedTenths(battle, combatNow) : 0;
  const isPlaybackComplete = Boolean(battle && playbackTenths >= battle.durationTicks);
  const visibleLogs = useMemo(
    () => battle?.logs.filter((entry) => entry.timeTenths <= playbackTenths) ?? [],
    [battle, playbackTenths],
  );
  const playerHp = getVisibleHp(battle, visibleLogs, "player");
  const enemyHp = getVisibleHp(battle, visibleLogs, "enemy");
  const playerMaxHp = battle?.player.maxHp ?? calculateCombatStats(character).maxHp;

  useEffect(() => {
    let isActive = true;

    void getMyTowerState().then((result) => {
      if (!isActive) return;
      setIsLoading(false);
      if (!result.ok || !result.state) {
        setMessage(result.message);
        return;
      }
      setTowerState(result.state);
      setMessage("");
    });

    return () => { isActive = false; };
  }, []);

  useEffect(() => {
    if (!battle || !isBattleInProgress || !isPlaybackComplete || settlementAttemptRef.current === battle.startedAt) return;

    let isActive = true;
    settlementAttemptRef.current = battle.startedAt;
    void settleTowerFloorOne().then((result) => {
      if (!isActive) return;
      settlementAttemptRef.current = null;
      if (!result.ok || !result.state) {
        setMessage(result.message);
        return;
      }

      setTowerState(result.state);
      const settledBattle = result.state.lastBattle;
      if (settledBattle?.status === "victory") showToast(toastMessages.tower.cleared(FLOOR_ONE));
      else showToast(toastMessages.tower.defeated(FLOOR_ONE));
    });

    return () => { isActive = false; };
  }, [battle, isBattleInProgress, isPlaybackComplete, showToast]);

  useEffect(() => {
    if (visibleLogs.length > 0 && logRef.current && isLogPinnedToBottomRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [visibleLogs.length]);

  useEffect(() => {
    isLogPinnedToBottomRef.current = true;
  }, [battle?.startedAt]);

  function handleCombatLogScroll() {
    const log = logRef.current;
    if (!log) return;
    isLogPinnedToBottomRef.current = log.scrollHeight - log.scrollTop - log.clientHeight <= 16;
  }

  async function handleChallenge() {
    setIsSubmitting(true);
    setMessage("");
    const result = await challengeTowerFloorOne();
    setIsSubmitting(false);

    if (!result.ok || !result.state) {
      setMessage(result.message);
      return;
    }

    settlementAttemptRef.current = null;
    setTowerState(result.state);
    showToast(toastMessages.tower.started(FLOOR_ONE));
  }

  const resultLabel = getResultLabel(battle);
  const hasCleared = (towerState?.highestClearedFloor ?? 0) >= FLOOR_ONE;

  return (
    <section className="screen-panel tower-screen">
      <article className={`panel tower-floor-card ${hasCleared ? "is-cleared" : ""}`}>
        <div className="panel-head compact action-head">
          <div>
            <span>TOWER / FLOOR 01</span>
            <h2>시작의 계단</h2>
          </div>
          <button className="btn primary" type="button" onClick={() => void handleChallenge()} disabled={isLoading || isSubmitting || isBattleInProgress}>
            {isSubmitting ? "입장 중..." : isBattleInProgress ? "전투 중..." : hasCleared ? "다시 도전" : "1층 도전"}
          </button>
        </div>

        <div className="tower-floor-meta">
          <div><span>클리어</span><strong>{hasCleared ? "CLEAR" : "--"}</strong></div>
          <div><span>최고층</span><strong>{towerState?.highestClearedFloor ?? 0}F</strong></div>
          <div><span>적</span><strong>LV.1 성난 멧돼지</strong></div>
        </div>

        {message && <p className={`panel-message ${isLoading ? "" : "is-error"}`} aria-live="polite">{message}</p>}
      </article>

      <article className="panel combat-record-panel">
        <div className="panel-head compact action-head">
          <div>
            <span>CHALLENGE</span>
            <h2>{resultLabel}</h2>
          </div>
          {battle && <strong className={`tower-battle-status is-${battle.status}`}>{formatBattleStatus(battle.status)}</strong>}
        </div>

        <div className="combat-hp-grid">
          <TowerCombatantCard label="PLAYER" name={`LV.${battle?.player.level ?? character.level} ${battle?.player.name ?? character.name}`} currentHp={playerHp ?? playerMaxHp} maxHp={playerMaxHp} />
          <TowerCombatantCard label="ENEMY" name={battle ? `LV.${battle.enemy.level} ${battle.enemy.name}` : "LV.1 성난 멧돼지"} currentHp={battle ? enemyHp ?? battle.enemy.maxHp : null} maxHp={battle?.enemy.maxHp ?? null} />
        </div>

        <CombatLog
          logs={battle ? visibleLogs : []}
          playerName={battle?.player.name ?? character.name}
          enemyName={battle?.enemy.name ?? "성난 멧돼지"}
          enemyLevel={battle?.enemy.level ?? 1}
          victoryMessage="1층 클리어"
          emptyMessage={battle ? "전투 개시 중..." : "1층 도전을 기다리고 있습니다."}
          ariaLabel="탑 전투 로그"
          listRef={logRef}
          onScroll={handleCombatLogScroll}
        />
      </article>
    </section>
  );
}

function TowerCombatantCard({ label, name, currentHp, maxHp }: { label: string; name: string; currentHp: number | null; maxHp: number | null }) {
  const isUnknown = currentHp === null || maxHp === null;
  const percent = !isUnknown && maxHp > 0 ? Math.max(0, Math.min(100, (currentHp / maxHp) * 100)) : 0;

  return (
    <div className="combat-hp-card">
      <span>{label}</span>
      <div className="combat-card-title"><strong>{name}</strong></div>
      <div className={`combat-hp ${isUnknown ? "is-unknown" : ""}`} role="progressbar" aria-label={`${name} 체력`} aria-valuemin={0} aria-valuemax={maxHp ?? undefined} aria-valuenow={currentHp ?? undefined}>
        {!isUnknown && <i style={{ width: `${percent}%` }} />}
      </div>
      <b>{isUnknown ? "HP ???" : `HP ${Math.round(currentHp).toLocaleString()} / ${Math.round(maxHp).toLocaleString()}`}</b>
    </div>
  );
}

function getElapsedTenths(battle: HuntBattle, now: number) {
  if (battle.status !== "in_progress") return battle.durationTicks;
  const startedAt = Date.parse(battle.startedAt);
  if (Number.isNaN(startedAt)) return battle.durationTicks;
  return Math.max(0, Math.min(battle.durationTicks, Math.floor((now - startedAt) / 100)));
}

function getVisibleHp(battle: HuntBattle | null, logs: HuntLogEntry[], target: "player" | "enemy") {
  if (!battle) return null;
  const entry = [...logs].reverse().find((current) => target === "player" ? current.target === "player" : current.target !== "player");
  if (entry) return entry.targetHp;
  return target === "player" ? battle.player.startHp ?? battle.player.maxHp : battle.enemy.maxHp;
}

function getResultLabel(battle: HuntBattle | null) {
  if (!battle) return "1층 도전";
  if (battle.status === "in_progress") return "전투 진행";
  if (battle.status === "victory") return "1층 클리어";
  return "도전 실패";
}

function formatBattleStatus(status: HuntBattle["status"]) {
  if (status === "in_progress") return "RUNNING";
  if (status === "victory") return "CLEAR";
  if (status === "defeated") return "DEFEAT";
  if (status === "timed_out") return "TIMEOUT";
  return status.toUpperCase();
}
