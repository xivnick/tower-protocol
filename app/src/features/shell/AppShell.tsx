import { useEffect, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { Navigate, NavLink, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import type { Profile } from "../../api/profileApi";
import type { Character } from "../../types/character";
import type { ToastInput, ToastTone } from "../../types/toast";
import { getMyHuntState, settleTrainingDummyHunt } from "../../api/characterApi";
import type { HuntState } from "../../api/characterApi";
import { CharacterScreen } from "../character/CharacterScreen";
import { DashboardScreen } from "../dashboard/DashboardScreen";
import { HuntScreen } from "../hunt/HuntScreen";
import { PatchNotesArchive } from "../patchNotes/PatchNotes";
import { RankingScreen } from "../ranking/Ranking";

type ToastMessage = {
  id: number;
  message: string;
  tone: ToastTone;
  isClosing: boolean;
};

const navItems = [
  { label: "대시보드", to: "/", end: true, enabled: true },
  { label: "사냥", to: "/hunt", enabled: true },
  { label: "탑", to: "/tower", enabled: false },
  { label: "캐릭터", to: "/character", enabled: true },
  { label: "랭킹", to: "/ranking", enabled: true },
  { label: "패치노트", to: "/patch-notes", enabled: true },
];

const dropdownCloseMs = 100;
const toastDurationMs = 3000;
const toastCloseMs = 180;
const maxToasts = 3;

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
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [activeHuntState, setActiveHuntState] = useState<HuntState | null>(null);
  const toastsRef = useRef<ToastMessage[]>([]);
  const toastIdRef = useRef(0);
  const settlementAttemptRef = useRef<string | null>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const nickname = profile?.nickname ?? "UNKNOWN";
  const currentNavLabel = getCurrentNavLabel(location.pathname);
  const hasUnspentStatPoints = Boolean(character && character.stat_points > 0);

  useEffect(() => {
    if (!character) {
      setActiveHuntState(null);
      return;
    }

    let isActive = true;
    void getMyHuntState().then((nextState) => {
      if (isActive && nextState.ok) setActiveHuntState(nextState.state);
    });

    return () => { isActive = false; };
  }, [character?.id]);

  useEffect(() => {
    const battle = activeHuntState?.lastBattle;
    if (location.pathname.startsWith("/hunt") || !battle || battle.status !== "in_progress" || !battle.endsAt) return;

    const endsAt = Date.parse(battle.endsAt);
    if (Number.isNaN(endsAt)) return;

    let isActive = true;
    const timeoutId = window.setTimeout(() => {
      if (settlementAttemptRef.current === battle.startedAt) return;

      settlementAttemptRef.current = battle.startedAt;
      void settleTrainingDummyHunt().then((nextResult) => {
        settlementAttemptRef.current = null;
        if (!isActive || !nextResult.ok) return;

        setActiveHuntState(nextResult.huntState);
        if (!nextResult.character) return;

        onCharacterChange(nextResult.character);
        showToast({ message: `전투 완료 · +${nextResult.gainedExperience} EXP`, tone: "system" });
        if (nextResult.levelAfter > nextResult.levelBefore) {
          showToast({ message: `레벨업! -> LV.${nextResult.levelAfter}`, tone: "epic" });
        }
      });
    }, Math.max(0, endsAt - Date.now()) + 180);

    return () => {
      isActive = false;
      window.clearTimeout(timeoutId);
    };
  }, [activeHuntState, location.pathname, onCharacterChange]);

  function handleHuntStateChange(huntState: HuntState | null) {
    setActiveHuntState(huntState);
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

  function showToast(input: ToastInput) {
    const id = toastIdRef.current + 1;
    toastIdRef.current = id;
    const tone = input.tone ?? "common";

    function appendToast() {
      updateToasts((current) => [...current, { id, message: input.message, tone, isClosing: false }]);
      window.setTimeout(() => {
        closeToast(id);
      }, toastDurationMs);
    }

    const openToasts = toastsRef.current.filter((toast) => !toast.isClosing);

    if (openToasts.length >= maxToasts) {
      closeToast(openToasts[0].id);
      window.setTimeout(appendToast, toastCloseMs);
      return;
    }

    appendToast();
  }

  function closeToast(id: number) {
    updateToasts((current) => current.map((toast) => toast.id === id ? { ...toast, isClosing: true } : toast));
    window.setTimeout(() => {
      updateToasts((current) => current.filter((toast) => toast.id !== id));
    }, toastCloseMs);
  }

  function updateToasts(updater: (current: ToastMessage[]) => ToastMessage[]) {
    const nextToasts = updater(toastsRef.current);
    toastsRef.current = nextToasts;
    setToasts(nextToasts);
  }

  return (
    <>
      <div className="crt-overlay" aria-hidden="true" />
      <main className="app-shell">
        <header className="mobile-shell-head">
          <div className="mobile-shell-row">
            <NavLink className="rail-brand compact" to="/">
              <span>TOWER://</span>
              <i aria-hidden="true" />
            </NavLink>
            <button className="account-chip" type="button" onClick={toggleAccountMenu} aria-expanded={isAccountOpen}>
              {nickname}
            </button>
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
            </div>
          )}
        </header>

        <section className="mobile-nav-panel" aria-label="모바일 메뉴">
          <button className="mobile-nav-trigger" type="button" onClick={toggleNavMenu} aria-expanded={isNavOpen}>
            <span>{currentNavLabel}</span>
            {currentNavLabel === "캐릭터" && hasUnspentStatPoints && <span className="nav-notice" aria-hidden="true" />}
            <span className="mobile-nav-icon" aria-hidden="true">▾</span>
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
                    aria-label={item.to === "/character" && hasUnspentStatPoints ? "캐릭터, 미분배 스탯 포인트 있음" : item.label}
                  >
                    {item.label}
                    {item.to === "/character" && hasUnspentStatPoints && <span className="nav-notice" aria-hidden="true" />}
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

        <aside className="rail" aria-label="주요 메뉴">
          <NavLink className="rail-brand" to="/">
            <span>TOWER://</span>
            <i aria-hidden="true" />
          </NavLink>
          <nav className="nav-list" aria-label="게임 화면">
            {navItems.map((item) => (
              item.enabled ? (
                <NavLink className={({ isActive }) => `nav-item ${isActive ? "is-active" : ""}`} to={item.to} end={item.end} key={item.label} onClick={() => refreshCurrentRoute(item.to)} aria-label={item.to === "/character" && hasUnspentStatPoints ? "캐릭터, 미분배 스탯 포인트 있음" : item.label}>
                  {item.label}
                  {item.to === "/character" && hasUnspentStatPoints && <span className="nav-notice" aria-hidden="true" />}
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
            <button className="btn ghost" type="button" onClick={onSignOut}>
              로그아웃
            </button>
          </header>

          <div className="workspace-body route-frame" key={`${location.pathname}:${routeRefreshKey}`}>
            <Routes>
              <Route path="/" element={<DashboardScreen session={session} profile={profile} character={character} />} />
              <Route path="/character" element={<CharacterScreen character={character} onCharacterChange={onCharacterChange} onCharacterRefresh={onCharacterRefresh} onToast={showToast} />} />
              <Route path="/hunt" element={<HuntScreen character={character} onCharacterChange={onCharacterChange} onCharacterRefresh={onCharacterRefresh} onHuntStateChange={handleHuntStateChange} onToast={showToast} />} />
              <Route path="/ranking" element={<RankingScreen />} />
              <Route path="/patch-notes" element={<PatchNotesArchive />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
        </section>
      </main>
      {toasts.length > 0 && (
        <div className="toast-stack" role="status" aria-live="polite">
          {toasts.map((toast) => (
            <div className={`toast is-${toast.tone} ${toast.isClosing ? "is-closing" : ""}`} key={toast.id}>
              {toast.message}
            </div>
          ))}
        </div>
      )}
    </>
  );
}

function getCurrentNavLabel(pathname: string) {
  if (pathname.startsWith("/character")) return "캐릭터";
  if (pathname.startsWith("/hunt")) return "사냥";
  if (pathname.startsWith("/ranking")) return "랭킹";
  if (pathname.startsWith("/patch-notes")) return "패치노트";
  return "대시보드";
}
