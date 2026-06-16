import { escapeHtml } from "../../shared/escapeHtml.js";

export function renderShell(state) {
  const nickname = state.profile?.nickname ?? "UNKNOWN";
  const email = state.session?.user?.email ?? "-";

  return `
    <div class="crt-overlay" aria-hidden="true"></div>
    <main class="app-shell">
      <aside class="rail" aria-label="주요 메뉴">
        <div class="rail-brand">
          <span>TOWER://</span>
          <strong>ONLINE</strong>
        </div>
        <nav class="nav-list" aria-label="게임 화면">
          <button class="nav-item is-active" type="button">대시보드</button>
          <button class="nav-item" type="button" disabled>사냥</button>
          <button class="nav-item" type="button" disabled>탑</button>
          <button class="nav-item" type="button" disabled>캐릭터</button>
          <button class="nav-item" type="button" disabled>장비</button>
          <button class="nav-item" type="button" disabled>정수</button>
        </nav>
      </aside>

      <section class="workspace">
        <header class="topbar">
          <div>
            <span class="eyebrow">SESSION</span>
            <strong>${escapeHtml(nickname)}</strong>
          </div>
          <button class="btn ghost" type="button" data-action="sign-out">로그아웃</button>
        </header>

        <section class="content-grid">
          <article class="panel">
            <div class="panel-head">
              <span>DASHBOARD</span>
              <h2>접속 완료</h2>
            </div>
            <div class="kv-grid">
              ${renderKv("닉네임", nickname)}
              ${renderKv("계정", email)}
              ${renderKv("다음 구현", "캐릭터 생성")}
            </div>
          </article>

          <article class="panel log-panel">
            <div class="panel-head compact">
              <span>LIVE LOG</span>
              <h2>시스템 로그</h2>
            </div>
            <ol class="log-list">
              <li><time>AUTH</time>계정 세션을 확인했습니다.</li>
              <li><time>PROFILE</time>프로필 데이터를 불러왔습니다.</li>
            </ol>
          </article>
        </section>
      </section>
    </main>
  `;
}

function renderKv(label, value) {
  return `
    <div class="kv">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(value)}</strong>
    </div>
  `;
}
