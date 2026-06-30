import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { Link } from "react-router-dom";
import { loadAdminOverview, type AdminOverview } from "../../api/adminApi";
import { useDocumentTitle } from "../../shared/useDocumentTitle";

export type AdminAccessState =
  | { status: "checking"; isAdmin: false; message: string }
  | { status: "ready"; isAdmin: boolean; message: string }
  | { status: "error"; isAdmin: false; message: string };

export function AdminScreen({
  session,
  adminAccess,
  onRefresh,
}: {
  session: Session | null;
  adminAccess: AdminAccessState;
  onRefresh: () => void;
}) {
  useDocumentTitle("TOWER://ADMIN");

  const email = session?.user.email ?? "-";
  const userId = session?.user.id ?? "-";
  const { status, overview, message } = useAdminOverview(adminAccess.isAdmin);

  if (adminAccess.status === "checking") {
    return (
      <section className="admin-view">
        <div className="admin-page-head">
          <div>
            <span className="eyebrow">ADMIN</span>
            <h1>운영 콘솔</h1>
          </div>
        </div>
        <p className="panel-message">권한 신호를 확인하는 중...</p>
      </section>
    );
  }

  if (!adminAccess.isAdmin) {
    return (
      <section className="admin-view">
        <div className="admin-page-head">
          <div>
            <span className="eyebrow">ADMIN</span>
            <h1>접근 거부</h1>
          </div>
          <button className="btn ghost" type="button" onClick={onRefresh}>
            재확인
          </button>
        </div>
        <article className="panel danger-panel">
          <div className="panel-head">
            <span>ACCESS</span>
            <h2>권한 없음</h2>
          </div>
          <div className="kv-grid">
            <Kv label="계정" value={email} />
            <Kv label="유저 ID" value={userId} />
            <Kv label="상태" value={adminAccess.status === "error" ? adminAccess.message : "admin_users row가 없습니다."} />
          </div>
        </article>
      </section>
    );
  }

  return (
    <section className="admin-view">
      <div className="admin-page-head">
        <div>
          <span className="eyebrow">ADMIN</span>
          <h1>운영 콘솔</h1>
        </div>
        <button className="btn ghost" type="button" onClick={onRefresh}>
          권한 재확인
        </button>
      </div>

      <div className="admin-metric-grid">
        <article className="admin-status-panel">
          <span>ACCESS</span>
          <strong>승인됨</strong>
          <small>{email}</small>
        </article>

        <Metric label="USERS" value={overview?.users_total ?? "-"} />
        <Metric label="CHARACTERS" value={overview?.characters_total ?? "-"} />
        <Metric label="ACTIVE HUNTS" value={overview?.active_hunts ?? "-"} />
      </div>

      {status !== "ready" ? (
        <p className={`panel-message ${status === "error" ? "is-error" : ""}`}>{message}</p>
      ) : (
        <div className="admin-grid">
          <article className="panel admin-console-panel">
            <div className="panel-head">
              <span>TOP CHARACTER</span>
              <h2>최고 레벨</h2>
            </div>
            <div className="kv-grid">
              <Kv label="캐릭터" value={overview.highest_character.name ?? "-"} />
              <Kv label="레벨" value={formatNullableNumber(overview.highest_character.level)} />
              <Kv label="닉네임" value={overview.highest_character.nickname ?? "-"} />
            </div>
          </article>

          <article className="panel admin-console-panel">
            <div className="panel-head">
              <span>RECENT</span>
              <h2>최근 캐릭터</h2>
            </div>
            <ul className="admin-tool-list" aria-label="최근 캐릭터">
              {overview.recent_characters.length === 0 ? (
                <li><strong>데이터 없음</strong><span>-</span></li>
              ) : overview.recent_characters.map((character) => (
                <li key={character.id}>
                  <strong>{character.name}</strong>
                  <span>LV.{character.level}</span>
                </li>
              ))}
            </ul>
          </article>

          <article className="panel admin-console-panel">
            <div className="panel-head">
              <span>CONTENT</span>
              <h2>패치노트</h2>
            </div>
            <div className="kv-grid">
              <Kv label="공개" value={overview.published_patch_notes.toLocaleString()} />
              <Kv label="초안" value={overview.draft_patch_notes.toLocaleString()} />
            </div>
          </article>

          <article className="panel admin-console-panel">
            <div className="panel-head">
              <span>TOOLS</span>
              <h2>작업대</h2>
            </div>
            <div className="admin-action-list">
              <Link className="btn ghost" to="/admin/players">플레이어 조회</Link>
              <Link className="btn ghost" to="/admin/support">지원 도구</Link>
              <Link className="btn ghost" to="/admin/balance">밸런스 조회</Link>
              <Link className="btn ghost" to="/admin/content">콘텐츠 관리</Link>
            </div>
          </article>
        </div>
      )}
    </section>
  );
}

type OverviewState =
  | { status: "loading"; overview: null; message: string }
  | { status: "ready"; overview: AdminOverview; message: "" }
  | { status: "error"; overview: null; message: string };

function useAdminOverview(enabled: boolean): OverviewState {
  const [state, setState] = useState<OverviewState>({ status: "loading", overview: null, message: "운영 지표를 불러오는 중..." });

  useEffect(() => {
    if (!enabled) return;

    let isActive = true;
    void loadAdminOverview().then((result) => {
      if (!isActive) return;
      if (!result.ok) {
        setState({ status: "error", overview: null, message: result.message });
        return;
      }
      setState({ status: "ready", overview: result.data, message: "" });
    });

    return () => { isActive = false; };
  }, [enabled]);

  return state;
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <article className="admin-metric">
      <span>{label}</span>
      <strong>{typeof value === "number" ? value.toLocaleString() : value}</strong>
    </article>
  );
}

function formatNullableNumber(value?: number) {
  return value === undefined ? "-" : value.toLocaleString();
}

function Kv({ label, value }: { label: string; value: string }) {
  return (
    <div className="kv">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
