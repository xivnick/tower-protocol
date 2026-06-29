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
      <section className="archive-view admin-view">
        <div className="archive-head">
          <div>
            <span className="eyebrow">ADMIN</span>
            <h1>어드민 터미널</h1>
          </div>
        </div>
        <p className="panel-message">권한 신호를 확인하는 중...</p>
      </section>
    );
  }

  if (!adminAccess.isAdmin) {
    return (
      <section className="archive-view admin-view">
        <div className="archive-head">
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
    <section className="archive-view admin-view">
      <div className="archive-head">
        <div>
          <span className="eyebrow">ADMIN</span>
          <h1>어드민 터미널</h1>
        </div>
        <button className="btn ghost" type="button" onClick={onRefresh}>
          권한 재확인
        </button>
      </div>

      <div className="admin-grid">
        <article className="panel">
          <div className="panel-head">
            <span>ACCESS</span>
            <h2>권한 확인</h2>
          </div>
          <div className="kv-grid">
            <Kv label="계정" value={email} />
            <Kv label="유저 ID" value={userId} />
            <Kv label="어드민" value="활성" />
          </div>
        </article>

        <article className="panel">
          <div className="panel-head">
            <span>TEST PAGE</span>
            <h2>테스트 콘솔</h2>
          </div>
          <div className="admin-terminal" role="status">
            <span>{">"} public.is_admin()</span>
            <strong>TRUE</strong>
            <small>어드민 화면 라우팅과 권한 확인이 동작 중입니다.</small>
          </div>
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
