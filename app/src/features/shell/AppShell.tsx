import type { Session } from "@supabase/supabase-js";
import { Navigate, NavLink, Route, Routes } from "react-router-dom";
import type { Profile } from "../../api/profileApi";
import { DashboardScreen } from "../dashboard/DashboardScreen";
import { PatchNotesArchive } from "../patchNotes/PatchNotes";

export function AppShell({
  session,
  profile,
  onSignOut,
}: {
  session: Session | null;
  profile: Profile | null;
  onSignOut: () => void;
}) {
  const nickname = profile?.nickname ?? "UNKNOWN";

  return (
    <>
      <div className="crt-overlay" aria-hidden="true" />
      <main className="app-shell">
        <header className="mobile-shell-head">
          <div className="rail-brand compact">
            <span>TOWER://</span>
            <strong>ONLINE</strong>
          </div>
          <button className="btn ghost" type="button" onClick={onSignOut}>
            로그아웃
          </button>
        </header>

        <aside className="rail" aria-label="주요 메뉴">
          <div className="rail-brand">
            <span>TOWER://</span>
            <strong>ONLINE</strong>
          </div>
          <nav className="nav-list" aria-label="게임 화면">
            <NavLink className={({ isActive }) => `nav-item ${isActive ? "is-active" : ""}`} to="/" end>
              대시보드
            </NavLink>
            <button className="nav-item" type="button" disabled>
              사냥
            </button>
            <button className="nav-item" type="button" disabled>
              탑
            </button>
            <button className="nav-item" type="button" disabled>
              캐릭터
            </button>
            <NavLink className={({ isActive }) => `nav-item ${isActive ? "is-active" : ""}`} to="/patch-notes">
              패치노트
            </NavLink>
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
