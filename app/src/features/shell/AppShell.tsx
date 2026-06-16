import { useState } from "react";
import type { Session } from "@supabase/supabase-js";
import type { Profile } from "../../api/profileApi";
import { PatchNotesArchive, PatchNotesSummary } from "../patchNotes/PatchNotes";

type ShellView = "dashboard" | "patch-notes";

export function AppShell({
  session,
  profile,
  onSignOut,
}: {
  session: Session | null;
  profile: Profile | null;
  onSignOut: () => void;
}) {
  const [view, setView] = useState<ShellView>("dashboard");
  const nickname = profile?.nickname ?? "UNKNOWN";
  const email = session?.user?.email ?? "-";

  return (
    <>
      <div className="crt-overlay" aria-hidden="true" />
      <main className="app-shell">
        <aside className="rail" aria-label="주요 메뉴">
          <div className="rail-brand">
            <span>TOWER://</span>
            <strong>ONLINE</strong>
          </div>
          <nav className="nav-list" aria-label="게임 화면">
            <button className={`nav-item ${view === "dashboard" ? "is-active" : ""}`} type="button" onClick={() => setView("dashboard")}>
              대시보드
            </button>
            <button className={`nav-item ${view === "patch-notes" ? "is-active" : ""}`} type="button" onClick={() => setView("patch-notes")}>
              패치노트
            </button>
            <button className="nav-item" type="button" disabled>
              사냥
            </button>
            <button className="nav-item" type="button" disabled>
              탑
            </button>
            <button className="nav-item" type="button" disabled>
              캐릭터
            </button>
            <button className="nav-item" type="button" disabled>
              장비
            </button>
            <button className="nav-item" type="button" disabled>
              정수
            </button>
          </nav>
        </aside>

        <section className="workspace">
          <header className="topbar">
            <div>
              <span className="eyebrow">SESSION</span>
              <strong>{nickname}</strong>
            </div>
            <button className="btn ghost" type="button" onClick={onSignOut}>
              로그아웃
            </button>
          </header>

          {view === "dashboard" ? (
            <section className="content-grid">
              <article className="panel">
                <div className="panel-head">
                  <span>DASHBOARD</span>
                  <h2>접속 완료</h2>
                </div>
                <div className="kv-grid">
                  <Kv label="닉네임" value={nickname} />
                  <Kv label="계정" value={email} />
                  <Kv label="다음 구현" value="캐릭터 생성" />
                </div>
              </article>

              <PatchNotesSummary onOpenAll={() => setView("patch-notes")} />
            </section>
          ) : (
            <PatchNotesArchive onBack={() => setView("dashboard")} />
          )}
        </section>
      </main>
    </>
  );
}

function Kv({ label, value }: { label: string; value: string }) {
  return (
    <div className="kv">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
