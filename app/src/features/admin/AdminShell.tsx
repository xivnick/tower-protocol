import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { Link, Navigate, NavLink, Route, Routes, useLocation, useNavigate } from "react-router-dom";
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
  const [isNavOpen, setIsNavOpen] = useState(false);
  const [isNavClosing, setIsNavClosing] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const nickname = profile?.nickname ?? "UNKNOWN";
  const currentNavLabel = getCurrentAdminNavLabel(location.pathname);

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

  function toggleNavMenu() {
    if (isNavOpen) {
      closeNavMenu();
      return;
    }

    setIsNavClosing(false);
    setIsNavOpen(true);
  }

  function closeNavMenu(nextPath?: string) {
    setIsNavClosing(true);
    window.setTimeout(() => {
      setIsNavOpen(false);
      setIsNavClosing(false);

      if (nextPath && nextPath !== location.pathname) {
        navigate(nextPath);
      }
    }, 100);
  }

  return (
    <>
      <div className="crt-overlay" aria-hidden="true" />
      <main className="app-shell admin-shell">
        <div className="mobile-top-chrome">
          <header className="mobile-shell-head">
            <div className="mobile-shell-row">
              <NavLink className="rail-brand compact" to="/admin">
                <span>TOWER://ADMIN</span>
                <i aria-hidden="true" />
              </NavLink>
              <div className="mobile-session-actions">
                <span className="credit-chip">{nickname}</span>
                <Link className="btn ghost" to="/">
                  게임
                </Link>
                <button className="btn ghost" type="button" onClick={onSignOut}>
                  로그아웃
                </button>
              </div>
            </div>
          </header>

          <section className="mobile-nav-panel" aria-label="어드민 모바일 메뉴">
            <button className="mobile-nav-trigger" type="button" onClick={toggleNavMenu} aria-expanded={isNavOpen}>
              <span>{currentNavLabel}</span>
              <svg className="mobile-nav-icon" aria-hidden="true" viewBox="0 0 16 16">
                <path d="m4 6 4 4 4-4" />
              </svg>
            </button>
            {isNavOpen && (
              <nav className={`mobile-nav-menu ${isNavClosing ? "is-closing" : ""}`} aria-label="어드민 화면">
                {adminNavItems.map((item) => (
                  <button
                    className={`nav-item mobile-nav-item ${isAdminPathActive(location.pathname, item.to, item.end) ? "is-active" : ""}`}
                    type="button"
                    key={item.label}
                    onClick={() => closeNavMenu(item.to)}
                  >
                    {item.label}
                  </button>
                ))}
              </nav>
            )}
          </section>
        </div>

        <aside className="rail" aria-label="어드민 메뉴">
          <NavLink className="rail-brand" to="/admin">
            <span>TOWER://ADMIN</span>
            <i aria-hidden="true" />
          </NavLink>
          <nav className="nav-list" aria-label="어드민 화면">
            {adminNavItems.map((item) => (
              <NavLink className={({ isActive }) => `nav-item ${isActive ? "is-active" : ""}`} to={item.to} end={item.end} key={item.label}>
                {item.label}
              </NavLink>
            ))}
          </nav>
        </aside>

        <section className="workspace">
          <header className="topbar">
            <div className="session-block">
              <span className="eyebrow">ADMIN</span>
              <strong>{nickname}</strong>
            </div>
            <div className="topbar-actions">
              <Link className="btn ghost" to="/">
                게임
              </Link>
              <button className="btn ghost" type="button" onClick={onSignOut}>
                로그아웃
              </button>
            </div>
          </header>

          <div className="workspace-body route-frame">
            <Routes>
              <Route path="/admin" element={<AdminScreen session={session} adminAccess={adminAccess} onRefresh={refreshAdminAccess} />} />
              <Route path="/admin/players" element={<AdminPlaceholder title="플레이어" label="PLAYERS" />} />
              <Route path="/admin/balance" element={<AdminPlaceholder title="밸런스" label="BALANCE" />} />
              <Route path="/admin/logs" element={<AdminPlaceholder title="로그" label="LOGS" />} />
              <Route path="/admin/*" element={<Navigate to="/admin" replace />} />
            </Routes>
          </div>
        </section>
      </main>
    </>
  );
}

function getCurrentAdminNavLabel(pathname: string) {
  if (pathname.startsWith("/admin/players")) return "플레이어";
  if (pathname.startsWith("/admin/balance")) return "밸런스";
  if (pathname.startsWith("/admin/logs")) return "로그";
  return "대시보드";
}

function isAdminPathActive(pathname: string, itemPath: string, exact?: boolean) {
  if (exact) return pathname === itemPath;
  return pathname.startsWith(itemPath);
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
