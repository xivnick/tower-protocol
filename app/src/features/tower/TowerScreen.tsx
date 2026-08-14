import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { challengeTowerFloor, getMyTowerState, settleTowerBattle } from "../../api/towerApi";
import type { TowerState } from "../../api/towerApi";
import type { HuntBattle, HuntLogEntry } from "../../api/characterApi";
import { toastMessages } from "../../shared/toastMessages";
import { calculateCombatStats } from "../../shared/stats";
import { useCombatClock } from "../../shared/useCombatClock";
import { useDocumentTitle } from "../../shared/useDocumentTitle";
import type { Character } from "../../types/character";
import { CombatLog } from "../combat/CombatLog";
import { useToast } from "../toast/ToastProvider";

type TowerFloor = {
  floor: number;
  name: string;
  enemy: string;
  enemyLevel: number;
};

const TOWER_FLOORS: TowerFloor[] = [
  { floor: 1, name: "시작의 계단", enemy: "성난 멧돼지", enemyLevel: 1 },
  { floor: 2, name: "울음의 회랑", enemy: "숲 늑대", enemyLevel: 2 },
  { floor: 3, name: "잔불의 방", enemy: "반딧불 정령", enemyLevel: 3 },
  { floor: 4, name: "돌갑옷 문턱", enemy: "바위 딱정벌레", enemyLevel: 4 },
  { floor: 5, name: "숲지기의 관문", enemy: "숲지기 큰사슴", enemyLevel: 5 },
];

export function TowerScreen({ character }: { character: Character | null }) {
  useDocumentTitle("TOWER://ASCENT");

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

  return <TowerFloors character={character} />;
}

function TowerFloors({ character }: { character: Character }) {
  const { showToast } = useToast();
  const [towerState, setTowerState] = useState<TowerState | null>(null);
  const [selectedFloor, setSelectedFloor] = useState(1);
  const [message, setMessage] = useState("탑 정보를 불러오는 중...");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const settlementAttemptRef = useRef<string | null>(null);
  const logRef = useRef<HTMLOListElement>(null);
  const isLogPinnedToBottomRef = useRef(true);
  const battle = towerState?.lastBattle ?? null;
  const battleFloor = getBattleFloor(battle);
  const recordFloor = battle ? battleFloor : selectedFloor;
  const floorInfo = getFloorInfo(selectedFloor);
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
  const highestClearedFloor = towerState?.highestClearedFloor ?? 0;
  const supportedFloor = towerState?.supportedFloor ?? 1;
  const hasClearedSelectedFloor = highestClearedFloor >= selectedFloor;
  const isSelectedFloorLocked = selectedFloor > highestClearedFloor + 1;

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
      const activeBattleFloor = getBattleFloor(result.state.lastBattle);
      const nextFloor = result.state.lastBattle?.status === "in_progress"
        ? activeBattleFloor
        : Math.min(result.state.highestClearedFloor + 1, result.state.supportedFloor);
      setSelectedFloor(Math.max(1, nextFloor));
      setMessage("");
    });

    return () => { isActive = false; };
  }, []);

  useEffect(() => {
    if (!battle || !isBattleInProgress || !isPlaybackComplete || settlementAttemptRef.current === battle.startedAt) return;

    let isActive = true;
    settlementAttemptRef.current = battle.startedAt;
    void settleTowerBattle().then((result) => {
      if (!isActive) return;
      settlementAttemptRef.current = null;
      if (!result.ok || !result.state) {
        setMessage(result.message);
        return;
      }

      setTowerState(result.state);
      const settledBattle = result.state.lastBattle;
      if (settledBattle?.status === "victory") showToast(toastMessages.tower.cleared(battleFloor));
      else showToast(toastMessages.tower.defeated(battleFloor));
    });

    return () => { isActive = false; };
  }, [battle, battleFloor, isBattleInProgress, isPlaybackComplete, showToast]);

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
    const floor = selectedFloor;
    setIsSubmitting(true);
    setMessage("");
    const result = await challengeTowerFloor(floor);
    setIsSubmitting(false);

    if (!result.ok || !result.state) {
      setMessage(result.message);
      return;
    }

    settlementAttemptRef.current = null;
    setTowerState(result.state);
    showToast(toastMessages.tower.started(floor));
  }

  return (
    <section className="screen-panel tower-screen">
      <nav className="tower-floor-list" aria-label="탑 층 선택">
        {TOWER_FLOORS.filter(({ floor }) => floor <= supportedFloor).map((item) => {
          const isCleared = item.floor <= highestClearedFloor;
          const isLocked = item.floor > highestClearedFloor + 1;
          return (
            <button
              className={`tower-floor-select ${selectedFloor === item.floor ? "is-selected" : ""} ${isCleared ? "is-cleared" : ""}`}
              type="button"
              key={item.floor}
              onClick={() => setSelectedFloor(item.floor)}
              disabled={isBattleInProgress || isLocked}
            >
              <span>{item.floor.toString().padStart(2, "0")}F</span>
              <strong>{item.name}</strong>
              <small>{isCleared ? "완료" : isLocked ? "잠김" : "도전 가능"}</small>
            </button>
          );
        })}
      </nav>

      <article className={`panel tower-floor-card ${hasClearedSelectedFloor ? "is-cleared" : ""}`} data-floor={selectedFloor.toString().padStart(2, "0")}>
        <div className="panel-head compact action-head">
          <div>
            <span>TOWER / FLOOR {selectedFloor.toString().padStart(2, "0")}</span>
            <h2>{floorInfo.name}</h2>
          </div>
          <button className="btn primary" type="button" onClick={() => void handleChallenge()} disabled={isLoading || isSubmitting || isBattleInProgress || isSelectedFloorLocked}>
            {isSubmitting ? "입장 중..." : isBattleInProgress ? "전투 중..." : isSelectedFloorLocked ? "잠김" : hasClearedSelectedFloor ? "다시 도전" : `${selectedFloor}층 도전`}
          </button>
        </div>

        <div className="tower-floor-meta">
          <div><span>상태</span><strong>{hasClearedSelectedFloor ? "완료" : isSelectedFloorLocked ? "잠김" : "도전 가능"}</strong></div>
          <div><span>최고층</span><strong>{highestClearedFloor}F</strong></div>
          <div><span>적</span><strong>LV.{floorInfo.enemyLevel} {floorInfo.enemy}</strong></div>
        </div>

        {message && <p className={`panel-message ${isLoading ? "" : "is-error"}`} aria-live="polite">{message}</p>}
      </article>

      <article className="panel combat-record-panel">
        <div className="panel-head compact">
          <span>CHALLENGE / FLOOR {recordFloor.toString().padStart(2, "0")}</span>
          <h2>{getResultLabel(battle, recordFloor)}</h2>
        </div>

        <div className="combat-hp-grid">
          <TowerCombatantCard label="PLAYER" name={`LV.${battle?.player.level ?? character.level} ${battle?.player.name ?? character.name}`} currentHp={playerHp ?? playerMaxHp} maxHp={playerMaxHp} />
          <TowerCombatantCard label="ENEMY" name={battle ? `LV.${battle.enemy.level} ${battle.enemy.name}` : `LV.${floorInfo.enemyLevel} ${floorInfo.enemy}`} currentHp={battle ? enemyHp ?? battle.enemy.maxHp : null} maxHp={battle?.enemy.maxHp ?? null} />
        </div>

        <CombatLog
          logs={battle ? visibleLogs : []}
          playerName={battle?.player.name ?? character.name}
          enemyName={battle?.enemy.name ?? floorInfo.enemy}
          enemyLevel={battle?.enemy.level ?? floorInfo.enemyLevel}
          victoryMessage={`${recordFloor}층 클리어`}
          emptyMessage={battle ? "전투 개시 중..." : `${selectedFloor}층 도전을 기다리고 있습니다.`}
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

function getFloorInfo(floor: number) {
  return TOWER_FLOORS.find((item) => item.floor === floor) ?? TOWER_FLOORS[0];
}

function getBattleFloor(battle: HuntBattle | null) {
  if (!battle) return 1;
  const match = /^tower-floor-(\d+)$/.exec(battle.huntGroundId);
  const floor = Number(match?.[1]);
  return Number.isInteger(floor) && floor >= 1 && floor <= TOWER_FLOORS.length ? floor : 1;
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

function getResultLabel(battle: HuntBattle | null, floor: number) {
  if (!battle) return "전투 기록 없음";
  if (battle.status === "in_progress") return `${floor}층 전투 진행`;
  if (battle.status === "victory") return `${floor}층 클리어`;
  return `${floor}층 도전 실패`;
}
