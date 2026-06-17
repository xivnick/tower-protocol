import { useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { Navigate, NavLink, Route, Routes, useLocation } from "react-router-dom";
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
  const [isNavOpen, setIsNavOpen] = useState(false);
  const location = useLocation();
  const nickname = profile?.nickname ?? "UNKNOWN";
  const currentNavLabel = location.pathname.startsWith("/patch-notes") ? "패치노트" : "대시보드";

  function toggleAccountMenu() {
    setIsAccountOpen((isOpen) => !isOpen);
    setIsNavOpen(false);
  }

  function toggleNavMenu() {
    setIsNavOpen((isOpen) => !isOpen);
    setIsAccountOpen(false);
  }

  return (
    <>
      <div className="crt-overlay" aria-hidden="true" />
      <main className="app-shell">
        <header className="mobile-shell-head">
          <div className="mobile-shell-row">
            <div className="rail-brand compact">
              <span>TOWER://</span>
            </div>
            <button className="account-chip" type="button" onClick={toggleAccountMenu} aria-expanded={isAccountOpen}>
              {nickname}
            </button>
          </div>
          {isAccountOpen && (
            <div className="mobile-account-menu">
              <span>SESSION</span>
              <strong>{nickname}</strong>
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
            <nav className="mobile-nav-menu" aria-label="게임 화면">
              {navItems.map((item) => (
                item.enabled ? (
                  <NavLink
                    className={({ isActive }) => `mobile-nav-item ${isActive ? "is-active" : ""}`}
                    to={item.to}
                    end={item.end}
                    key={item.label}
                    onClick={() => setIsNavOpen(false)}
                  >
                    {item.label}
                  </NavLink>
                ) : (
                  <button className="mobile-nav-item" type="button" disabled key={item.label}>
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

          <div className="workspace-body">
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
