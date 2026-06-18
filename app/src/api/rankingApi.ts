import { supabase } from "../lib/supabase";
import { toKoreanAuthMessage } from "../shared/authMessages";
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
  if (!supabase) {
    return { ok: false, rankings: [], message: "Supabase 설정을 확인해주세요." };
  }

  const { data, error } = await supabase.rpc("get_character_rankings", { limit_count: limitCount });

  if (error) {
    return {
      ok: false,
      rankings: [],
      message: toKoreanAuthMessage(error.message, "랭킹을 불러오지 못했습니다."),
    };
  }

  return {
    ok: true,
    rankings: ((data ?? []) as RankingRow[]).map((row) => ({
      rank: row.rank,
      characterId: row.character_id,
      name: row.name,
      level: row.level,
      experience: row.experience,
    })),
    message: "",
  };
}
