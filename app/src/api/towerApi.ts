import { mapHuntBattle } from "./characterApi";
import type { HuntBattle, HuntBattlePayload } from "./characterApi";
import { supabase } from "../lib/supabase";
import { toKoreanAuthMessage } from "../shared/authMessages";

export type TowerState = {
  highestClearedFloor: number;
  supportedFloor: number;
  lastBattle: HuntBattle | null;
};

type TowerStatePayload = {
  highest_cleared_floor?: number;
  supported_floor?: number;
  last_battle?: HuntBattlePayload | null;
};

type TowerStateResult = {
  ok: boolean;
  state: TowerState | null;
  message: string;
};

export function getMyTowerState() {
  return runTowerAction("get_my_tower_state", "탑 정보를 불러오지 못했습니다.");
}

export function challengeTowerFloorOne() {
  return runTowerAction("challenge_tower_floor_one", "탑 1층 도전을 시작하지 못했습니다.");
}

export function settleTowerFloorOne() {
  return runTowerAction("settle_tower_floor_one", "탑 1층 전투를 정산하지 못했습니다.");
}

async function runTowerAction(
  rpc: "get_my_tower_state" | "challenge_tower_floor_one" | "settle_tower_floor_one",
  fallbackMessage: string,
): Promise<TowerStateResult> {
  if (!supabase) return { ok: false, state: null, message: "Supabase 설정을 확인해주세요." };

  const { data, error } = await supabase.rpc(rpc);
  if (error) {
    return { ok: false, state: null, message: toKoreanAuthMessage(error.message, fallbackMessage) };
  }

  const payload = data as TowerStatePayload;
  return {
    ok: true,
    state: {
      highestClearedFloor: payload.highest_cleared_floor ?? 0,
      supportedFloor: payload.supported_floor ?? 1,
      lastBattle: payload.last_battle ? mapHuntBattle(payload.last_battle) : null,
    },
    message: "",
  };
}
