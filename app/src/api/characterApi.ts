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

export type TrainingState = {
  charges: number;
  maxCharges: number;
  nextRechargeAt: string | null;
};

export type HuntLogEntry = {
  timeTenths: number;
  kind: "encounter" | "attack" | "critical" | "miss" | "regeneration" | "player_regeneration" | "defeat" | "fled" | "timeout" | "enemy_attack" | "enemy_critical" | "enemy_miss" | "player_defeat" | "reflect" | "essence_cast" | "essence_damage" | "essence_dot" | "essence_heal" | "essence_shield" | "shield_absorb" | "weapon_fixed_damage" | "essence_extra_hit" | "essence_reflect" | "essence_status";
  amount: number;
  targetHp: number;
  target?: "enemy" | "player";
  source?: "player" | "enemy";
  name?: string;
  effect?: string;
  grade?: number;
  shieldRemaining?: number;
  shieldAbsorbed?: number;
  sequence?: number;
  parentSequence?: number;
};

export type HuntCombatant = {
  name: string;
  level: number;
  maxHp: number;
  experience?: number;
  info?: MonsterInfo;
  essence?: { code: string; name: string; grade: number };
};

export type HuntRewardEquipment = {
  kind: "weapon" | "armor";
  id: string;
  type: string;
  variant?: string;
  level: number;
};

export type HuntRewardEssence = {
  id: string;
  code: string;
  name: string;
  grade: number;
  quantity: number;
};

export type HuntRewards = {
  credits: number;
  equipment: HuntRewardEquipment | null;
  essence: HuntRewardEssence | null;
};

export type HuntBattle = {
  huntGroundId: string;
  status: "encountered" | "in_progress" | "victory" | "fled" | "timed_out" | "defeated";
  startedAt: string;
  endsAt?: string;
  player: HuntCombatant & { startHp?: number; currentHp?: number };
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
  gainedCredits?: number;
  rewards?: HuntRewards;
  logs: HuntLogEntry[];
};

export type HuntGround = {
  id: string;
  name: string;
  recommendedMinLevel: number;
  recommendedMaxLevel: number;
};

export type HuntState = {
  availableAt: string | null;
  lastBattle: HuntBattle | null;
  selectedHuntGroundId: string;
  playerCurrentHp: number | null;
  playerMaxHp: number | null;
  playerRecoveryStartHp: number | null;
  playerRecoveryStartedAt: string | null;
  recoveryEndsAt: string | null;
  isDefeatRecovery: boolean;
  autoHuntEnabled: boolean;
  autoHuntRemaining: number;
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
  trainingState: TrainingState | null;
  message: string;
};

type TrainingPayload = {
  character?: Character;
  gained_experience?: number;
  reward_tier?: TrainingRewardTier;
  level_before?: number;
  level_after?: number;
  training_state?: TrainingStatePayload;
};

type TrainingStatePayload = {
  charges?: number;
  max_charges?: number;
  next_recharge_at?: string | null;
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
  player?: { name?: string; level?: number; max_hp?: number; experience?: number; start_hp?: number; current_hp?: number };
  enemy?: { name?: string; level?: number; max_hp?: number; combat_stats?: MonsterInfoPayload; essence?: { code?: string; name?: string; grade?: number } };
  gained_experience?: number;
  gained_credits?: number;
  rewards?: HuntRewardsPayload;
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
    target?: HuntLogEntry["target"];
    source?: HuntLogEntry["source"];
    name?: string;
    effect?: string;
    grade?: number;
    shield_remaining?: number;
    shield_absorbed?: number;
    sequence?: number;
    parent_sequence?: number;
  }>;
};

type HuntStatePayload = {
  available_at?: string | null;
  last_battle?: HuntBattlePayload | null;
  selected_hunt_ground_id?: string;
  player_current_hp?: number | null;
  player_max_hp?: number | null;
  player_recovery_start_hp?: number | null;
  player_recovery_started_at?: string | null;
  recovery_ends_at?: string | null;
  is_defeat_recovery?: boolean;
  auto_hunt_enabled?: boolean;
  auto_hunt_remaining?: number;
};

type MonsterInfoPayload = {
  physical_attack?: number; magic_attack?: number; physical_defense?: number; magic_defense?: number; max_hp?: number;
  regeneration?: number; attacks_per_second?: number; cooldown_reduction?: number; accuracy?: number; evasion_rate?: number;
  critical_chance?: number; critical_damage?: number;
};

type HuntRewardsPayload = {
  credits?: number;
  equipment?: {
    kind?: "weapon" | "armor";
    id?: string;
    type?: string;
    variant?: string;
    level?: number;
  } | null;
  essence?: {
    id?: string;
    code?: string;
    name?: string;
    grade?: number;
    quantity?: number;
  } | null;
};

const characterSelectFields = "id,user_id,name,level,experience,credits,strength,agility,dexterity,vitality,endurance,intelligence,wisdom,stat_points,bonus_stat_points,hunt_available_at,created_at,updated_at";

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
      trainingState: null,
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
      trainingState: null,
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
    trainingState: mapTrainingState(payload.training_state),
    message: "경험치를 획득했습니다.",
  };
}

export async function getMyTrainingState(): Promise<{ ok: boolean; state: TrainingState | null; message: string }> {
  if (!supabase) return { ok: false, state: null, message: "Supabase 설정을 확인해주세요." };

  const { data, error } = await supabase.rpc("get_my_training_state");
  if (error) return { ok: false, state: null, message: toKoreanAuthMessage(error.message, "훈련 상태를 불러오지 못했습니다.") };

  return { ok: true, state: mapTrainingState(data as TrainingStatePayload), message: "" };
}

function mapTrainingState(payload: TrainingStatePayload | undefined): TrainingState {
  return {
    charges: payload?.charges ?? 0,
    maxCharges: payload?.max_charges ?? 10,
    nextRechargeAt: payload?.next_recharge_at ?? null,
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
    message: "전투를 시작했습니다.",
  };
}

export async function encounterHuntMonster(): Promise<HuntResult> {
  const emptyResult: HuntResult = {
    ok: false, character: null, huntState: null, huntGroundId: "training-dummy", status: "encountered", startedAt: new Date(0).toISOString(),
    player: { name: "", level: 0, maxHp: 0 }, enemy: { name: "", level: 0, maxHp: 0 }, gainedExperience: 0,
    levelBefore: 0, levelAfter: 0, experienceAfter: 0, durationTicks: 0, totalDamage: 0,
    attackCount: 0, criticalCount: 0, totalRegeneration: 0, logs: [], message: "몬스터를 찾지 못했습니다.",
  };
  if (!supabase) return { ...emptyResult, message: "Supabase 설정을 확인해주세요." };

  const { data, error } = await supabase.rpc("encounter_hunt_monster");
  if (error) return { ...emptyResult, message: toKoreanAuthMessage(error.message, "몬스터를 찾지 못했습니다.") };

  const payload = data as HuntPayload;
  const huntState = mapHuntState(payload.hunt_state);
  const battle = huntState.lastBattle;
  if (!battle) return { ...emptyResult, huntState, message: "조우 정보를 불러오지 못했습니다." };

  return { ok: true, character: payload.character ?? null, huntState, ...battle, message: "몬스터와 조우했습니다." };
}

export async function settleTrainingDummyHunt(): Promise<HuntResult> {
  const result = await resolveHuntAction("settle_training_dummy_hunt", "전투를 정산하지 못했습니다.", "전투를 완료했습니다.");
  if (!result.ok || result.status !== "timed_out") return result;
  return { ...result, message: "시간 제한에 도달해 전투를 종료했습니다." };
}

export async function fleeTrainingDummyHunt(): Promise<HuntResult> {
  return resolveHuntAction("flee_training_dummy_hunt", "도망치지 못했습니다.", "전투에서 도망쳤습니다.");
}

export async function fleeHuntEncounter(): Promise<{ ok: boolean; state: HuntState | null; message: string }> {
  if (!supabase) return { ok: false, state: null, message: "Supabase 설정을 확인해주세요." };

  const { data, error } = await supabase.rpc("flee_hunt_encounter");
  if (error) return { ok: false, state: null, message: toKoreanAuthMessage(error.message, "조우에서 벗어나지 못했습니다.") };

  const payload = data as HuntPayload;
  return { ok: true, state: mapHuntState(payload.hunt_state), message: "조우에서 벗어났습니다." };
}

export async function getMyHuntState(): Promise<{ ok: boolean; state: HuntState | null; message: string }> {
  if (!supabase) return { ok: false, state: null, message: "Supabase 설정을 확인해주세요." };

  const { data, error } = await supabase.rpc("get_my_hunt_state");
  if (error) return { ok: false, state: null, message: toKoreanAuthMessage(error.message, "사냥 기록을 불러오지 못했습니다.") };

  return { ok: true, state: mapHuntState(data as HuntStatePayload), message: "" };
}

export async function configureAutoHunt(enabled: boolean): Promise<{ ok: boolean; state: HuntState | null; message: string }> {
  if (!supabase) return { ok: false, state: null, message: "Supabase 설정을 확인해주세요." };
  const { data, error } = await supabase.rpc("configure_auto_hunt", { enabled });
  if (error) return { ok: false, state: null, message: toKoreanAuthMessage(error.message, "자동사냥을 변경하지 못했습니다.") };
  return { ok: true, state: mapHuntState(data as HuntStatePayload), message: "" };
}

export async function selectHuntGround(huntGroundId: string): Promise<{ ok: boolean; state: HuntState | null; message: string }> {
  if (!supabase) return { ok: false, state: null, message: "Supabase 설정을 확인해주세요." };
  const { data, error } = await supabase.rpc("select_hunt_ground", { target_hunt_ground_id: huntGroundId });
  if (error) return { ok: false, state: null, message: toKoreanAuthMessage(error.message, "사냥터를 변경하지 못했습니다.") };
  return { ok: true, state: mapHuntState(data as HuntStatePayload), message: "" };
}

export async function getHuntGrounds(): Promise<{ ok: boolean; grounds: HuntGround[]; message: string }> {
  if (!supabase) return { ok: false, grounds: [], message: "Supabase 설정을 확인해주세요." };

  const { data, error } = await supabase.rpc("get_hunt_grounds");
  if (error) return { ok: false, grounds: [], message: toKoreanAuthMessage(error.message, "사냥터를 불러오지 못했습니다.") };

  const grounds = Array.isArray(data) ? data : [];
  return {
    ok: true,
    grounds: grounds.map((ground) => ({
      id: String(ground.id ?? "training-dummy"),
      name: String(ground.name ?? "사냥터"),
      recommendedMinLevel: Number(ground.recommended_min_level ?? 1),
      recommendedMaxLevel: Number(ground.recommended_max_level ?? 100),
    })),
    message: "",
  };
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
    selectedHuntGroundId: payload?.selected_hunt_ground_id ?? "training-dummy",
    playerCurrentHp: payload?.player_current_hp ?? null,
    playerMaxHp: payload?.player_max_hp ?? null,
    playerRecoveryStartHp: payload?.player_recovery_start_hp ?? null,
    playerRecoveryStartedAt: payload?.player_recovery_started_at ?? null,
    recoveryEndsAt: payload?.recovery_ends_at ?? null,
    isDefeatRecovery: payload?.is_defeat_recovery ?? false,
    autoHuntEnabled: payload?.auto_hunt_enabled ?? false,
    autoHuntRemaining: payload?.auto_hunt_remaining ?? 0,
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
      startHp: payload.player?.start_hp,
      currentHp: payload.player?.current_hp,
    },
    enemy: {
      name: payload.enemy?.name ?? "허수아비", level: payload.enemy?.level ?? 0, maxHp: payload.enemy?.max_hp ?? 0,
      info: payload.enemy?.combat_stats ? mapMonsterInfo(payload.enemy.combat_stats) : undefined,
      essence: payload.enemy?.essence?.code && payload.enemy.essence.name
        ? { code: payload.enemy.essence.code, name: payload.enemy.essence.name, grade: payload.enemy.essence.grade ?? 1 }
        : undefined,
    },
    gainedExperience: payload.gained_experience ?? 0,
    levelBefore: payload.level_before ?? 0,
    levelAfter: payload.level_after ?? 0,
    experienceAfter: payload.experience_after ?? 0,
    durationTicks: payload.duration_ticks ?? 0,
    totalDamage: payload.total_damage ?? 0,
    attackCount: payload.attack_count ?? 0,
    criticalCount: payload.critical_count ?? 0,
    totalRegeneration: payload.total_regeneration ?? 0,
    gainedCredits: payload.gained_credits,
    rewards: mapHuntRewards(payload.rewards),
    logs: (payload.logs ?? []).map((log) => ({
      timeTenths: log.time_tenths,
      kind: log.kind,
      amount: log.amount,
      targetHp: log.target_hp,
      target: log.target,
      source: log.source,
      name: log.name,
      effect: log.effect,
      grade: log.grade,
      shieldRemaining: log.shield_remaining,
      shieldAbsorbed: log.shield_absorbed,
      sequence: log.sequence,
      parentSequence: log.parent_sequence,
    })),
  };
}

function mapHuntRewards(payload: HuntRewardsPayload | undefined): HuntRewards | undefined {
  if (!payload) return undefined;
  return {
    credits: payload.credits ?? 0,
    equipment: payload.equipment?.kind && payload.equipment.id && payload.equipment.type ? {
      kind: payload.equipment.kind,
      id: payload.equipment.id,
      type: payload.equipment.type,
      variant: payload.equipment.variant,
      level: payload.equipment.level ?? 1,
    } : null,
    essence: payload.essence?.id && payload.essence.code && payload.essence.name ? {
      id: payload.essence.id,
      code: payload.essence.code,
      name: payload.essence.name,
      grade: payload.essence.grade ?? 1,
      quantity: payload.essence.quantity ?? 1,
    } : null,
  };
}

function mapMonsterInfo(payload: MonsterInfoPayload): MonsterInfo {
  return {
    name: "", level: 0, physicalAttack: payload.physical_attack ?? 0, magicAttack: payload.magic_attack ?? 0,
    physicalDefense: payload.physical_defense ?? 0, magicDefense: payload.magic_defense ?? 0, maxHp: payload.max_hp ?? 0,
    regeneration: payload.regeneration ?? 0, attacksPerSecond: payload.attacks_per_second ?? 0,
    cooldownReduction: payload.cooldown_reduction ?? 0, accuracy: payload.accuracy ?? 0,
    evasionRate: payload.evasion_rate ?? 0, criticalChance: payload.critical_chance ?? 0, criticalDamage: payload.critical_damage ?? 0,
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
