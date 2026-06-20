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
  kind: "encounter" | "attack" | "critical" | "regeneration" | "defeat" | "fled";
  amount: number;
  targetHp: number;
};

export type HuntCombatant = {
  name: string;
  level: number;
  maxHp: number;
  experience?: number;
};

export type HuntBattle = {
  huntGroundId: string;
  status: "in_progress" | "victory" | "fled";
  startedAt: string;
  endsAt?: string;
  player: HuntCombatant;
  enemy: HuntCombatant;
  gainedExperience: number;
  levelBefore: number;
  levelAfter: number;
  experienceAfter: number;
  durationTicks: number;
  totalDamage: number;
  attackCount: number;
  criticalCount: number;
  totalRegeneration: number;
  logs: HuntLogEntry[];
};

export type HuntState = {
  availableAt: string | null;
  lastBattle: HuntBattle | null;
};

export type MonsterInfo = {
  name: string;
  level: number;
  physicalAttack: number;
  magicAttack: number;
  physicalDefense: number;
  magicDefense: number;
  maxHp: number;
  regeneration: number;
  attacksPerSecond: number;
  cooldownReduction: number;
  accuracy: number;
  evasionRate: number;
  criticalChance: number;
  criticalDamage: number;
};

export type HuntResult = HuntBattle & {
  ok: boolean;
  character: Character | null;
  huntState: HuntState | null;
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
  hunt_state?: HuntStatePayload;
};

type HuntBattlePayload = {
  hunt_ground_id?: string;
  status?: HuntBattle["status"];
  started_at?: string;
  ends_at?: string;
  player?: { name?: string; level?: number; max_hp?: number; experience?: number };
  enemy?: { name?: string; level?: number; max_hp?: number };
  gained_experience?: number;
  level_before?: number;
  level_after?: number;
  experience_after?: number;
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

type HuntStatePayload = {
  available_at?: string | null;
  last_battle?: HuntBattlePayload | null;
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
    huntState: null,
    huntGroundId: "training-dummy",
    status: "in_progress",
    startedAt: new Date(0).toISOString(),
    player: { name: "", level: 0, maxHp: 0 },
    enemy: { name: "", level: 0, maxHp: 0 },
    gainedExperience: 0,
    levelBefore: 0,
    levelAfter: 0,
    experienceAfter: 0,
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
  const huntState = mapHuntState(payload.hunt_state);
  const battle = huntState.lastBattle;

  if (!battle) {
    return { ...emptyResult, huntState, message: "사냥 결과를 불러오지 못했습니다." };
  }

  return {
    ok: true,
    character: payload.character ?? null,
    huntState,
    ...battle,
    message: "허수아비를 격파했습니다.",
  };
}

export async function settleTrainingDummyHunt(): Promise<HuntResult> {
  return resolveHuntAction("settle_training_dummy_hunt", "전투를 정산하지 못했습니다.", "허수아비를 격파했습니다.");
}

export async function fleeTrainingDummyHunt(): Promise<HuntResult> {
  return resolveHuntAction("flee_training_dummy_hunt", "도망치지 못했습니다.", "전투에서 도망쳤습니다.");
}

export async function getMyHuntState(): Promise<{ ok: boolean; state: HuntState | null; message: string }> {
  if (!supabase) return { ok: false, state: null, message: "Supabase 설정을 확인해주세요." };

  const { data, error } = await supabase.rpc("get_my_hunt_state");
  if (error) return { ok: false, state: null, message: toKoreanAuthMessage(error.message, "사냥 기록을 불러오지 못했습니다.") };

  return { ok: true, state: mapHuntState(data as HuntStatePayload), message: "" };
}

export async function getTrainingDummyInfo(): Promise<{ ok: boolean; info: MonsterInfo | null; message: string }> {
  if (!supabase) return { ok: false, info: null, message: "Supabase 설정을 확인해주세요." };

  const { data, error } = await supabase.rpc("get_training_dummy_info");
  if (error) return { ok: false, info: null, message: toKoreanAuthMessage(error.message, "몬스터 정보를 불러오지 못했습니다.") };

  const payload = data as {
    name?: string; level?: number; physical_attack?: number; magic_attack?: number; physical_defense?: number;
    magic_defense?: number; max_hp?: number; regeneration?: number; attacks_per_second?: number;
    cooldown_reduction?: number; accuracy?: number; evasion_rate?: number; critical_chance?: number; critical_damage?: number;
  };
  return {
    ok: true,
    info: {
      name: payload.name ?? "허수아비",
      level: payload.level ?? 0,
      physicalAttack: payload.physical_attack ?? 0,
      magicAttack: payload.magic_attack ?? 0,
      physicalDefense: payload.physical_defense ?? 0,
      magicDefense: payload.magic_defense ?? 0,
      maxHp: payload.max_hp ?? 0,
      regeneration: payload.regeneration ?? 0,
      attacksPerSecond: payload.attacks_per_second ?? 0,
      cooldownReduction: payload.cooldown_reduction ?? 0,
      accuracy: payload.accuracy ?? 0,
      evasionRate: payload.evasion_rate ?? 0,
      criticalChance: payload.critical_chance ?? 0,
      criticalDamage: payload.critical_damage ?? 0,
    },
    message: "",
  };
}

function mapHuntState(payload: HuntStatePayload | undefined): HuntState {
  return {
    availableAt: payload?.available_at ?? null,
    lastBattle: payload?.last_battle ? mapHuntBattle(payload.last_battle) : null,
  };
}

function mapHuntBattle(payload: HuntBattlePayload): HuntBattle {
  return {
    huntGroundId: payload.hunt_ground_id ?? "training-dummy",
    status: payload.status ?? "victory",
    startedAt: payload.started_at ?? new Date(0).toISOString(),
    endsAt: payload.ends_at,
    player: {
      name: payload.player?.name ?? "",
      level: payload.player?.level ?? 0,
      maxHp: payload.player?.max_hp ?? 0,
      experience: payload.player?.experience ?? 0,
    },
    enemy: { name: payload.enemy?.name ?? "허수아비", level: payload.enemy?.level ?? 0, maxHp: payload.enemy?.max_hp ?? 0 },
    gainedExperience: payload.gained_experience ?? 0,
    levelBefore: payload.level_before ?? 0,
    levelAfter: payload.level_after ?? 0,
    experienceAfter: payload.experience_after ?? 0,
    durationTicks: payload.duration_ticks ?? 0,
    totalDamage: payload.total_damage ?? 0,
    attackCount: payload.attack_count ?? 0,
    criticalCount: payload.critical_count ?? 0,
    totalRegeneration: payload.total_regeneration ?? 0,
    logs: (payload.logs ?? []).map((log) => ({ timeTenths: log.time_tenths, kind: log.kind, amount: log.amount, targetHp: log.target_hp })),
  };
}

async function resolveHuntAction(rpc: "settle_training_dummy_hunt" | "flee_training_dummy_hunt", fallbackMessage: string, successMessage: string): Promise<HuntResult> {
  const emptyResult: HuntResult = {
    ok: false, character: null, huntState: null, huntGroundId: "training-dummy", status: "in_progress", startedAt: new Date(0).toISOString(),
    player: { name: "", level: 0, maxHp: 0 }, enemy: { name: "", level: 0, maxHp: 0 }, gainedExperience: 0,
    levelBefore: 0, levelAfter: 0, experienceAfter: 0, durationTicks: 0, totalDamage: 0,
    attackCount: 0, criticalCount: 0, totalRegeneration: 0, logs: [], message: fallbackMessage,
  };
  if (!supabase) return { ...emptyResult, message: "Supabase 설정을 확인해주세요." };

  const { data, error } = await supabase.rpc(rpc);
  if (error) return { ...emptyResult, message: toKoreanAuthMessage(error.message, fallbackMessage) };

  const payload = data as HuntPayload;
  const huntState = mapHuntState(payload.hunt_state);
  const battle = huntState.lastBattle;
  if (!battle) return { ...emptyResult, huntState, message: fallbackMessage };

  return { ok: true, character: payload.character ?? null, huntState, ...battle, message: successMessage };
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
