import type { Session } from "@supabase/supabase-js";
import { Link } from "react-router-dom";
import type { Profile } from "../../api/profileApi";
import { useDocumentTitle } from "../../shared/useDocumentTitle";
import type { Character } from "../../types/character";
import { PatchNotesSummary } from "../patchNotes/PatchNotes";

export function DashboardScreen({
  session,
  profile,
  character,
}: {
  session: Session | null;
  profile: Profile | null;
  character: Character | null;
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
          <Kv label="캐릭터" value={character?.name ?? "없음"} />
          <Kv label="다음 구현" value="캐릭터 생성" />
        </div>
      </article>

      {!character && (
        <article className="panel">
          <div className="panel-head compact action-head">
            <div>
              <span>CHARACTER</span>
              <h2>캐릭터 생성 안내</h2>
            </div>
            <Link className="text-button" to="/character">
              캐릭터 생성
            </Link>
          </div>
          <p className="panel-message">이 계정에 연결된 캐릭터가 없습니다.</p>
        </article>
      )}

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
