import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { loadCharacterRankings } from "../../api/rankingApi";
import { formatCharacterExperience, formatCharacterLevel } from "../../shared/progression";
import { useDocumentTitle } from "../../shared/useDocumentTitle";
import type { CharacterRanking } from "../../types/ranking";

type RankingState =
  | { status: "loading"; rankings: CharacterRanking[]; message: string }
  | { status: "ready"; rankings: CharacterRanking[]; message: string }
  | { status: "error"; rankings: CharacterRanking[]; message: string };

export function RankingSummary() {
  const { status, rankings, message } = useRankings(3);

  return (
    <article className="panel ranking-panel">
      <div className="panel-head compact action-head">
        <div>
          <span>RANKING</span>
          <h2>랭킹</h2>
        </div>
        <Link className="text-button" to="/ranking">
          전체 보기
        </Link>
      </div>

      {status !== "ready" ? (
        <p className={`panel-message ${status === "error" ? "is-error" : ""}`}>{message}</p>
      ) : (
        <RankingList rankings={rankings} compact />
      )}
    </article>
  );
}

export function RankingScreen() {
  useDocumentTitle("TOWER://RANKING");

  const { status, rankings, message } = useRankings(50);

  return (
    <section className="archive-view">
      <div className="archive-head">
        <div>
          <span className="eyebrow">RANKING</span>
          <h1>랭킹</h1>
        </div>
      </div>

      {status !== "ready" ? (
        <p className={`panel-message ${status === "error" ? "is-error" : ""}`}>{message}</p>
      ) : (
        <RankingList rankings={rankings} />
      )}
    </section>
  );
}

function RankingList({ rankings, compact = false }: { rankings: CharacterRanking[]; compact?: boolean }) {
  if (rankings.length === 0) {
    return <p className="panel-message">랭킹 데이터가 없습니다.</p>;
  }

  return (
    <ol className={`ranking-list ${compact ? "is-compact" : ""}`}>
      {rankings.map((ranking) => (
        <li className="ranking-row" key={ranking.characterId}>
          <strong>#{ranking.rank}</strong>
          <span>{ranking.name}</span>
          <em>{formatCharacterLevel(ranking.level)}</em>
          {!compact && <small>{formatCharacterExperience(ranking.level, ranking.experience)}</small>}
        </li>
      ))}
    </ol>
  );
}

function useRankings(limitCount: number): RankingState {
  const [state, setState] = useState<RankingState>({
    status: "loading",
    rankings: [],
    message: "랭킹을 불러오는 중...",
  });

  useEffect(() => {
    let isActive = true;

    loadCharacterRankings(limitCount).then((result) => {
      if (!isActive) return;

      if (!result.ok) {
        setState({ status: "error", rankings: [], message: result.message });
        return;
      }

      setState({ status: "ready", rankings: result.rankings, message: "" });
    });

    return () => {
      isActive = false;
    };
  }, [limitCount]);

  return state;
}
