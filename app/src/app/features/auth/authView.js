import { requestPasswordReset, signInWithEmail, signOut, signUpWithEmail, updatePassword } from "../../api/authApi.js";
import { checkNicknameAvailability, createMyProfile } from "../../api/profileApi.js";
import { escapeHtml } from "../../shared/escapeHtml.js";
import { getNicknameValidationMessage, validateEmail, validateNickname, validatePassword } from "../../shared/validation.js";
import { enterApp, store } from "../../main.js";

let nicknameCheckTimer = 0;
let nicknameCheckRequestId = 0;

export function renderAuth(state) {
  queueMicrotask(bindAuthEvents);
  const canGoBack = state.authMode === "reset-request" || state.authMode === "reset-update";

  return `
    <div class="crt-overlay" aria-hidden="true"></div>
    <main class="auth-screen">
      <section class="auth-panel" aria-labelledby="authTitle">
        <div class="protocol-row">
          <div class="protocol-line">TOWER://ACCESS_GATE</div>
          ${canGoBack ? `<button class="text-button protocol-back" type="button" data-action="back-to-signin">BACK</button>` : ""}
        </div>
        <h1 id="authTitle">TOWER://</h1>
        ${renderAuthBody(state)}
      </section>
    </main>
  `;
}

function renderAuthBody(state) {
  if (state.status === "loading") {
    return `<p class="auth-copy">${escapeHtml(state.message)}</p>`;
  }

  if (state.status === "config-error") {
    return `
      <p class="auth-copy">Supabase 연결 정보가 아직 없습니다. 프로젝트 루트에 <code>.env</code>를 만들고 값을 채워주세요.</p>
      <pre class="code-block">VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...</pre>
      <p class="auth-message is-error">${escapeHtml(state.message)}</p>
    `;
  }

  if (state.status === "profile-required") {
    const disabled = state.isSubmitting ? "disabled" : "";
    return `
      <form class="auth-form" data-form="profile" novalidate>
        <label for="nicknameInput">
          <span>닉네임</span>
          <input id="nicknameInput" name="nickname" type="text" autocomplete="nickname" maxlength="16" placeholder="닉네임을 입력해주세요" required ${disabled}>
          <small id="nicknameHint" class="field-hint" aria-live="polite"></small>
        </label>
        <button class="btn primary" type="submit" ${disabled}>${state.isSubmitting ? "생성 중..." : "프로필 생성"}</button>
      </form>
      ${renderMessage(state)}
    `;
  }

  const mode = state.authMode === "signup" ? "signup" : "signin";

  if (state.authMode === "reset-request") {
    return renderResetRequest(state);
  }

  if (state.authMode === "reset-update") {
    return renderResetUpdate(state);
  }

  const isSignup = mode === "signup";
  const disabled = state.isSubmitting ? "disabled" : "";
  const emailValue = escapeHtml(state.authEmail ?? "");
  const submitLabel = state.isSubmitting
    ? isSignup ? "생성 중..." : "접속 중..."
    : isSignup ? "계정 생성" : "접속";

  return `
    <div class="tabs" role="tablist" aria-label="인증 모드">
      <button class="tab ${mode === "signin" ? "is-active" : ""}" type="button" data-mode="signin" ${disabled}>로그인</button>
      <button class="tab ${isSignup ? "is-active" : ""}" type="button" data-mode="signup" ${disabled}>회원가입</button>
    </div>
    <form class="auth-form" data-form="auth" data-mode="${mode}" novalidate>
      <label for="emailInput">
        <span>이메일</span>
        <input id="emailInput" name="email" type="email" autocomplete="email" placeholder="you@example.com" value="${emailValue}" required ${disabled}>
      </label>
      <label for="passwordInput">
        <span class="label-row">
          <span>비밀번호</span>
          ${mode === "signin" ? `<button class="text-button" type="button" data-action="reset-request" ${disabled}>비밀번호 찾기</button>` : ""}
        </span>
        <input id="passwordInput" name="password" type="password" autocomplete="${isSignup ? "new-password" : "current-password"}" minlength="8" placeholder="8자 이상" required ${disabled}>
      </label>
      <label class="signup-only ${isSignup ? "" : "is-hidden"}" for="passwordConfirmInput">
        <span>비밀번호 확인</span>
        <input id="passwordConfirmInput" name="passwordConfirm" type="password" autocomplete="new-password" minlength="8" placeholder="다시 입력" ${isSignup ? "required" : ""} ${disabled}>
      </label>
      <button class="btn primary" type="submit" ${disabled}>${submitLabel}</button>
    </form>
    ${renderMessage(state)}
  `;
}

function renderResetRequest(state) {
  const disabled = state.isSubmitting ? "disabled" : "";
  const emailValue = escapeHtml(state.authEmail ?? "");

  return `
    <form class="auth-form" data-form="reset-request" novalidate>
      <label for="resetEmailInput">
        <span>이메일</span>
        <input id="resetEmailInput" name="email" type="email" autocomplete="email" placeholder="you@example.com" value="${emailValue}" required ${disabled}>
      </label>
      <button class="btn primary" type="submit" ${disabled}>${state.isSubmitting ? "발송 중..." : "재설정 메일 발송"}</button>
    </form>
    ${renderMessage(state)}
  `;
}

function renderResetUpdate(state) {
  const disabled = state.isSubmitting ? "disabled" : "";
  const email = escapeHtml(state.recoveryEmail || state.session?.user?.email || "");
  const canSubmit = email && !state.isSubmitting;

  return `
    <form class="auth-form" data-form="reset-update" novalidate>
      <label for="recoveryEmailInput">
        <span>계정</span>
        <input id="recoveryEmailInput" type="text" value="${email}" placeholder="계정 확인 중..." readonly>
      </label>
      <label for="newPasswordInput">
        <span>새 비밀번호</span>
        <input id="newPasswordInput" name="password" type="password" autocomplete="new-password" minlength="8" placeholder="8자 이상" required ${canSubmit ? "" : "disabled"}>
      </label>
      <label for="newPasswordConfirmInput">
        <span>새 비밀번호 확인</span>
        <input id="newPasswordConfirmInput" name="passwordConfirm" type="password" autocomplete="new-password" minlength="8" placeholder="다시 입력" required ${canSubmit ? "" : "disabled"}>
      </label>
      <button class="btn primary" type="submit" ${canSubmit ? "" : "disabled"}>${state.isSubmitting ? "확인 중..." : "비밀번호 변경"}</button>
    </form>
    ${renderMessage(state)}
  `;
}

function bindAuthEvents() {
  const authForm = document.querySelector("[data-form='auth']");
  const profileForm = document.querySelector("[data-form='profile']");
  const resetRequestForm = document.querySelector("[data-form='reset-request']");
  const resetUpdateForm = document.querySelector("[data-form='reset-update']");
  const tabs = Array.from(document.querySelectorAll(".tab[data-mode]"));

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      setAuthMode(tab.dataset.mode);
    });
  });

  authForm?.addEventListener("submit", handleAuthSubmit);
  profileForm?.addEventListener("submit", handleProfileSubmit);
  profileForm?.querySelector("#nicknameInput")?.addEventListener("input", handleNicknameInput);
  resetRequestForm?.addEventListener("submit", handleResetRequestSubmit);
  resetUpdateForm?.addEventListener("submit", handleResetUpdateSubmit);

  document.querySelector("[data-action='reset-request']")?.addEventListener("click", () => {
    store.set({
      authMode: "reset-request",
      authEmail: getCurrentEmailValue(),
      message: "",
      messageType: "info",
    });
  });

  document.querySelector("[data-action='back-to-signin']")?.addEventListener("click", async () => {
    await signOut();
    history.replaceState(null, "", "/");
    store.set({
      status: "signed-out",
      authMode: "signin",
      isSubmitting: false,
      session: null,
      profile: null,
      recoveryEmail: "",
      message: "",
      messageType: "info",
    });
  });
}

function setAuthMode(mode) {
  store.set({
    authMode: mode,
    authEmail: getCurrentEmailValue(),
    message: "",
    messageType: "info",
  });
}

async function handleAuthSubmit(event) {
  event.preventDefault();

  const form = event.currentTarget;
  const formData = new FormData(form);
  const email = String(formData.get("email")).trim();
  const password = String(formData.get("password"));
  const passwordConfirm = String(formData.get("passwordConfirm") ?? "");
  const mode = form.dataset.mode;

  if (!validateEmail(email)) {
    store.set({ status: "signed-out", authEmail: email, message: "이메일 형식을 확인해주세요.", messageType: "error" });
    return;
  }

  if (!validatePassword(password)) {
    store.set({ status: "signed-out", authEmail: email, message: "비밀번호는 8자 이상이어야 합니다.", messageType: "error" });
    return;
  }

  if (mode === "signup" && password !== passwordConfirm) {
    store.set({ status: "signed-out", authEmail: email, message: "비밀번호가 일치하지 않습니다.", messageType: "error" });
    return;
  }

  store.set({
    status: "signed-out",
    authMode: mode,
    authEmail: email,
    isSubmitting: true,
    message: mode === "signup" ? "계정 생성 중..." : "접속 중...",
    messageType: "info",
  });

  const result = mode === "signup"
    ? await signUpWithEmail(email, password)
    : await signInWithEmail(email, password);

  if (!result.ok) {
    store.set({ status: "error", authMode: mode, authEmail: email, isSubmitting: false, message: result.message, messageType: "error" });
    return;
  }

  if (!result.session) {
    store.set({ status: "signed-out", authMode: mode, authEmail: email, isSubmitting: false, message: result.message, messageType: "info" });
    return;
  }

  await enterApp(result.session);
}

async function handleProfileSubmit(event) {
  event.preventDefault();

  const formData = new FormData(event.currentTarget);
  const nickname = String(formData.get("nickname")).trim();

  if (!validateNickname(nickname)) {
    store.set({ status: "profile-required", message: getNicknameValidationMessage(nickname), messageType: "error" });
    return;
  }

  const availability = await checkNicknameAvailability(nickname);

  if (!availability.ok || !availability.available) {
    store.set({
      status: "profile-required",
      message: availability.message,
      messageType: "error",
    });
    return;
  }

  store.set({ status: "profile-required", isSubmitting: true, message: "프로필 생성 중...", messageType: "info" });
  const result = await createMyProfile(nickname);

  if (!result.ok) {
    store.set({ status: "profile-required", isSubmitting: false, message: result.message, messageType: "error" });
    return;
  }

  store.set({
    status: "signed-in",
    isSubmitting: false,
    profile: result.profile,
    message: "",
    messageType: "info",
  });
}

async function handleResetRequestSubmit(event) {
  event.preventDefault();

  const formData = new FormData(event.currentTarget);
  const email = String(formData.get("email")).trim();

  if (!validateEmail(email)) {
    store.set({
      status: "signed-out",
      authMode: "reset-request",
      authEmail: email,
      message: "이메일 형식을 확인해주세요.",
      messageType: "error",
    });
    return;
  }

  store.set({
    status: "signed-out",
    authMode: "reset-request",
    authEmail: email,
    isSubmitting: true,
    message: "재설정 메일 발송 중...",
    messageType: "info",
  });

  const result = await requestPasswordReset(email);

  store.set({
    status: "signed-out",
    authMode: "reset-request",
    authEmail: email,
    isSubmitting: false,
    message: result.message,
    messageType: result.ok ? "info" : "error",
  });
}

async function handleResetUpdateSubmit(event) {
  event.preventDefault();

  const formData = new FormData(event.currentTarget);
  const password = String(formData.get("password"));
  const passwordConfirm = String(formData.get("passwordConfirm"));

  if (!validatePassword(password)) {
    store.set({
      status: "signed-out",
      authMode: "reset-update",
      message: "비밀번호는 8자 이상이어야 합니다.",
      messageType: "error",
    });
    return;
  }

  if (password !== passwordConfirm) {
    store.set({
      status: "signed-out",
      authMode: "reset-update",
      message: "비밀번호가 일치하지 않습니다.",
      messageType: "error",
    });
    return;
  }

  store.set({
    status: "signed-out",
    authMode: "reset-update",
    isSubmitting: true,
    message: "비밀번호 변경 중...",
    messageType: "info",
  });

  const result = await updatePassword(password);
  await signOut();
  history.replaceState(null, "", "/");

  store.set({
    status: "signed-out",
    authMode: "signin",
    isSubmitting: false,
    session: null,
    profile: null,
    recoveryEmail: "",
    message: result.message,
    messageType: result.ok ? "info" : "error",
  });
}

function renderMessage(state) {
  const typeClass = state.messageType === "error" || state.status === "error" ? "is-error" : "";
  return `<p class="auth-message ${typeClass}" role="status">${escapeHtml(state.message)}</p>`;
}

function getCurrentEmailValue() {
  return document.querySelector("#emailInput")?.value.trim()
    ?? document.querySelector("#resetEmailInput")?.value.trim()
    ?? "";
}

function handleNicknameInput(event) {
  const nickname = event.currentTarget.value.trim();
  const hint = document.getElementById("nicknameHint");

  window.clearTimeout(nicknameCheckTimer);

  if (!hint) return;

  if (!nickname) {
    setNicknameHint("", "");
    return;
  }

  if (!validateNickname(nickname)) {
    setNicknameHint(getNicknameValidationMessage(nickname), "is-error");
    return;
  }

  const requestId = ++nicknameCheckRequestId;
  setNicknameHint("닉네임 확인 중...", "");

  nicknameCheckTimer = window.setTimeout(async () => {
    const result = await checkNicknameAvailability(nickname);

    if (requestId !== nicknameCheckRequestId) return;

    setNicknameHint(result.message, result.ok && result.available ? "is-ok" : "is-error");
  }, 350);
}

function setNicknameHint(message, className) {
  const hint = document.getElementById("nicknameHint");

  if (!hint) return;

  hint.textContent = message;
  hint.className = className ? `field-hint ${className}` : "field-hint";
}
