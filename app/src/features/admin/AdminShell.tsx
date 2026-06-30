import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { Link, Navigate, NavLink, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { checkMyAdminAccess } from "../../api/adminApi";
import type { Profile } from "../../api/profileApi";
import { AdminAuditScreen, AdminBalanceScreen, AdminContentScreen, AdminPlayersScreen, AdminSupportScreen } from "./AdminPages";
import { AdminScreen, type AdminAccessState } from "./AdminScreen";

const adminNavItems = [
  { label: "대시보드", to: "/admin", end: true },
  { label: "플레이어", to: "/admin/players" },
  { label: "지원", to: "/admin/support" },
  { label: "밸런스", to: "/admin/balance" },
  { label: "콘텐츠", to: "/admin/content" },
  { label: "감사", to: "/admin/audit" },
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
  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const [isAccountClosing, setIsAccountClosing] = useState(false);
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

  function toggleAccountMenu() {
    if (isAccountOpen) {
      closeAccountMenu();
      return;
    }

    setIsAccountClosing(false);
    setIsAccountOpen(true);
  }

  function closeAccountMenu() {
    setIsAccountClosing(true);
    window.setTimeout(() => {
      setIsAccountOpen(false);
      setIsAccountClosing(false);
    }, 100);
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
                <button className="account-chip" type="button" onClick={toggleAccountMenu} aria-expanded={isAccountOpen}>
                  {nickname}
                </button>
              </div>
            </div>
            {isAccountOpen && (
              <div className={`mobile-account-menu ${isAccountClosing ? "is-closing" : ""}`}>
                <div>
                  <span>ADMIN</span>
                  <strong>{nickname}</strong>
                </div>
                <div className="mobile-account-actions">
                  <Link className="btn ghost" to="/" onClick={() => closeAccountMenu()}>
                    게임
                  </Link>
                  <button className="btn ghost" type="button" onClick={onSignOut}>
                    로그아웃
                  </button>
                </div>
              </div>
            )}
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
              <button className="account-chip admin-account-chip" type="button" onClick={toggleAccountMenu} aria-expanded={isAccountOpen}>
                {nickname}
              </button>
              {isAccountOpen && (
                <div className={`account-menu ${isAccountClosing ? "is-closing" : ""}`}>
                  <Link className="btn ghost" to="/" onClick={() => closeAccountMenu()}>
                    게임
                  </Link>
                  <button className="btn ghost" type="button" onClick={onSignOut}>
                    로그아웃
                  </button>
                </div>
              )}
            </div>
          </header>

          <div className="workspace-body route-frame">
            <Routes>
              <Route path="/admin" element={<AdminScreen session={session} adminAccess={adminAccess} onRefresh={refreshAdminAccess} />} />
              <Route path="/admin/players" element={<AdminPlayersScreen />} />
              <Route path="/admin/support" element={<AdminSupportScreen />} />
              <Route path="/admin/balance" element={<AdminBalanceScreen />} />
              <Route path="/admin/content" element={<AdminContentScreen />} />
              <Route path="/admin/audit" element={<AdminAuditScreen />} />
              <Route path="/admin/logs" element={<Navigate to="/admin/audit" replace />} />
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
  if (pathname.startsWith("/admin/support")) return "지원";
  if (pathname.startsWith("/admin/balance")) return "밸런스";
  if (pathname.startsWith("/admin/content")) return "콘텐츠";
  if (pathname.startsWith("/admin/audit") || pathname.startsWith("/admin/logs")) return "감사";
  return "대시보드";
}

function isAdminPathActive(pathname: string, itemPath: string, exact?: boolean) {
  if (exact) return pathname === itemPath;
  return pathname.startsWith(itemPath);
}
