import { supabase } from "../lib/supabase";
import { toKoreanAuthMessage } from "../shared/authMessages";
import { getCharacterNameValidationMessage } from "../shared/validation";
import type { Character } from "../types/character";

export type CharacterStatKey = "strength" | "agility" | "dexterity" | "vitality" | "endurance" | "intelligence" | "wisdom";
export type CharacterStatAllocation = Record<CharacterStatKey, number>;

type CharacterResult = {
  ok: boolean;
  character: Character | null;
  message: string;
};

type CharacterActionResult = {
  ok: boolean;
  message: string;
};

type CharacterNameAvailabilityResult = {
  ok: boolean;
  available: boolean;
  message: string;
};

export type TrainingRewardTier = "normal" | "good" | "great" | "max";

export type HuntLogEntry = {
  timeTenths: number;
  kind: "attack" | "critical" | "regeneration" | "defeat";
  amount: number;
  targetHp: number;
};

export type HuntResult = {
  ok: boolean;
  character: Character | null;
  gainedExperience: number;
  levelBefore: number;
  levelAfter: number;
  durationTicks: number;
  totalDamage: number;
  attackCount: number;
  criticalCount: number;
  totalRegeneration: number;
  logs: HuntLogEntry[];
  message: string;
};

type TrainingResult = {
  ok: boolean;
  character: Character | null;
  gainedExperience: number;
  rewardTier: TrainingRewardTier;
  levelBefore: number;
  levelAfter: number;
  message: string;
};

type TrainingPayload = {
  character?: Character;
  gained_experience?: number;
  reward_tier?: TrainingRewardTier;
  level_before?: number;
  level_after?: number;
};

type HuntPayload = {
  character?: Character;
  gained_experience?: number;
  level_before?: number;
  level_after?: number;
  duration_ticks?: number;
  total_damage?: number;
  attack_count?: number;
  critical_count?: number;
  total_regeneration?: number;
  logs?: Array<{
    time_tenths: number;
    kind: HuntLogEntry["kind"];
    amount: number;
    target_hp: number;
  }>;
};

const characterSelectFields = "id,user_id,name,level,experience,strength,agility,dexterity,vitality,endurance,intelligence,wisdom,stat_points,bonus_stat_points,hunt_available_at,created_at,updated_at";

export async function getMyCharacter(): Promise<CharacterResult> {
  if (!supabase) return { ok: false, character: null, message: "Supabase 설정을 확인해주세요." };

  const { data: userResult, error: userError } = await supabase.auth.getUser();

  if (userError || !userResult.user) {
    return {
      ok: false,
      character: null,
      message: userError ? toKoreanAuthMessage(userError.message) : "유저 정보를 찾을 수 없습니다.",
    };
  }

  const { data, error } = await supabase
    .from("characters")
    .select(characterSelectFields)
    .eq("user_id", userResult.user.id)
    .maybeSingle();

  if (error) {
    return { ok: false, character: null, message: toKoreanAuthMessage(error.message, "캐릭터를 불러오지 못했습니다.") };
  }

  return { ok: true, character: data, message: "" };
}

export async function createMyCharacter(name: string): Promise<CharacterResult> {
  if (!supabase) return { ok: false, character: null, message: "Supabase 설정을 확인해주세요." };

  const trimmedName = name.trim();
  const validationMessage = getCharacterNameValidationMessage(trimmedName);

  if (validationMessage) {
    return { ok: false, character: null, message: validationMessage };
  }

  const { data: userResult, error: userError } = await supabase.auth.getUser();

  if (userError || !userResult.user) {
    return {
      ok: false,
      character: null,
      message: userError ? toKoreanAuthMessage(userError.message) : "유저 정보를 찾을 수 없습니다.",
    };
  }

  const { data, error } = await supabase
    .from("characters")
    .insert({
      user_id: userResult.user.id,
      name: trimmedName,
    })
    .select(characterSelectFields)
    .single();

  if (error) {
    return { ok: false, character: null, message: toKoreanAuthMessage(error.message, "캐릭터를 생성하지 못했습니다.") };
  }

  return { ok: true, character: data, message: "" };
}

export async function allocateCharacterStats(allocation: CharacterStatAllocation): Promise<CharacterResult> {
  if (!supabase) return { ok: false, character: null, message: "Supabase 설정을 확인해주세요." };

  const { data, error } = await supabase.rpc("allocate_character_stats", {
    strength_delta: allocation.strength,
    agility_delta: allocation.agility,
    dexterity_delta: allocation.dexterity,
    vitality_delta: allocation.vitality,
    endurance_delta: allocation.endurance,
    intelligence_delta: allocation.intelligence,
    wisdom_delta: allocation.wisdom,
  });

  if (error) {
    return { ok: false, character: null, message: toKoreanAuthMessage(error.message, "스탯을 적용하지 못했습니다.") };
  }

  return { ok: true, character: data as Character, message: "스탯을 적용했습니다." };
}

export async function resetCharacterStats(): Promise<CharacterResult> {
  if (!supabase) return { ok: false, character: null, message: "Supabase 설정을 확인해주세요." };

  const { data, error } = await supabase.rpc("reset_character_stats");

  if (error) {
    return { ok: false, character: null, message: toKoreanAuthMessage(error.message, "스탯을 초기화하지 못했습니다.") };
  }

  return { ok: true, character: data as Character, message: "스탯을 초기화했습니다." };
}

export async function checkCharacterNameAvailability(name: string): Promise<CharacterNameAvailabilityResult> {
  if (!supabase) return { ok: false, available: false, message: "Supabase 설정을 확인해주세요." };

  const candidate = name.trim();
  const validationMessage = getCharacterNameValidationMessage(candidate);

  if (validationMessage) {
    return { ok: true, available: false, message: validationMessage };
  }

  const { data, error } = await supabase.rpc("is_character_name_available", { candidate });

  if (error) {
    return {
      ok: false,
      available: false,
      message: toKoreanAuthMessage(error.message, "캐릭터 이름 확인에 실패했습니다."),
    };
  }

  return {
    ok: true,
    available: Boolean(data),
    message: data ? "사용 가능한 캐릭터 이름입니다." : "이미 사용 중인 이름입니다.",
  };
}

export async function trainMyCharacter(): Promise<TrainingResult> {
  if (!supabase) {
    return {
      ok: false,
      character: null,
      gainedExperience: 0,
      rewardTier: "normal",
      levelBefore: 0,
      levelAfter: 0,
      message: "Supabase 설정을 확인해주세요.",
    };
  }

  const { data, error } = await supabase.rpc("train_my_character");

  if (error) {
    return {
      ok: false,
      character: null,
      gainedExperience: 0,
      rewardTier: "normal",
      levelBefore: 0,
      levelAfter: 0,
      message: toKoreanAuthMessage(error.message, "훈련을 완료하지 못했습니다."),
    };
  }

  const payload = data as TrainingPayload;

  return {
    ok: Boolean(payload.character),
    character: payload.character ?? null,
    gainedExperience: payload.gained_experience ?? 0,
    rewardTier: payload.reward_tier ?? "normal",
    levelBefore: payload.level_before ?? payload.character?.level ?? 0,
    levelAfter: payload.level_after ?? payload.character?.level ?? 0,
    message: "경험치를 획득했습니다.",
  };
}

export async function huntTrainingDummy(): Promise<HuntResult> {
  const emptyResult: HuntResult = {
    ok: false,
    character: null,
    gainedExperience: 0,
    levelBefore: 0,
    levelAfter: 0,
    durationTicks: 0,
    totalDamage: 0,
    attackCount: 0,
    criticalCount: 0,
    totalRegeneration: 0,
    logs: [],
    message: "사냥을 완료하지 못했습니다.",
  };

  if (!supabase) return { ...emptyResult, message: "Supabase 설정을 확인해주세요." };

  const { data, error } = await supabase.rpc("hunt_training_dummy");

  if (error) {
    return { ...emptyResult, message: toKoreanAuthMessage(error.message, "사냥을 완료하지 못했습니다.") };
  }

  const payload = data as HuntPayload;

  return {
    ok: Boolean(payload.character),
    character: payload.character ?? null,
    gainedExperience: payload.gained_experience ?? 0,
    levelBefore: payload.level_before ?? payload.character?.level ?? 0,
    levelAfter: payload.level_after ?? payload.character?.level ?? 0,
    durationTicks: payload.duration_ticks ?? 0,
    totalDamage: payload.total_damage ?? 0,
    attackCount: payload.attack_count ?? 0,
    criticalCount: payload.critical_count ?? 0,
    totalRegeneration: payload.total_regeneration ?? 0,
    logs: (payload.logs ?? []).map((log) => ({
      timeTenths: log.time_tenths,
      kind: log.kind,
      amount: log.amount,
      targetHp: log.target_hp,
    })),
    message: "허수아비를 격파했습니다.",
  };
}

export async function deleteMyCharacter(characterId: string): Promise<CharacterActionResult> {
  if (!supabase) return { ok: false, message: "Supabase 설정을 확인해주세요." };

  const { error } = await supabase
    .from("characters")
    .delete()
    .eq("id", characterId);

  if (error) {
    return { ok: false, message: toKoreanAuthMessage(error.message, "캐릭터를 삭제하지 못했습니다.") };
  }

  return { ok: true, message: "캐릭터를 삭제했습니다." };
}
