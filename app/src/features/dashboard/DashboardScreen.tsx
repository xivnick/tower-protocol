import type { ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { Link } from "react-router-dom";
import type { HuntState } from "../../api/characterApi";
import type { Profile } from "../../api/profileApi";
import { useDocumentTitle } from "../../shared/useDocumentTitle";
import type { Character } from "../../types/character";
import { PatchNotesSummary } from "../patchNotes/PatchNotes";
import { RankingSummary } from "../ranking/Ranking";

export function DashboardScreen({
  session,
  profile,
  character,
  huntState,
}: {
  session: Session | null;
  profile: Profile | null;
  character: Character | null;
  huntState: HuntState | null;
}) {
  useDocumentTitle("TOWER://DASHBOARD");

  const nickname = profile?.nickname ?? "UNKNOWN";
  const email = session?.user?.email ?? "-";

  return (
    <section className="content-grid">
      {!character && (
        <article className="panel">
          <div className="panel-head">
            <span>CHARACTER</span>
            <h2>캐릭터 생성 안내</h2>
          </div>
          <div className="panel-action-body">
            <p className="panel-message">이 계정에 연결된 캐릭터가 없습니다.</p>
            <Link className="btn primary panel-primary-action" to="/character">
              캐릭터 생성
            </Link>
          </div>
        </article>
      )}

      <article className="panel">
        <div className="panel-head">
          <span>DASHBOARD</span>
          <h2>접속 상태</h2>
        </div>
          <div className="kv-grid">
            <Kv label="닉네임" value={nickname} />
            <Kv
              label="캐릭터"
            value={
              character ? (
                <Link className="character-link" to="/character" aria-label={`${character.name} 캐릭터 정보 보기`}>
                  <span>{`LV.${character.level} ${character.name}`}</span>
                  <svg aria-hidden="true" viewBox="0 0 16 16">
                    <path d="M6.5 3.5h6v6M12.5 3.5 7 9m3 3.5H3.5v-6" />
                  </svg>
                </Link>
              ) : (
                "없음"
              )
            }
            />
            <Kv label="계정" value={email} />
          </div>
      </article>

      {character && (
        <article className="panel">
          <div className="panel-head compact action-head">
            <div>
              <span>AUTO BATTLE</span>
              <h2>자동 전투 현황</h2>
            </div>
            <Link className="text-button" to="/hunt">바로가기</Link>
          </div>
          <div className="kv-grid">
            <Kv label="상태" value={getAutoHuntStatus(huntState)} />
            <Kv label="남은 횟수" value={`${huntState?.autoHuntRemaining ?? 0}회`} />
            <Kv label="상대" value={huntState?.autoHuntEnabled && huntState.lastBattle ? `LV.${huntState.lastBattle.enemy.level} ${huntState.lastBattle.enemy.name}` : "-"} />
          </div>
        </article>
      )}

      <RankingSummary />
      <PatchNotesSummary />
    </section>
  );
}

function getAutoHuntStatus(huntState: HuntState | null) {
  if (!huntState?.autoHuntEnabled) return "중지";
  if (huntState.lastBattle?.status === "in_progress") return "전투 중";
  if (huntState.lastBattle?.status === "encountered") return "조우 중";
  return "탐색 중";
}

function Kv({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="kv">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
