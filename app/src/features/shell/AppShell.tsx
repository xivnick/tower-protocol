import { useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { Navigate, NavLink, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import type { Profile } from "../../api/profileApi";
import { DashboardScreen } from "../dashboard/DashboardScreen";
import { PatchNotesArchive } from "../patchNotes/PatchNotes";

const navItems = [
  { label: "대시보드", to: "/", end: true, enabled: true },
  { label: "사냥", to: "/hunt", enabled: false },
  { label: "탑", to: "/tower", enabled: false },
  { label: "캐릭터", to: "/character", enabled: false },
  { label: "패치노트", to: "/patch-notes", enabled: true },
];

const dropdownCloseMs = 100;

export function AppShell({
  session,
  profile,
  onSignOut,
}: {
  session: Session | null;
  profile: Profile | null;
  onSignOut: () => void;
}) {
  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const [isAccountClosing, setIsAccountClosing] = useState(false);
  const [isNavOpen, setIsNavOpen] = useState(false);
  const [isNavClosing, setIsNavClosing] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const nickname = profile?.nickname ?? "UNKNOWN";
  const currentNavLabel = location.pathname.startsWith("/patch-notes") ? "패치노트" : "대시보드";

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

  return (
    <>
      <div className="crt-overlay" aria-hidden="true" />
      <main className="app-shell">
        <header className="mobile-shell-head">
          <div className="mobile-shell-row">
            <div className="rail-brand compact">
              <span>TOWER://</span>
              <i aria-hidden="true" />
            </div>
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
          <div className="rail-brand">
            <span>TOWER://</span>
            <i aria-hidden="true" />
          </div>
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
              <Route path="/" element={<DashboardScreen session={session} profile={profile} />} />
              <Route path="/patch-notes" element={<PatchNotesArchive />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
        </section>
      </main>
    </>
  );
}
