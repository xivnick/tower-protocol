import type { Session, User } from "@supabase/supabase-js";
import { supabase, hasSupabaseConfig } from "../lib/supabase";
import { toKoreanAuthMessage } from "../shared/authMessages";

type SessionResult = {
  ok: boolean;
  session: Session | null;
  message: string;
};

type UserResult = {
  ok: boolean;
  user: User | null;
  message: string;
};

export async function getAuthState(): Promise<SessionResult> {
  if (!hasSupabaseConfig() || !supabase) {
    return {
      ok: false,
      session: null,
      message: ".env에 Supabase URL과 anon key를 설정해야 합니다.",
    };
  }

  const { data, error } = await supabase.auth.getSession();

  if (error) {
    return { ok: false, session: null, message: toKoreanAuthMessage(error.message) };
  }

  return { ok: true, session: data.session, message: "" };
}

export async function getSession(): Promise<SessionResult> {
  if (!supabase) return { ok: false, session: null, message: "Supabase 설정을 확인해주세요." };

  const { data, error } = await supabase.auth.getSession();

  if (error) {
    return { ok: false, session: null, message: toKoreanAuthMessage(error.message) };
  }

  return { ok: true, session: data.session, message: "" };
}

export async function getCurrentUser(): Promise<UserResult> {
  if (!supabase) return { ok: false, user: null, message: "Supabase 설정을 확인해주세요." };

  const { data, error } = await supabase.auth.getUser();

  if (error) {
    return { ok: false, user: null, message: toKoreanAuthMessage(error.message) };
  }

  return { ok: true, user: data.user, message: "" };
}

export async function signInWithEmail(email: string, password: string): Promise<SessionResult> {
  if (!supabase) return { ok: false, session: null, message: "Supabase 설정을 확인해주세요." };

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { ok: false, session: null, message: toKoreanAuthMessage(error.message) };
  }

  return { ok: true, session: data.session, message: "" };
}

export async function signUpWithEmail(email: string, password: string): Promise<SessionResult> {
  if (!supabase) return { ok: false, session: null, message: "Supabase 설정을 확인해주세요." };

  const { data, error } = await supabase.auth.signUp({ email, password });

  if (error) {
    return { ok: false, session: null, message: toKoreanAuthMessage(error.message) };
  }

  return {
    ok: true,
    session: data.session,
    message: data.session ? "" : "가입 확인 메일을 확인해주세요.",
  };
}

export async function requestPasswordReset(email: string) {
  if (!supabase) return { ok: false, message: "Supabase 설정을 확인해주세요." };

  const redirectTo = `${window.location.origin}/reset-password`;
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });

  if (error) {
    return { ok: false, message: toKoreanAuthMessage(error.message) };
  }

  return { ok: true, message: "비밀번호 재설정 메일을 보냈습니다." };
}

export async function updatePassword(password: string) {
  if (!supabase) return { ok: false, message: "Supabase 설정을 확인해주세요." };

  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    return { ok: false, message: toKoreanAuthMessage(error.message) };
  }

  return { ok: true, message: "비밀번호를 변경했습니다. 다시 접속해주세요." };
}

export function onPasswordRecovery(callback: (session: Session | null) => void) {
  if (!supabase) return () => {};

  const { data } = supabase.auth.onAuthStateChange((event, session) => {
    if (event === "PASSWORD_RECOVERY") {
      callback(session);
    }
  });

  return () => data.subscription.unsubscribe();
}

export async function signOut() {
  if (!supabase) return;
  await supabase.auth.signOut();
}
