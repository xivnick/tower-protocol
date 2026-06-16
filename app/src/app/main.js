import { getAuthState, getCurrentUser, getSession, onPasswordRecovery, signOut } from "./api/authApi.js";
import { getMyProfile } from "./api/profileApi.js";
import { renderAuth } from "./features/auth/authView.js";
import { renderShell } from "./features/shell/shellView.js";
import { createSessionStore } from "./state/sessionStore.js";
import "./../styles/game.css";

const root = document.getElementById("app");
const store = createSessionStore({
  status: "loading",
  authMode: "signin",
  authEmail: "",
  recoveryEmail: "",
  isSubmitting: false,
  session: null,
  profile: null,
  message: "세션 확인 중...",
  messageType: "info",
});

store.subscribe(render);
onPasswordRecovery(async (session) => {
  await enterPasswordRecovery(session);
});
boot();

async function boot() {
  const authState = await getAuthState();

  if (!authState.ok) {
    store.set({
      status: "config-error",
      isSubmitting: false,
      session: null,
      profile: null,
      message: authState.message,
      messageType: "error",
    });
    return;
  }

  if (!authState.session) {
    if (isRecoveryRedirect()) {
      await enterPasswordRecovery(null);
      return;
    }

    store.set({
      status: "signed-out",
      authMode: "signin",
      authEmail: "",
      recoveryEmail: "",
      isSubmitting: false,
      session: null,
      profile: null,
      message: "",
      messageType: "info",
    });
    return;
  }

  if (isRecoveryRedirect()) {
    await enterPasswordRecovery(authState.session);
    return;
  }

  await enterApp(authState.session);
}

async function enterApp(session) {
  const profileResult = await getMyProfile();

  if (!profileResult.ok) {
    store.set({
      status: "error",
      isSubmitting: false,
      session,
      profile: null,
      message: profileResult.message,
      messageType: "error",
    });
    return;
  }

  store.set({
    status: profileResult.profile ? "signed-in" : "profile-required",
    isSubmitting: false,
    session,
    profile: profileResult.profile,
    message: "",
    messageType: "info",
  });
}

async function handleSignOut() {
  await signOut();
  store.set({
    status: "signed-out",
    authMode: "signin",
    authEmail: "",
    recoveryEmail: "",
    isSubmitting: false,
    session: null,
    profile: null,
    message: "접속을 종료했습니다.",
    messageType: "info",
  });
}

function render(state) {
  if (state.status === "signed-in") {
    root.innerHTML = renderShell(state);
    root.querySelector("[data-action='sign-out']").addEventListener("click", handleSignOut);
    return;
  }

  root.innerHTML = renderAuth(state);
}

export { enterApp, store };

function isRecoveryRedirect() {
  const url = new URL(window.location.href);
  return url.searchParams.get("auth") === "recovery" || window.location.hash.includes("type=recovery");
}

async function enterPasswordRecovery(initialSession) {
  store.set({
    status: "signed-out",
    authMode: "reset-update",
    recoveryEmail: "",
    isSubmitting: true,
    session: initialSession,
    profile: null,
    message: "계정 확인 중...",
    messageType: "info",
  });

  const session = initialSession ?? await waitForRecoverySession();
  const userResult = session ? await getCurrentUser() : { ok: false, user: null };
  const email = userResult.user?.email ?? session?.user?.email ?? "";

  store.set({
    status: "signed-out",
    authMode: "reset-update",
    recoveryEmail: email,
    isSubmitting: false,
    session,
    profile: null,
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

function delay(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}
