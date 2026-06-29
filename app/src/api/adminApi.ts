import { supabase } from "../lib/supabase";
import { toKoreanAuthMessage } from "../shared/authMessages";

export type AdminAccessResult =
  | { ok: true; isAdmin: boolean }
  | { ok: false; isAdmin: false; message: string };

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
