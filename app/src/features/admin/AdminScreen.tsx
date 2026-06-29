import type { Session } from "@supabase/supabase-js";
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

      <div className="admin-grid">
        <article className="admin-status-panel">
          <span>ACCESS</span>
          <strong>승인됨</strong>
          <small>{email}</small>
        </article>

        <article className="panel admin-console-panel">
          <div className="panel-head">
            <span>SESSION</span>
            <h2>접속 정보</h2>
          </div>
          <div className="kv-grid">
            <Kv label="계정" value={email} />
            <Kv label="유저 ID" value={userId} />
            <Kv label="권한" value="admin" />
          </div>
        </article>

        <article className="panel admin-console-panel">
          <div className="panel-head">
            <span>TOOLS</span>
            <h2>작업대</h2>
          </div>
          <ul className="admin-tool-list" aria-label="어드민 작업">
            <li><strong>플레이어</strong><span>대기</span></li>
            <li><strong>밸런스</strong><span>대기</span></li>
            <li><strong>로그</strong><span>대기</span></li>
          </ul>
        </article>
      </div>
    </section>
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
