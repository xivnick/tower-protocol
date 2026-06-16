import type { Session } from "@supabase/supabase-js";
import type { Profile } from "../../api/profileApi";
import { useDocumentTitle } from "../../shared/useDocumentTitle";
import { PatchNotesSummary } from "../patchNotes/PatchNotes";

export function DashboardScreen({
  session,
  profile,
}: {
  session: Session | null;
  profile: Profile | null;
}) {
  useDocumentTitle("TOWER://DASHBOARD");

  const nickname = profile?.nickname ?? "UNKNOWN";
  const email = session?.user?.email ?? "-";

  return (
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

      <PatchNotesSummary />
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
