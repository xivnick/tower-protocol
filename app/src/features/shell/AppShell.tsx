import { useEffect, useRef, useState, type CSSProperties } from "react";
import type { Session } from "@supabase/supabase-js";
import { Link, Navigate, NavLink, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { checkMyAdminAccess } from "../../api/adminApi";
import type { Profile } from "../../api/profileApi";
import type { Character } from "../../types/character";
import { toastMessages } from "../../shared/toastMessages";
import { useCombatClock } from "../../shared/useCombatClock";
import { getRequiredExperienceForLevel } from "../../shared/progression";
import { configureAutoHunt, encounterHuntMonster, getMyHuntState, huntTrainingDummy, settleTrainingDummyHunt } from "../../api/characterApi";
import type { HuntState } from "../../api/characterApi";
import { getInventoryNoticeStatus } from "../../api/inventoryNoticeApi";
import type { InventoryNoticeStatus } from "../../api/inventoryNoticeApi";
import { CharacterScreen } from "../character/CharacterScreen";
import { EquipmentScreen } from "../equipment/EquipmentScreen";
import { EssenceScreen } from "../essence/EssenceScreen";
import { DashboardScreen } from "../dashboard/DashboardScreen";
import { HuntScreen } from "../hunt/HuntScreen";
import { PatchNotesArchive } from "../patchNotes/PatchNotes";
import { RankingScreen } from "../ranking/Ranking";
import { useToast } from "../toast/ToastProvider";

const navItems = [
  { label: "대시보드", to: "/", end: true, enabled: true },
  { label: "사냥", to: "/hunt", enabled: true },
  { label: "탑", to: "/tower", enabled: false },
  { label: "캐릭터", to: "/character", enabled: true },
  { label: "장비", to: "/equipment", enabled: true },
  { label: "정수", to: "/essences", enabled: true },
  { label: "랭킹", to: "/ranking", enabled: true },
  { label: "패치노트", to: "/patch-notes", enabled: true },
];

const dropdownCloseMs = 100;

export function AppShell({
  session,
  profile,
  character,
  onCharacterChange,
  onCharacterRefresh,
  onSignOut,
}: {
  session: Session | null;
  profile: Profile | null;
  character: Character | null;
  onCharacterChange: (character: Character | null) => void;
  onCharacterRefresh: () => Promise<boolean>;
  onSignOut: () => void;
}) {
  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const [isAccountClosing, setIsAccountClosing] = useState(false);
  const [isNavOpen, setIsNavOpen] = useState(false);
  const [isNavClosing, setIsNavClosing] = useState(false);
  const [routeRefreshKey, setRouteRefreshKey] = useState(0);
  const [activeHuntState, setActiveHuntState] = useState<HuntState | null>(null);
  const [inventoryNotice, setInventoryNotice] = useState<InventoryNoticeStatus>({ equipment: false, essence: false });
  const [isAdmin, setIsAdmin] = useState(false);
  const settlementAttemptRef = useRef<string | null>(null);
  const recoveryToastRef = useRef<string | null>(null);
  const autoHuntActionRef = useRef<string | null>(null);
  const autoEncounterDuringRecoveryRef = useRef(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const nickname = profile?.nickname ?? "UNKNOWN";
  const currentNavLabel = getCurrentNavLabel(location.pathname);
  const hasUnspentStatPoints = Boolean(character && character.stat_points > 0);
  const currentNavHasNotice = hasNavNotice(location.pathname, hasUnspentStatPoints, inventoryNotice);

  useEffect(() => {
    if (!character) {
      setActiveHuntState(null);
      setInventoryNotice({ equipment: false, essence: false });
      return;
    }

    let isActive = true;
    void getMyHuntState().then((nextState) => {
      if (isActive && nextState.ok) setActiveHuntState(nextState.state);
    });
    void getInventoryNoticeStatus().then((result) => {
      if (isActive && result.ok) setInventoryNotice(result.status);
    });

    return () => { isActive = false; };
  }, [character?.id]);

  useEffect(() => {
    let isActive = true;

    if (!session?.user.id) {
      setIsAdmin(false);
      return;
    }

    void checkMyAdminAccess().then((result) => {
      if (!isActive) return;
      setIsAdmin(result.ok && result.isAdmin);
    });

    return () => { isActive = false; };
  }, [session?.user.id]);

  useEffect(() => {
    const battle = activeHuntState?.lastBattle;
    if (location.pathname.startsWith("/hunt") || !battle || battle.status !== "in_progress" || !battle.endsAt) return;

    const endsAt = Date.parse(battle.endsAt);
    if (Number.isNaN(endsAt)) return;

    let isActive = true;
    const timeoutId = window.setTimeout(() => {
      if (settlementAttemptRef.current === battle.startedAt) return;

      settlementAttemptRef.current = battle.startedAt;
      void settleTrainingDummyHunt().then(async (nextResult) => {
        settlementAttemptRef.current = null;
        if (!isActive) return;
        if (!nextResult.ok) {
          const nextState = await getMyHuntState();
          if (!isActive || !nextState.ok) return;
          setActiveHuntState(nextState.state);
          if (nextState.state?.lastBattle?.startedAt === battle.startedAt && nextState.state.lastBattle.status !== "in_progress") {
            void onCharacterRefresh();
          }
          return;
        }

        setActiveHuntState(nextResult.huntState);
        markInventoryRewardNotice(nextResult);
        if (!nextResult.character) return;

        onCharacterChange(nextResult.character);
        if (nextResult.status === "defeated") {
          showToast(toastMessages.hunt.defeated());
        } else if (nextResult.status === "timed_out") {
          showToast(toastMessages.hunt.timedOut());
        } else {
          showToast(toastMessages.hunt.completed(nextResult.gainedExperience, nextResult.gainedCredits ?? nextResult.rewards?.credits ?? 0));
        }
        if (nextResult.status === "victory" && nextResult.levelAfter > nextResult.levelBefore) {
          showToast(toastMessages.character.levelUp(nextResult.levelAfter));
        }
      });
    }, Math.max(0, endsAt - Date.now()) + 800);

    return () => {
      isActive = false;
      window.clearTimeout(timeoutId);
    };
  }, [activeHuntState, location.pathname, onCharacterChange, onCharacterRefresh]);

  useEffect(() => {
    if (location.pathname.startsWith("/hunt") || !activeHuntState?.autoHuntEnabled) return;
    const battle = activeHuntState.lastBattle;
    if (battle?.status === "in_progress") return;
    if (battle?.status === "encountered") {
      const recoveryEndsAt = activeHuntState.recoveryEndsAt ? Date.parse(activeHuntState.recoveryEndsAt) : 0;
      if (recoveryEndsAt > Date.now()) {
        const timeoutId = window.setTimeout(() => {
          void getMyHuntState().then((next) => {
            if (next.ok && next.state) setActiveHuntState(next.state);
          });
        }, recoveryEndsAt - Date.now() + 50);
        return () => window.clearTimeout(timeoutId);
      }
      if (autoHuntActionRef.current === battle.startedAt) return;
      autoHuntActionRef.current = battle.startedAt;
      const delay = autoEncounterDuringRecoveryRef.current ? 0 : 500;
      let isActive = true;
      const timeoutId = window.setTimeout(() => void huntTrainingDummy().then((next) => {
        if (!isActive) return;
        if (!next.ok || !next.huntState) return;
        setActiveHuntState(next.huntState);
        showToast(toastMessages.hunt.autoBattleStarted(next.enemy.level, next.enemy.name));
      }), delay);
      return () => {
        isActive = false;
        window.clearTimeout(timeoutId);
      };
    }
    if (activeHuntState.autoHuntRemaining === 0) {
      if (autoHuntActionRef.current === "complete") return;
      autoHuntActionRef.current = "complete";
      void configureAutoHunt(false).then((next) => {
        if (next.ok && next.state) setActiveHuntState(next.state);
        showToast(toastMessages.hunt.autoHuntCompleted());
      });
      return;
    }
    const defeatRecoveryEndsAt = activeHuntState.isDefeatRecovery && activeHuntState.playerRecoveryStartedAt
      ? Date.parse(activeHuntState.playerRecoveryStartedAt) + 10_000
      : 0;
    if (defeatRecoveryEndsAt > Date.now()) {
      const timeoutId = window.setTimeout(() => {
        void getMyHuntState().then((next) => {
          if (next.ok && next.state) setActiveHuntState(next.state);
        });
      }, defeatRecoveryEndsAt - Date.now() + 50);
      return () => window.clearTimeout(timeoutId);
    }
    const key = `encounter-${activeHuntState.autoHuntRemaining}-${battle?.startedAt ?? "ready"}`;
    if (autoHuntActionRef.current === key) return;
    autoHuntActionRef.current = key;
    const recoveryEndsAt = activeHuntState.recoveryEndsAt ? Date.parse(activeHuntState.recoveryEndsAt) : 0;
    autoEncounterDuringRecoveryRef.current = recoveryEndsAt > Date.now();
    let isActive = true;
    const timeoutId = window.setTimeout(() => void encounterHuntMonster().then((next) => {
      if (!isActive) return;
      if (!next.ok || !next.huntState) return;
      setActiveHuntState(next.huntState);
    }), 500);
    return () => {
      isActive = false;
      window.clearTimeout(timeoutId);
    };
  }, [activeHuntState, location.pathname]);

  useEffect(() => {
    const recoveryEndsAt = activeHuntState?.recoveryEndsAt;
    const recoveryStartHp = activeHuntState?.playerRecoveryStartHp;
    const recoveryMaxHp = activeHuntState?.playerMaxHp;
    if (!recoveryEndsAt || recoveryToastRef.current === recoveryEndsAt) return;
    if (activeHuntState?.autoHuntEnabled) return;
    if (recoveryStartHp !== null && recoveryStartHp !== undefined && recoveryMaxHp !== null && recoveryMaxHp !== undefined && recoveryStartHp >= recoveryMaxHp) return;

    const recoveryEndsAtMs = Date.parse(recoveryEndsAt);
    if (Number.isNaN(recoveryEndsAtMs) || recoveryEndsAtMs <= Date.now()) return;

    const timeoutId = window.setTimeout(() => {
      if (recoveryToastRef.current === recoveryEndsAt) return;
      recoveryToastRef.current = recoveryEndsAt;
      showToast(toastMessages.recovery.completed());
    }, recoveryEndsAtMs - Date.now());

    return () => window.clearTimeout(timeoutId);
  }, [activeHuntState?.playerMaxHp, activeHuntState?.playerRecoveryStartHp, activeHuntState?.recoveryEndsAt]);

  function handleHuntStateChange(huntState: HuntState | null) {
    setActiveHuntState(huntState);
  }

  function handleInventoryReward(reward: InventoryNoticeStatus) {
    if (!reward.equipment && !reward.essence) return;
    setInventoryNotice((current) => {
      return {
        equipment: current.equipment || reward.equipment,
        essence: current.essence || reward.essence,
      };
    });
  }

  function markInventoryRewardNotice(result: { status: string; rewards?: { equipment: unknown; essence: unknown } | null }) {
    if (result.status !== "victory" || !result.rewards) return;
    handleInventoryReward({
      equipment: Boolean(result.rewards.equipment),
      essence: Boolean(result.rewards.essence),
    });
  }

  function handleInventoryNoticeChange(status: InventoryNoticeStatus) {
    setInventoryNotice(status);
  }

  function toggleAccountMenu() {
    if (isAccountOpen) {
      closeAccountMenu();
      return;
    }

    setIsAccountClosing(false);
    setIsAccountOpen(true);
  }

  function toggleNavMenu() {
    if (isNavOpen) {
      closeNavMenu();
      return;
    }

    setIsNavClosing(false);
    setIsNavOpen(true);
  }

  function closeAccountMenu() {
    setIsAccountClosing(true);
    window.setTimeout(() => {
      setIsAccountOpen(false);
      setIsAccountClosing(false);
    }, dropdownCloseMs);
  }

  function closeNavMenu(nextPath?: string) {
    setIsNavClosing(true);
    window.setTimeout(() => {
      setIsNavOpen(false);
      setIsNavClosing(false);

      if (nextPath && nextPath !== location.pathname) {
        navigate(nextPath);
      }
    }, dropdownCloseMs);
  }

  function refreshCurrentRoute(nextPath: string) {
    if (nextPath === location.pathname) {
      setRouteRefreshKey((current) => current + 1);
    }
  }

  return (
    <>
      <div className="crt-overlay" aria-hidden="true" />
      <main className="app-shell">
        <div className="mobile-top-chrome">
          <header className="mobile-shell-head">
            <div className="mobile-shell-row">
              <NavLink className="rail-brand compact" to="/">
                <span>TOWER://</span>
                <i aria-hidden="true" />
              </NavLink>
              <div className="mobile-session-actions">
                <span className="credit-chip">{(character?.credits ?? 0).toLocaleString()} CR</span>
                <button className="account-chip" type="button" onClick={toggleAccountMenu} aria-expanded={isAccountOpen}>
                  {nickname}
                </button>
              </div>
            </div>
            {isAccountOpen && (
              <div className={`mobile-account-menu ${isAccountClosing ? "is-closing" : ""}`}>
                <div>
                  <span>SESSION</span>
                  <strong>{nickname}</strong>
                </div>
                <button className="btn ghost" type="button" onClick={onSignOut}>
                  로그아웃
                </button>
                {isAdmin && (
                  <Link className="btn ghost" to="/admin" onClick={() => closeAccountMenu()}>
                    어드민
                  </Link>
                )}
              </div>
            )}
          </header>

          <section className="mobile-nav-panel" aria-label="모바일 메뉴">
            <button className="mobile-nav-trigger" type="button" onClick={toggleNavMenu} aria-expanded={isNavOpen}>
              <span>{currentNavLabel}</span>
              {currentNavHasNotice && <span className="nav-notice" aria-hidden="true" />}
              <svg className="mobile-nav-icon" aria-hidden="true" viewBox="0 0 16 16">
                <path d="m4 6 4 4 4-4" />
              </svg>
            </button>
            {isNavOpen && (
              <nav className={`mobile-nav-menu ${isNavClosing ? "is-closing" : ""}`} aria-label="게임 화면">
                {navItems.map((item) => (
                  item.enabled ? (
                    <button
                      className={`nav-item mobile-nav-item ${item.to === location.pathname ? "is-active" : ""}`}
                      type="button"
                      key={item.label}
                      onClick={() => {
                        refreshCurrentRoute(item.to);
                        closeNavMenu(item.to);
                      }}
                      aria-label={getNavAriaLabel(item.label, item.to, hasUnspentStatPoints, inventoryNotice)}
                    >
                      {item.label}
                      {hasNavNotice(item.to, hasUnspentStatPoints, inventoryNotice) && <span className="nav-notice" aria-hidden="true" />}
                    </button>
                  ) : (
                    <button className="nav-item mobile-nav-item" type="button" disabled key={item.label}>
                      {item.label}
                    </button>
                  )
                ))}
              </nav>
            )}
          </section>
        </div>

        <aside className="rail" aria-label="주요 메뉴">
          <NavLink className="rail-brand" to="/">
            <span>TOWER://</span>
            <i aria-hidden="true" />
          </NavLink>
          <nav className="nav-list" aria-label="게임 화면">
            {navItems.map((item) => (
              item.enabled ? (
                <NavLink className={({ isActive }) => `nav-item ${isActive ? "is-active" : ""}`} to={item.to} end={item.end} key={item.label} onClick={() => refreshCurrentRoute(item.to)} aria-label={getNavAriaLabel(item.label, item.to, hasUnspentStatPoints, inventoryNotice)}>
                  {item.label}
                  {hasNavNotice(item.to, hasUnspentStatPoints, inventoryNotice) && <span className="nav-notice" aria-hidden="true" />}
                </NavLink>
              ) : (
                <button className="nav-item" type="button" disabled key={item.label}>
                  {item.label}
                </button>
              )
            ))}
          </nav>
        </aside>

        <section className="workspace">
          <header className="topbar">
            <div className="session-block">
              <span className="eyebrow">SESSION</span>
              <strong>{nickname}</strong>
            </div>
            <div className="topbar-actions">
              <span className="credit-chip">{(character?.credits ?? 0).toLocaleString()} CR</span>
              {isAdmin && (
                <Link className="btn ghost" to="/admin">
                  어드민
                </Link>
              )}
              <button className="btn ghost" type="button" onClick={onSignOut}>
                로그아웃
              </button>
            </div>
          </header>

          <div className="workspace-body route-frame" key={`${location.pathname}:${routeRefreshKey}`}>
            <Routes>
              <Route path="/" element={<DashboardScreen session={session} profile={profile} character={character} huntState={activeHuntState} onCharacterChange={onCharacterChange} onCharacterRefresh={onCharacterRefresh} />} />
              <Route path="/character" element={<CharacterScreen character={character} onCharacterChange={onCharacterChange} onCharacterRefresh={onCharacterRefresh} />} />
              <Route path="/equipment" element={<EquipmentScreen character={character} onCharacterChange={onCharacterChange} onNoticeChange={handleInventoryNoticeChange} />} />
              <Route path="/essences" element={<EssenceScreen character={character} onNoticeChange={handleInventoryNoticeChange} />} />
              <Route path="/hunt" element={<HuntScreen character={character} onCharacterChange={onCharacterChange} onCharacterRefresh={onCharacterRefresh} onHuntStateChange={handleHuntStateChange} onInventoryReward={handleInventoryReward} />} />
              <Route path="/ranking" element={<RankingScreen />} />
              <Route path="/patch-notes" element={<PatchNotesArchive />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
        </section>
        <AutoBattleHud character={character} huntState={activeHuntState} />
      </main>
    </>
  );
}

function getCurrentNavLabel(pathname: string) {
  if (pathname.startsWith("/character")) return "캐릭터";
  if (pathname.startsWith("/equipment")) return "장비";
  if (pathname.startsWith("/essences")) return "정수";
  if (pathname.startsWith("/hunt")) return "사냥";
  if (pathname.startsWith("/ranking")) return "랭킹";
  if (pathname.startsWith("/patch-notes")) return "패치노트";
  return "대시보드";
}

function hasNavNotice(pathname: string, hasUnspentStatPoints: boolean, inventoryNotice: InventoryNoticeStatus) {
  if (pathname.startsWith("/character")) return hasUnspentStatPoints;
  if (pathname.startsWith("/equipment")) return inventoryNotice.equipment;
  if (pathname.startsWith("/essences")) return inventoryNotice.essence;
  return false;
}

function getNavAriaLabel(label: string, pathname: string, hasUnspentStatPoints: boolean, inventoryNotice: InventoryNoticeStatus) {
  if (pathname === "/character" && hasUnspentStatPoints) return `${label}, 미분배 스탯 포인트 있음`;
  if (pathname === "/equipment" && inventoryNotice.equipment) return `${label}, 새 장비 있음`;
  if (pathname === "/essences" && inventoryNotice.essence) return `${label}, 새 정수 있음`;
  return label;
}

function AutoBattleHud({ character, huntState }: { character: Character | null; huntState: HuntState | null }) {
  const battle = huntState?.lastBattle;
  const isAutoHuntEnabled = Boolean(huntState?.autoHuntEnabled);
  const isBattleInProgress = battle?.status === "in_progress";
  const isRecovering = Boolean(
    !isBattleInProgress
    && huntState?.recoveryEndsAt
    && Date.parse(huntState.recoveryEndsAt) > Date.now(),
  );
  const now = useCombatClock(Boolean(isBattleInProgress || isRecovering));

  const status = isBattleInProgress
    ? "전투 중"
    : isRecovering
      ? "회복 중"
      : battle?.status === "encountered"
        ? "적 조우"
        : isAutoHuntEnabled
          ? "대상 탐색 중"
          : "대기 중";
  const target = (isBattleInProgress || battle?.status === "encountered") && battle
    ? `LV.${battle.enemy.level} ${battle.enemy.name}`
    : null;
  const playerMaxHp = battle?.player.maxHp ?? huntState?.playerMaxHp ?? 0;
  const playerHp = getTickerPlayerHp(huntState, battle, now);
  const enemyHp = getTickerEnemyHp(battle, now);
  const playerHealthRatio = playerMaxHp > 0 ? playerHp / playerMaxHp : 0;
  const enemyHealthRatio = battle && enemyHp !== null && battle.enemy.maxHp > 0 ? enemyHp / battle.enemy.maxHp : null;
  const isStandingBy = status === "대기 중";
  const healthPercent = isStandingBy
    ? 100
    : isBattleInProgress && enemyHealthRatio !== null && playerHealthRatio + enemyHealthRatio > 0
      ? Math.max(0, Math.min(100, (playerHealthRatio / (playerHealthRatio + enemyHealthRatio)) * 100))
      : playerMaxHp > 0 ? Math.max(0, Math.min(100, (playerHp / playerMaxHp) * 100)) : 0;
  const requiredExperience = character ? getRequiredExperienceForLevel(character.level + 1) : null;
  const experiencePercent = !character ? 0 : requiredExperience
    ? Math.max(0, Math.min(100, (character.experience / requiredExperience) * 100))
    : 100;
  const remaining = (huntState?.autoHuntRemaining ?? 0).toString().padStart(2, "0");
  const label = isAutoHuntEnabled ? `AUTO BATTLE (${remaining}/10)` : "BATTLE";
  const isHudActive = isAutoHuntEnabled || isBattleInProgress || isRecovering || isStandingBy;

  return (
    <NavLink
      className={`auto-battle-hud ${isHudActive ? "is-active" : ""} ${isStandingBy ? "is-standing-by" : ""} ${isBattleInProgress ? "has-opponent" : ""}`}
      to="/hunt"
      aria-label={`${isAutoHuntEnabled ? `자동 전투 ${remaining}/10, ` : ""}${status}${target ? `, ${target}` : ""}. 사냥 화면으로 이동`}
      style={{ "--health-ratio": `${healthPercent}%`, "--experience-ratio": `${experiencePercent}%` } as CSSProperties}
    >
      <strong className="auto-battle-hud-label">{label} &gt;</strong>
      <span className="system-ticker-state">{status}</span>
      {target && <><span className="auto-battle-hud-divider" aria-hidden="true">·</span><span className="system-ticker-detail">{target}</span></>}
      <span className="auto-battle-hud-experience" aria-hidden="true" />
    </NavLink>
  );
}

function getTickerPlayerHp(huntState: HuntState | null, battle: HuntState["lastBattle"] | undefined, now: number) {
  if (battle?.status === "in_progress") {
    const startedAt = Date.parse(battle.startedAt);
    const elapsedTenths = Number.isNaN(startedAt) ? battle.durationTicks : Math.max(0, Math.min(battle.durationTicks, Math.floor((now - startedAt) / 100)));
    const playerLog = [...battle.logs].reverse().find((entry) => entry.target === "player" && entry.timeTenths <= elapsedTenths);
    return playerLog?.targetHp ?? battle.player.startHp ?? battle.player.currentHp ?? battle.player.maxHp;
  }

  const startHp = huntState?.playerRecoveryStartHp;
  const maxHp = huntState?.playerMaxHp;
  const startedAt = huntState?.playerRecoveryStartedAt ? Date.parse(huntState.playerRecoveryStartedAt) : Number.NaN;
  const endsAt = huntState?.recoveryEndsAt ? Date.parse(huntState.recoveryEndsAt) : Number.NaN;
  if (startHp !== null && startHp !== undefined && maxHp && !Number.isNaN(startedAt) && !Number.isNaN(endsAt)) {
    if (now >= endsAt) return maxHp;
    const recoveredSteps = Math.max(0, Math.floor((now - startedAt) / 1000));
    const recoveryDurationSeconds = Math.round((endsAt - startedAt) / 1000);
    return recoveryDurationSeconds >= 10
      ? Math.min(maxHp, Math.floor(startHp + ((maxHp - startHp) * recoveredSteps / recoveryDurationSeconds)))
      : Math.min(maxHp, Math.floor(startHp + (maxHp * 0.2 * recoveredSteps)));
  }

  return huntState?.playerCurrentHp ?? battle?.player.currentHp ?? battle?.player.startHp ?? battle?.player.maxHp ?? 0;
}

function getTickerEnemyHp(battle: HuntState["lastBattle"] | undefined, now: number) {
  if (!battle || battle.status !== "in_progress") return null;

  const startedAt = Date.parse(battle.startedAt);
  const elapsedTenths = Number.isNaN(startedAt) ? battle.durationTicks : Math.max(0, Math.min(battle.durationTicks, Math.floor((now - startedAt) / 100)));
  const enemyLog = [...battle.logs].reverse().find((entry) => entry.target !== "player" && entry.timeTenths <= elapsedTenths);
  return enemyLog?.targetHp ?? battle.enemy.maxHp;
}
