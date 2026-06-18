import { useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { Navigate, NavLink, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import type { Profile } from "../../api/profileApi";
import type { Character } from "../../types/character";
import type { ToastInput, ToastTone } from "../../types/toast";
import { CharacterScreen } from "../character/CharacterScreen";
import { DashboardScreen } from "../dashboard/DashboardScreen";
import { PatchNotesArchive } from "../patchNotes/PatchNotes";

type ToastMessage = {
  id: number;
  message: string;
  tone: ToastTone;
  isClosing: boolean;
};

const navItems = [
  { label: "대시보드", to: "/", end: true, enabled: true },
  { label: "사냥", to: "/hunt", enabled: false },
  { label: "탑", to: "/tower", enabled: false },
  { label: "캐릭터", to: "/character", enabled: true },
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
  onSignOut,
}: {
  session: Session | null;
  profile: Profile | null;
  character: Character | null;
  onCharacterChange: (character: Character | null) => void;
  onSignOut: () => void;
}) {
  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const [isAccountClosing, setIsAccountClosing] = useState(false);
  const [isNavOpen, setIsNavOpen] = useState(false);
  const [isNavClosing, setIsNavClosing] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const toastsRef = useRef<ToastMessage[]>([]);
  const toastIdRef = useRef(0);
  const location = useLocation();
  const navigate = useNavigate();
  const nickname = profile?.nickname ?? "UNKNOWN";
  const currentNavLabel = getCurrentNavLabel(location.pathname);

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
            {currentNavLabel} ▾
          </button>
          {isNavOpen && (
            <nav className={`mobile-nav-menu ${isNavClosing ? "is-closing" : ""}`} aria-label="게임 화면">
              {navItems.map((item) => (
                item.enabled ? (
                  <button
                    className={`nav-item mobile-nav-item ${item.to === location.pathname ? "is-active" : ""}`}
                    type="button"
                    key={item.label}
                    onClick={() => closeNavMenu(item.to)}
                  >
                    {item.label}
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
                <NavLink className={({ isActive }) => `nav-item ${isActive ? "is-active" : ""}`} to={item.to} end={item.end} key={item.label}>
                  {item.label}
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

          <div className="workspace-body route-frame" key={location.pathname}>
            <Routes>
              <Route path="/" element={<DashboardScreen session={session} profile={profile} character={character} />} />
              <Route path="/character" element={<CharacterScreen character={character} onCharacterChange={onCharacterChange} onToast={showToast} />} />
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
  if (pathname.startsWith("/patch-notes")) return "패치노트";
  return "대시보드";
}
