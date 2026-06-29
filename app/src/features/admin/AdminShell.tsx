import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { Link, Navigate, NavLink, Route, Routes } from "react-router-dom";
import { checkMyAdminAccess } from "../../api/adminApi";
import type { Profile } from "../../api/profileApi";
import { AdminScreen, type AdminAccessState } from "./AdminScreen";

const adminNavItems = [
  { label: "대시보드", to: "/admin", end: true },
  { label: "플레이어", to: "/admin/players" },
  { label: "밸런스", to: "/admin/balance" },
  { label: "로그", to: "/admin/logs" },
];

export function AdminShell({
  session,
  profile,
  onSignOut,
}: {
  session: Session | null;
  profile: Profile | null;
  onSignOut: () => void;
}) {
  const [adminAccess, setAdminAccess] = useState<AdminAccessState>({ status: "checking", isAdmin: false, message: "" });

  useEffect(() => {
    refreshAdminAccess();
  }, [session?.user.id]);

  function refreshAdminAccess() {
    if (!session?.user.id) {
      setAdminAccess({ status: "ready", isAdmin: false, message: "" });
      return;
    }

    setAdminAccess({ status: "checking", isAdmin: false, message: "" });
    void checkMyAdminAccess().then((result) => {
      if (!result.ok) {
        setAdminAccess({ status: "error", isAdmin: false, message: result.message });
        return;
      }

      setAdminAccess({ status: "ready", isAdmin: result.isAdmin, message: "" });
    });
  }

  return (
    <>
      <div className="crt-overlay" aria-hidden="true" />
      <main className="admin-shell">
        <header className="admin-header">
          <div className="admin-topbar">
            <Link className="admin-brand" to="/admin">
              <span>TOWER://ADMIN</span>
              <i aria-hidden="true" />
            </Link>
            <div className="admin-session">
              <span>{profile?.nickname ?? "UNKNOWN"}</span>
              <Link className="btn ghost" to="/">
                게임
              </Link>
              <button className="btn ghost" type="button" onClick={onSignOut}>
                로그아웃
              </button>
            </div>
          </div>
          <nav className="admin-nav" aria-label="어드민 메뉴">
            {adminNavItems.map((item) => (
              <NavLink className={({ isActive }) => `admin-nav-item ${isActive ? "is-active" : ""}`} to={item.to} end={item.end} key={item.label}>
                {item.label}
              </NavLink>
            ))}
          </nav>
        </header>
        <Routes>
          <Route path="/admin" element={<AdminScreen session={session} adminAccess={adminAccess} onRefresh={refreshAdminAccess} />} />
          <Route path="/admin/players" element={<AdminPlaceholder title="플레이어" label="PLAYERS" />} />
          <Route path="/admin/balance" element={<AdminPlaceholder title="밸런스" label="BALANCE" />} />
          <Route path="/admin/logs" element={<AdminPlaceholder title="로그" label="LOGS" />} />
          <Route path="/admin/*" element={<Navigate to="/admin" replace />} />
        </Routes>
      </main>
    </>
  );
}

function AdminPlaceholder({ title, label }: { title: string; label: string }) {
  return (
    <section className="admin-view">
      <div className="admin-page-head">
        <div>
          <span className="eyebrow">{label}</span>
          <h1>{title}</h1>
        </div>
      </div>
      <article className="panel admin-console-panel">
        <div className="panel-head">
          <span>STATUS</span>
          <h2>준비 중</h2>
        </div>
        <p className="panel-message">이 작업대는 아직 연결되지 않았습니다.</p>
      </article>
    </section>
  );
}
