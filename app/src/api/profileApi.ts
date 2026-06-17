import { supabase } from "../lib/supabase";
import { toKoreanAuthMessage } from "../shared/authMessages";
import { getNicknameValidationMessage } from "../shared/validation";

export type Profile = {
  user_id: string;
  nickname: string;
  created_at: string;
  updated_at: string;
};

type ProfileResult = {
  ok: boolean;
  profile: Profile | null;
  message: string;
};

type NicknameAvailabilityResult = {
  ok: boolean;
  available: boolean;
  message: string;
};

export async function getMyProfile(): Promise<ProfileResult> {
  if (!supabase) return { ok: false, profile: null, message: "Supabase 설정을 확인해주세요." };

  const { data: userResult, error: userError } = await supabase.auth.getUser();

  if (userError || !userResult.user) {
    return {
      ok: false,
      profile: null,
      message: userError ? toKoreanAuthMessage(userError.message) : "유저 정보를 찾을 수 없습니다.",
    };
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("user_id,nickname,created_at,updated_at")
    .eq("user_id", userResult.user.id)
    .maybeSingle();

  if (error) {
    return { ok: false, profile: null, message: toKoreanAuthMessage(error.message, "프로필을 불러오지 못했습니다.") };
  }

  return { ok: true, profile: data, message: "" };
}

export async function createMyProfile(nickname: string): Promise<ProfileResult> {
  if (!supabase) return { ok: false, profile: null, message: "Supabase 설정을 확인해주세요." };

  const validationMessage = getNicknameValidationMessage(nickname);

  if (validationMessage) {
    return { ok: false, profile: null, message: validationMessage };
  }

  const { data: userResult, error: userError } = await supabase.auth.getUser();

  if (userError || !userResult.user) {
    return {
      ok: false,
      profile: null,
      message: userError ? toKoreanAuthMessage(userError.message) : "유저 정보를 찾을 수 없습니다.",
    };
  }

  const { data, error } = await supabase
    .from("profiles")
    .insert({
      user_id: userResult.user.id,
      nickname: nickname.trim(),
    })
    .select("user_id,nickname,created_at,updated_at")
    .single();

  if (error) {
    return { ok: false, profile: null, message: toKoreanAuthMessage(error.message, "프로필을 생성하지 못했습니다.") };
  }

  return { ok: true, profile: data, message: "" };
}

export async function checkNicknameAvailability(nickname: string): Promise<NicknameAvailabilityResult> {
  if (!supabase) return { ok: false, available: false, message: "Supabase 설정을 확인해주세요." };

  const candidate = nickname.trim();
  const validationMessage = getNicknameValidationMessage(candidate);

  if (validationMessage) {
    return { ok: true, available: false, message: validationMessage };
  }

  const { data, error } = await supabase.rpc("is_profile_name_available", { candidate });

  if (error) {
    return {
      ok: false,
      available: false,
      message: toKoreanAuthMessage(error.message, "닉네임 확인에 실패했습니다."),
    };
  }

  return {
    ok: true,
    available: Boolean(data),
    message: data ? "사용 가능한 닉네임입니다." : "이미 사용 중인 이름입니다.",
  };
}
