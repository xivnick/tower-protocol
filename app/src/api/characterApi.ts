import { supabase } from "../lib/supabase";
import { toKoreanAuthMessage } from "../shared/authMessages";
import { getCharacterNameValidationMessage } from "../shared/validation";
import type { Character } from "../types/character";

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
    .select("id,user_id,name,level,experience,created_at,updated_at")
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
    .select("id,user_id,name,level,experience,created_at,updated_at")
    .single();

  if (error) {
    return { ok: false, character: null, message: toKoreanAuthMessage(error.message, "캐릭터를 생성하지 못했습니다.") };
  }

  return { ok: true, character: data, message: "" };
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

export async function trainMyCharacter(): Promise<CharacterResult> {
  if (!supabase) return { ok: false, character: null, message: "Supabase 설정을 확인해주세요." };

  const { data, error } = await supabase.rpc("train_my_character");

  if (error) {
    return {
      ok: false,
      character: null,
      message: toKoreanAuthMessage(error.message, "훈련을 완료하지 못했습니다."),
    };
  }

  return { ok: true, character: data, message: "경험치를 획득했습니다." };
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
