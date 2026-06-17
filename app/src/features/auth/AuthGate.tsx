import type { FormEvent } from "react";
import { useEffect, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import {
  getAuthState,
  getCurrentUser,
  getSession,
  onPasswordRecovery,
  requestPasswordReset,
  signInWithEmail,
  signOut,
  signUpWithEmail,
  updatePassword,
} from "../../api/authApi";
import { getMyCharacter } from "../../api/characterApi";
import { checkNicknameAvailability, createMyProfile, getMyProfile } from "../../api/profileApi";
import { useDocumentTitle } from "../../shared/useDocumentTitle";
import { getNicknameValidationMessage, validateEmail, validateNickname, validatePassword } from "../../shared/validation";
import type { AuthMode, AuthState } from "../../types/auth";
import { AppShell } from "../shell/AppShell";

const initialState: AuthState = {
  status: "checking",
  mode: "signin",
  email: "",
  recoveryEmail: "",
  isSubmitting: false,
  session: null,
  profile: null,
  character: null,
  message: "세션 확인 중...",
  messageType: "info",
};

export function AuthGate() {
  const [state, setState] = useState<AuthState>(initialState);

  useEffect(() => {
    const unsubscribe = onPasswordRecovery((session) => {
      void enterPasswordRecovery(session);
    });

    void boot();
    return unsubscribe;
  }, []);

  async function boot() {
    const authState = await getAuthState();

    if (!authState.ok) {
      patchState({
        status: "config-error",
        isSubmitting: false,
        session: null,
        profile: null,
        character: null,
        message: authState.message,
        messageType: "error",
      });
      return;
    }

    if (!authState.session) {
      if (isRecoveryRoute()) {
        await enterPasswordRecovery(null);
        return;
      }

      patchState({
        status: "signed-out",
        mode: "signin",
        email: "",
        recoveryEmail: "",
        isSubmitting: false,
        session: null,
        profile: null,
        character: null,
        message: "",
        messageType: "info",
      });
      return;
    }

    if (isRecoveryRoute()) {
      await enterPasswordRecovery(authState.session);
      return;
    }

    await enterApp(authState.session);
  }

  async function enterApp(session: Session) {
    const profileResult = await getMyProfile();

    if (!profileResult.ok) {
      patchState({
        status: "signed-out",
        isSubmitting: false,
        session,
        profile: null,
        character: null,
        message: profileResult.message,
        messageType: "error",
      });
      return;
    }

    if (!profileResult.profile) {
      patchState({
        status: "profile-required",
        isSubmitting: false,
        session,
        profile: null,
        character: null,
        message: "",
        messageType: "info",
      });
      return;
    }

    const characterResult = await getMyCharacter();

    patchState({
      status: "signed-in",
      isSubmitting: false,
      session,
      profile: profileResult.profile,
      character: characterResult.ok ? characterResult.character : null,
      message: characterResult.ok ? "" : characterResult.message,
      messageType: characterResult.ok ? "info" : "error",
    });
  }

  async function enterPasswordRecovery(initialSession: Session | null) {
    patchState({
      status: "signed-out",
      mode: "reset-update",
      recoveryEmail: "",
      isSubmitting: true,
      session: initialSession,
      profile: null,
      character: null,
      message: "계정 확인 중...",
      messageType: "info",
    });

    const recoverySession = initialSession ?? await waitForRecoverySession();
    const userResult = recoverySession ? await getCurrentUser() : { ok: false, user: null };
    const email = userResult.user?.email ?? recoverySession?.user?.email ?? "";

    patchState({
      status: "signed-out",
      mode: "reset-update",
      recoveryEmail: email,
      isSubmitting: false,
      session: recoverySession,
      profile: null,
      character: null,
      message: email ? "" : "재설정 링크를 확인하지 못했습니다. 메일의 링크로 다시 접속해주세요.",
      messageType: email ? "info" : "error",
    });
  }

  async function waitForRecoverySession() {
    for (let attempt = 0; attempt < 10; attempt += 1) {
      const result = await getSession();

      if (result.ok && result.session) {
        return result.session;
      }

      await delay(250);
    }

    return null;
  }

  async function handleSignOut() {
    await signOut();
    window.history.replaceState(null, "", "/");
    patchState({
      status: "signed-out",
      mode: "signin",
      email: "",
      recoveryEmail: "",
      isSubmitting: false,
      session: null,
      profile: null,
      character: null,
      message: "접속을 종료했습니다.",
      messageType: "info",
    });
  }

  function patchState(patch: Partial<AuthState>) {
    setState((current) => ({ ...current, ...patch }));
  }

  if (state.status === "signed-in") {
    return (
      <AppShell
        session={state.session}
        profile={state.profile}
        character={state.character}
        onCharacterChange={(character) => patchState({ character })}
        onSignOut={handleSignOut}
      />
    );
  }

  return (
    <AuthScreen
      state={state}
      patchState={patchState}
      enterApp={enterApp}
      signOut={handleSignOut}
    />
  );
}

function AuthScreen({
  state,
  patchState,
  enterApp,
  signOut: handleSignOut,
}: {
  state: AuthState;
  patchState: (patch: Partial<AuthState>) => void;
  enterApp: (session: Session) => Promise<void>;
  signOut: () => Promise<void>;
}) {
  const canGoBack = state.mode === "reset-request" || state.mode === "reset-update";
  const title = getAuthTitle(state);

  useDocumentTitle(title);

  return (
    <>
      <div className="crt-overlay" aria-hidden="true" />
      <main className="auth-screen">
        <section className="auth-panel" aria-labelledby="authTitle">
          <div className="protocol-row">
            <div className="protocol-line">TOWER://ACCESS_GATE</div>
            {canGoBack && (
              <button className="text-button protocol-back" type="button" onClick={handleSignOut}>
                BACK
              </button>
            )}
          </div>
          <h1 id="authTitle">TOWER://</h1>
          <AuthBody state={state} patchState={patchState} enterApp={enterApp} />
        </section>
      </main>
    </>
  );
}

function getAuthTitle(state: AuthState) {
  if (state.status === "profile-required") {
    return "TOWER://PROFILE_SETUP";
  }

  if (state.mode === "reset-request") {
    return "TOWER://PASSWORD_RECOVERY";
  }

  if (state.mode === "reset-update") {
    return "TOWER://RESET_PASSWORD";
  }

  return "TOWER://ACCESS_GATE";
}

function AuthBody({
  state,
  patchState,
  enterApp,
}: {
  state: AuthState;
  patchState: (patch: Partial<AuthState>) => void;
  enterApp: (session: Session) => Promise<void>;
}) {
  if (state.status === "checking") {
    return <p className="auth-copy">{state.message}</p>;
  }

  if (state.status === "config-error") {
    return (
      <>
        <p className="auth-copy">Supabase 연결 정보가 없습니다. 프로젝트 환경 변수를 확인해주세요.</p>
        <pre className="code-block">VITE_SUPABASE_URL=...{"\n"}VITE_SUPABASE_ANON_KEY=...</pre>
        <Message state={state} />
      </>
    );
  }

  if (state.status === "profile-required") {
    return <ProfileForm state={state} patchState={patchState} />;
  }

  if (state.mode === "reset-request") {
    return <ResetRequestForm state={state} patchState={patchState} />;
  }

  if (state.mode === "reset-update") {
    return <ResetUpdateForm state={state} patchState={patchState} />;
  }

  return <EmailAuthForm state={state} patchState={patchState} enterApp={enterApp} />;
}

function EmailAuthForm({
  state,
  patchState,
  enterApp,
}: {
  state: AuthState;
  patchState: (patch: Partial<AuthState>) => void;
  enterApp: (session: Session) => Promise<void>;
}) {
  const mode = state.mode === "signup" ? "signup" : "signin";
  const isSignup = mode === "signup";
  const submitLabel = state.isSubmitting
    ? isSignup ? "생성 중..." : "접속 중..."
    : isSignup ? "계정 생성" : "접속";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email")).trim();
    const password = String(formData.get("password"));
    const passwordConfirm = String(formData.get("passwordConfirm") ?? "");

    if (!validateEmail(email)) {
      patchState({ status: "signed-out", email, message: "이메일 형식을 확인해주세요.", messageType: "error" });
      return;
    }

    if (!validatePassword(password)) {
      patchState({ status: "signed-out", email, message: "비밀번호는 8자 이상이어야 합니다.", messageType: "error" });
      return;
    }

    if (mode === "signup" && password !== passwordConfirm) {
      patchState({ status: "signed-out", email, message: "비밀번호가 일치하지 않습니다.", messageType: "error" });
      return;
    }

    patchState({
      status: "signed-out",
      mode,
      email,
      isSubmitting: true,
      message: mode === "signup" ? "계정 생성 중..." : "접속 중...",
      messageType: "info",
    });

    const result = mode === "signup"
      ? await signUpWithEmail(email, password)
      : await signInWithEmail(email, password);

    if (!result.ok) {
      patchState({ status: "signed-out", mode, email, isSubmitting: false, message: result.message, messageType: "error" });
      return;
    }

    if (!result.session) {
      patchState({ status: "signed-out", mode, email, isSubmitting: false, message: result.message, messageType: "info" });
      return;
    }

    await enterApp(result.session);
  }

  function setMode(nextMode: AuthMode) {
    patchState({ mode: nextMode, message: "", messageType: "info" });
  }

  return (
    <>
      <div className="tabs" role="tablist" aria-label="인증 모드">
        <button className={`tab ${mode === "signin" ? "is-active" : ""}`} type="button" onClick={() => setMode("signin")} disabled={state.isSubmitting}>
          로그인
        </button>
        <button className={`tab ${isSignup ? "is-active" : ""}`} type="button" onClick={() => setMode("signup")} disabled={state.isSubmitting}>
          회원가입
        </button>
      </div>
      <form className="auth-form" onSubmit={handleSubmit} noValidate>
        <label htmlFor="emailInput">
          <span>이메일</span>
          <input id="emailInput" name="email" type="email" autoComplete="email" placeholder="you@example.com" value={state.email} onChange={(event) => patchState({ email: event.target.value })} required disabled={state.isSubmitting} />
        </label>
        <label htmlFor="passwordInput">
          <span className="label-row">
            <span>비밀번호</span>
            {mode === "signin" && (
              <button className="text-button" type="button" onClick={() => patchState({ mode: "reset-request", message: "", messageType: "info" })} disabled={state.isSubmitting}>
                비밀번호 찾기
              </button>
            )}
          </span>
          <input id="passwordInput" name="password" type="password" autoComplete={isSignup ? "new-password" : "current-password"} minLength={8} placeholder="8자 이상" required disabled={state.isSubmitting} />
        </label>
        {isSignup && (
          <label htmlFor="passwordConfirmInput">
            <span>비밀번호 확인</span>
            <input id="passwordConfirmInput" name="passwordConfirm" type="password" autoComplete="new-password" minLength={8} placeholder="다시 입력" required disabled={state.isSubmitting} />
          </label>
        )}
        <button className="btn primary" type="submit" disabled={state.isSubmitting}>{submitLabel}</button>
      </form>
      <Message state={state} />
    </>
  );
}

function ResetRequestForm({
  state,
  patchState,
}: {
  state: AuthState;
  patchState: (patch: Partial<AuthState>) => void;
}) {
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email")).trim();

    if (!validateEmail(email)) {
      patchState({ status: "signed-out", mode: "reset-request", email, message: "이메일 형식을 확인해주세요.", messageType: "error" });
      return;
    }

    patchState({
      status: "signed-out",
      mode: "reset-request",
      email,
      isSubmitting: true,
      message: "재설정 메일 발송 중...",
      messageType: "info",
    });

    const result = await requestPasswordReset(email);

    patchState({
      status: "signed-out",
      mode: "reset-request",
      email,
      isSubmitting: false,
      message: result.message,
      messageType: result.ok ? "info" : "error",
    });
  }

  return (
    <>
      <form className="auth-form" onSubmit={handleSubmit} noValidate>
        <label htmlFor="resetEmailInput">
          <span>이메일</span>
          <input id="resetEmailInput" name="email" type="email" autoComplete="email" placeholder="you@example.com" value={state.email} onChange={(event) => patchState({ email: event.target.value })} required disabled={state.isSubmitting} />
        </label>
        <button className="btn primary" type="submit" disabled={state.isSubmitting}>{state.isSubmitting ? "발송 중..." : "재설정 메일 발송"}</button>
      </form>
      <Message state={state} />
    </>
  );
}

function ResetUpdateForm({
  state,
  patchState,
}: {
  state: AuthState;
  patchState: (patch: Partial<AuthState>) => void;
}) {
  const canSubmit = Boolean(state.recoveryEmail || state.session?.user?.email) && !state.isSubmitting;
  const email = state.recoveryEmail || state.session?.user?.email || "";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const password = String(formData.get("password"));
    const passwordConfirm = String(formData.get("passwordConfirm"));

    if (!validatePassword(password)) {
      patchState({ status: "signed-out", mode: "reset-update", message: "비밀번호는 8자 이상이어야 합니다.", messageType: "error" });
      return;
    }

    if (password !== passwordConfirm) {
      patchState({ status: "signed-out", mode: "reset-update", message: "비밀번호가 일치하지 않습니다.", messageType: "error" });
      return;
    }

    patchState({
      status: "signed-out",
      mode: "reset-update",
      isSubmitting: true,
      message: "비밀번호 변경 중...",
      messageType: "info",
    });

    const result = await updatePassword(password);
    await signOut();
    window.history.replaceState(null, "", "/");

    patchState({
      status: "signed-out",
      mode: "signin",
      isSubmitting: false,
      session: null,
      profile: null,
      character: null,
      recoveryEmail: "",
      message: result.message,
      messageType: result.ok ? "info" : "error",
    });
  }

  return (
    <>
      <form className="auth-form" onSubmit={handleSubmit} noValidate>
        <label htmlFor="recoveryEmailInput">
          <span>계정</span>
          <input id="recoveryEmailInput" type="text" value={email} placeholder="계정 확인 중..." readOnly />
        </label>
        <label htmlFor="newPasswordInput">
          <span>새 비밀번호</span>
          <input id="newPasswordInput" name="password" type="password" autoComplete="new-password" minLength={8} placeholder="8자 이상" required disabled={!canSubmit} />
        </label>
        <label htmlFor="newPasswordConfirmInput">
          <span>새 비밀번호 확인</span>
          <input id="newPasswordConfirmInput" name="passwordConfirm" type="password" autoComplete="new-password" minLength={8} placeholder="다시 입력" required disabled={!canSubmit} />
        </label>
        <button className="btn primary" type="submit" disabled={!canSubmit}>{state.isSubmitting ? "확인 중..." : "비밀번호 변경"}</button>
      </form>
      <Message state={state} />
    </>
  );
}

function ProfileForm({
  state,
  patchState,
}: {
  state: AuthState;
  patchState: (patch: Partial<AuthState>) => void;
}) {
  const [nickname, setNickname] = useState("");
  const [hint, setHint] = useState("");
  const [hintType, setHintType] = useState<"is-ok" | "is-error" | "">("");
  const requestIdRef = useRef(0);

  useEffect(() => {
    window.clearTimeout(requestIdRef.current);

    if (!nickname) {
      setHint("");
      setHintType("");
      return;
    }

    if (!validateNickname(nickname)) {
      setHint(getNicknameValidationMessage(nickname));
      setHintType("is-error");
      return;
    }

    const requestId = window.setTimeout(async () => {
      setHint("닉네임 확인 중...");
      setHintType("");
      const result = await checkNicknameAvailability(nickname);
      setHint(result.message);
      setHintType(result.ok && result.available ? "is-ok" : "is-error");
    }, 350);

    requestIdRef.current = requestId;
    return () => window.clearTimeout(requestId);
  }, [nickname]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedNickname = nickname.trim();

    if (!validateNickname(trimmedNickname)) {
      patchState({ status: "profile-required", message: getNicknameValidationMessage(trimmedNickname), messageType: "error" });
      return;
    }

    const availability = await checkNicknameAvailability(trimmedNickname);

    if (!availability.ok || !availability.available) {
      patchState({ status: "profile-required", message: availability.message, messageType: "error" });
      return;
    }

    patchState({ status: "profile-required", isSubmitting: true, message: "프로필 생성 중...", messageType: "info" });
    const result = await createMyProfile(trimmedNickname);

    if (!result.ok) {
      patchState({ status: "profile-required", isSubmitting: false, message: result.message, messageType: "error" });
      return;
    }

    patchState({
      status: "signed-in",
      isSubmitting: false,
      profile: result.profile,
      character: null,
      message: "",
      messageType: "info",
    });
  }

  return (
    <>
      <form className="auth-form" onSubmit={handleSubmit} noValidate>
        <label htmlFor="nicknameInput">
          <span>닉네임</span>
          <input id="nicknameInput" name="nickname" type="text" autoComplete="nickname" maxLength={16} placeholder="닉네임을 입력해주세요" value={nickname} onChange={(event) => setNickname(event.target.value)} required disabled={state.isSubmitting} />
          <small className={`field-hint ${hintType}`} aria-live="polite">{hint}</small>
        </label>
        <button className="btn primary" type="submit" disabled={state.isSubmitting}>{state.isSubmitting ? "생성 중..." : "프로필 생성"}</button>
      </form>
      <Message state={state} />
    </>
  );
}

function Message({ state }: { state: AuthState }) {
  const typeClass = state.messageType === "error" ? "is-error" : "";
  return <p className={`auth-message ${typeClass}`} role="status">{state.message}</p>;
}

function isRecoveryRoute() {
  return window.location.pathname === "/reset-password" || window.location.hash.includes("type=recovery");
}

function delay(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}
