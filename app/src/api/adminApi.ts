import { supabase } from "../lib/supabase";
import { toKoreanAuthMessage } from "../shared/authMessages";

export type AdminAccessResult =
  | { ok: true; isAdmin: boolean }
  | { ok: false; isAdmin: false; message: string };

export type AdminOverview = {
  users_total: number;
  profiles_total: number;
  characters_total: number;
  admins_total: number;
  published_patch_notes: number;
  draft_patch_notes: number;
  active_hunts: number;
  highest_character: {
    id?: string;
    user_id?: string;
    name?: string;
    level?: number;
    experience?: number;
    nickname?: string | null;
  };
  recent_characters: Array<{
    id: string;
    user_id: string;
    name: string;
    level: number;
    nickname: string | null;
    created_at: string;
  }>;
};

export type AdminPlayerSearchRow = {
  user_id: string;
  email: string | null;
  nickname: string | null;
  character_id: string | null;
  character_name: string | null;
  level: number | null;
  experience: number | null;
  credits: number | null;
  created_at: string;
  character_updated_at: string | null;
};

export type AdminPlayerDetail = {
  user: { id: string; email: string | null; created_at: string; last_sign_in_at: string | null };
  profile: { nickname: string; created_at: string; updated_at: string } | null;
  character: {
    id: string;
    name: string;
    level: number;
    experience: number;
    credits: number;
    stat_points: number;
    hunt_available_at: string | null;
    created_at: string;
    updated_at: string;
  } | null;
  hunt_state: {
    selected_hunt_ground_id: string;
    available_at: string | null;
    last_battle_status: string | null;
    updated_at: string;
  } | null;
  inventory: { weapons: number; armors: number; essences: number };
};

export type AdminBalanceCatalog = {
  hunt_grounds: Array<{
    id: string;
    name: string;
    recommended_min_level: number;
    recommended_max_level: number;
    sort_order: number;
    is_enabled: boolean;
  }>;
  monsters: Array<{
    id: string;
    code: string;
    name: string;
    base_level: number;
    stat_points_per_level: number;
    experience_multiplier: number;
    basic_attack_enabled: boolean;
  }>;
  essences: Array<{
    id: string;
    code: string;
    name: string;
    monster_code: string | null;
    monster_name: string | null;
  }>;
};

export type AdminContentStatus = {
  patch_notes: Array<{
    id: string;
    version: string;
    title: string;
    release_date: string;
    is_published: boolean;
    updated_at: string;
  }>;
};

export type AdminAuditLog = {
  id: string;
  actor_user_id: string | null;
  actor_email: string | null;
  action: string;
  target_type: string;
  target_id: string | null;
  reason: string | null;
  created_at: string;
};

type AdminDataResult<TData> =
  | { ok: true; data: TData; message: "" }
  | { ok: false; data: null; message: string };

export async function checkMyAdminAccess(): Promise<AdminAccessResult> {
  if (!supabase) {
    return { ok: false, isAdmin: false, message: "Supabase 설정을 확인해주세요." };
  }

  const { data, error } = await supabase.rpc("is_admin");

  if (error) {
    return {
      ok: false,
      isAdmin: false,
      message: toKoreanAuthMessage(error.message, "어드민 권한을 확인하지 못했습니다."),
    };
  }

  return { ok: true, isAdmin: Boolean(data) };
}

export async function loadAdminOverview(): Promise<AdminDataResult<AdminOverview>> {
  return callAdminRpc<AdminOverview>("admin_get_overview", "어드민 대시보드를 불러오지 못했습니다.");
}

export async function searchAdminPlayers(searchText: string): Promise<AdminDataResult<AdminPlayerSearchRow[]>> {
  return callAdminRpc<AdminPlayerSearchRow[]>("admin_search_players", "플레이어를 검색하지 못했습니다.", {
    search_text: searchText,
    limit_count: 25,
  });
}

export async function loadAdminPlayerDetail(userId: string): Promise<AdminDataResult<AdminPlayerDetail>> {
  return callAdminRpc<AdminPlayerDetail>("admin_get_player_detail", "플레이어 정보를 불러오지 못했습니다.", {
    target_user_id: userId,
  });
}

export async function resetAdminPlayerHuntState(characterId: string, reason: string): Promise<AdminDataResult<unknown>> {
  return callAdminRpc<unknown>("admin_reset_player_hunt_state", "사냥 상태를 초기화하지 못했습니다.", {
    target_character_id: characterId,
    reason,
  });
}

export async function grantAdminCharacterCredits(characterId: string, amount: number, reason: string): Promise<AdminDataResult<unknown>> {
  return callAdminRpc<unknown>("admin_grant_character_credits", "크레딧을 지급하지 못했습니다.", {
    target_character_id: characterId,
    credit_amount: amount,
    reason,
  });
}

export async function grantAdminCharacterExperience(characterId: string, amount: number, reason: string): Promise<AdminDataResult<unknown>> {
  return callAdminRpc<unknown>("admin_grant_character_experience", "경험치를 지급하지 못했습니다.", {
    target_character_id: characterId,
    experience_amount: amount,
    reason,
  });
}

export async function loadAdminBalanceCatalog(): Promise<AdminDataResult<AdminBalanceCatalog>> {
  return callAdminRpc<AdminBalanceCatalog>("admin_get_balance_catalog", "밸런스 데이터를 불러오지 못했습니다.");
}

export async function loadAdminContentStatus(): Promise<AdminDataResult<AdminContentStatus>> {
  return callAdminRpc<AdminContentStatus>("admin_get_content_status", "콘텐츠 데이터를 불러오지 못했습니다.");
}

export async function loadAdminAuditLogs(): Promise<AdminDataResult<AdminAuditLog[]>> {
  return callAdminRpc<AdminAuditLog[]>("admin_get_audit_logs", "감사 로그를 불러오지 못했습니다.", {
    limit_count: 50,
  });
}

async function callAdminRpc<TData>(
  rpcName: string,
  fallbackMessage: string,
  params?: Record<string, unknown>,
): Promise<AdminDataResult<TData>> {
  if (!supabase) {
    return { ok: false, data: null, message: "Supabase 설정을 확인해주세요." };
  }

  const { data, error } = params === undefined
    ? await supabase.rpc(rpcName)
    : await supabase.rpc(rpcName, params);

  if (error) {
    return {
      ok: false,
      data: null,
      message: toKoreanAuthMessage(error.message, fallbackMessage),
    };
  }

  return { ok: true, data: data as TData, message: "" };
}
