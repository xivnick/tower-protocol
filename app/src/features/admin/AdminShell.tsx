import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { Link, Navigate, Route, Routes } from "react-router-dom";
import { checkMyAdminAccess } from "../../api/adminApi";
import type { Profile } from "../../api/profileApi";
import { AdminScreen, type AdminAccessState } from "./AdminScreen";

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
        <header className="admin-topbar">
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
        </header>
        <Routes>
          <Route path="/admin" element={<AdminScreen session={session} adminAccess={adminAccess} onRefresh={refreshAdminAccess} />} />
          <Route path="/admin/*" element={<Navigate to="/admin" replace />} />
        </Routes>
      </main>
    </>
  );
}
