import { hasSupabaseConfig, supabase } from "../config/supabaseClient.js";
import { toKoreanAuthMessage } from "../shared/authMessages.js";

export async function getAuthState() {
  if (!hasSupabaseConfig()) {
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

export async function getSession() {
  const { data, error } = await supabase.auth.getSession();

  if (error) {
    return { ok: false, session: null, message: toKoreanAuthMessage(error.message) };
  }

  return { ok: true, session: data.session, message: "" };
}

export async function getCurrentUser() {
  const { data, error } = await supabase.auth.getUser();

  if (error) {
    return { ok: false, user: null, message: toKoreanAuthMessage(error.message) };
  }

  return { ok: true, user: data.user, message: "" };
}

export async function signInWithEmail(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { ok: false, session: null, message: toKoreanAuthMessage(error.message) };
  }

  return { ok: true, session: data.session, message: "" };
}

export async function signUpWithEmail(email, password) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) {
    return { ok: false, session: null, message: toKoreanAuthMessage(error.message) };
  }

  return {
    ok: true,
    session: data.session,
    message: data.session ? "" : "가입 확인 메일을 확인해주세요.",
  };
}

export async function requestPasswordReset(email) {
  const redirectTo = `${window.location.origin}/?auth=recovery`;
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo,
  });

  if (error) {
    return { ok: false, message: toKoreanAuthMessage(error.message) };
  }

  return { ok: true, message: "비밀번호 재설정 메일을 보냈습니다." };
}

export async function updatePassword(password) {
  const { error } = await supabase.auth.updateUser({
    password,
  });

  if (error) {
    return { ok: false, message: toKoreanAuthMessage(error.message) };
  }

  return { ok: true, message: "비밀번호를 변경했습니다. 다시 접속해주세요." };
}

export function onPasswordRecovery(callback) {
  if (!supabase) return { unsubscribe() {} };

  const { data } = supabase.auth.onAuthStateChange((event, session) => {
    if (event === "PASSWORD_RECOVERY") {
      callback(session);
    }
  });

  return data.subscription;
}

export async function signOut() {
  if (!supabase) return;
  await supabase.auth.signOut();
}
