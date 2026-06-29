import { callRpc } from "./rpcClient";
import type { CharacterRanking } from "../types/ranking";

type RankingRow = {
  rank: number;
  character_id: string;
  name: string;
  level: number;
  experience: number;
};

type RankingResult = {
  ok: boolean;
  rankings: CharacterRanking[];
  message: string;
};

export async function loadCharacterRankings(limitCount = 50): Promise<RankingResult> {
  const result = await callRpc<RankingRow[]>("get_character_rankings", "랭킹을 불러오지 못했습니다.", { limit_count: limitCount });
  if (!result.ok) {
    return {
      ok: false,
      rankings: [],
      message: result.message,
    };
  }

  return {
    ok: true,
    rankings: (result.data ?? []).map((row) => ({
      rank: row.rank,
      characterId: row.character_id,
      name: row.name,
      level: row.level,
      experience: row.experience,
    })),
    message: "",
  };
}
