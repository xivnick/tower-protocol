# TOWER:// — 디자인 명세서 (Design Specification)

> **이 문서를 읽는 코딩 에이전트에게:**
> 이 문서는 `TOWER://` 라는 웹 기반 자동사냥 RPG의 UI 명세입니다.
> 추측하지 말고 적힌 값을 **그대로** 사용하세요. 모든 색상은 CSS 변수로만 쓰고 하드코딩하지 마세요. 모든 텍스트는 **한국어**입니다.
> "이렇게 하지 마라(❌)"는 디자인을 망치는 흔한 실수이니 반드시 피하세요.

> ## ⚠️ 가장 중요한 구분 — 먼저 읽으세요
>
> 이 문서는 두 부분으로 나뉩니다. **둘을 절대 헷갈리지 마세요.**
>
> | | **PART A · 디자인 시스템** | **PART B · 페이지 구조** |
> |---|---|---|
> | 성격 | **불변 (CANONICAL)** | **변경 가능 (EXAMPLE)** |
> | 내용 | 색·타입·CRT·전투로그 색상·등급·공통 컴포넌트·모션 | 어떤 페이지가 몇 개인지, 각 페이지에 무엇을 어떻게 배치하는지 |
> | 규칙 | **항상 그대로 따른다.** 한 글자도 바꾸지 말 것 | **참고용 예시.** 요구사항에 맞게 재배치·추가·삭제 가능 |
> | 섹션 | 1 ~ 8, 10 | 9 |
>
> **핵심:** 페이지 레이아웃이 바뀌어도 **디자인 요소(PART A)는 100% 고정**입니다.
> 새 페이지를 만들든 기존 페이지를 합치든, 거기 쓰이는 버튼·패널·색·로그 스타일은 무조건 PART A의 정의를 재사용하세요. **새로 디자인하지 마세요.**
>
> 📺 **눈으로 확인:** PART A의 모든 요소는 `TOWER Design System.html`(같은 폴더)에서 실제로 렌더링됩니다. 값이 헷갈리면 그 페이지를 열어 보거나 스크린샷을 떠서 대조하세요. 레퍼런스 구현 전체는 `TOWER.html`입니다.

---

## 0. 목차

**■ PART A — 디자인 시스템 (불변)**
1. [컨셉](#1-컨셉)
2. [디자인 토큰 (색·폰트·간격)](#2-디자인-토큰)
3. [CRT 효과 · 모션 규칙 (필수)](#3-crt-효과)
4. [로고 `TOWER://`](#4-로고)
5. [전역 레이아웃(셸)](#5-전역-레이아웃)
6. [공통 컴포넌트](#6-공통-컴포넌트)
7. [전투 로그 색상 시스템 ★](#7-전투-로그-색상-시스템)
8. [등급(레어도) 색상 시스템](#8-등급-색상-시스템)

**□ PART B — 페이지 구조 (변경 가능 / 예시)**
9. [페이지별 명세](#9-페이지별-명세)
10. [키보드 단축키](#10-키보드-단축키)
11. [반응형](#11-반응형)
12. [상태 모델 & 데이터](#12-상태-모델--데이터)
13. [구현 체크리스트](#13-구현-체크리스트)

---

# ■ PART A — 디자인 시스템 (불변 · CANONICAL)

> 아래 1~8, 10번은 **절대 변하지 않는** 시각 언어입니다. 페이지가 어떻게 바뀌든 그대로 적용하세요.

---

## 1. 컨셉

**터미널/CLI 감성의 다크 RPG.** 오래된 인광(phosphor) CRT 모니터를 보는 느낌.
- 핵심 루프: **사냥(자동) → 장비/정수 강화 → 탑(수동) 도전**, 랭킹은 최고 도달 층수 기준.
- 전체 인상: 검은 배경 + **인광 그린(`#39ff7a`)** 포인트 + 모노스페이스 폰트 + 스캔라인.
- 톤: 차갑고 기계적이지만 "살아있는" 느낌 (커서 깜빡임, 실시간 로그 스크롤, 미세한 플리커).

**❌ 하지 말 것:** 둥근 모서리 카드, 파스텔/그라데이션 배경, 이모지 남발, Inter/Roboto 같은 산세리프. 이건 터미널이다 — 각진 1px 보더와 모노스페이스가 기본이다.

---

## 2. 디자인 토큰

`:root`에 아래 CSS 변수를 그대로 선언하세요. **새 색을 만들지 말고 이 안에서만 쓰세요.**

```css
:root {
  /* 포인트(인광 그린) */
  --acc:#39ff7a;       /* 메인 액센트: 로고/버튼/치명타/CTA */
  --acc-2:#7affc8;     /* 액센트 밝은 변형: hover */
  --acc-dim:#1f7a45;   /* 액센트 어두운 변형: 보더/그래디언트 시작 */
  --acc-deep:#0f3d23;  /* 액센트 가장 어두움: 미묘한 보더 */

  /* 배경 (검정에 가까운 녹색 계열, 채도 매우 낮음) */
  --bg:#060a07;        /* 페이지 최하단 배경 */
  --bg-2:#0a0f0b;      /* 레일/상단바/모달 배경 */
  --surf:#0d140f;      /* 패널/카드 표면 */
  --surf-2:#121b15;    /* 한 단계 밝은 표면(메트릭, 입력) */
  --surf-3:#16221a;    /* hover 표면 */

  /* 보더/구분선 (3단계) */
  --line:#1b271f;      /* 기본 보더 */
  --line-2:#27382d;    /* 한 단계 밝은 보더 */
  --line-3:#34503f;    /* hover 보더 */

  /* 텍스트 */
  --txt:#cdd6cf;       /* 기본 본문 */
  --txt-bright:#eafff3;/* 강조 본문(제목/값) */
  --mut:#7a857d;       /* 약한 텍스트(라벨/설명) */
  --mut-2:#525c54;     /* 가장 약한 텍스트(타임스탬프/힌트) */

  /* 시맨틱 */
  --neg:#ff6b6b;       /* 피해 수치(빨강) */
  --ess:#c9a6ff;       /* 정수 관련(보라) — 액센트와 절대 섞지 말 것 */

  /* 등급 1~5 (고정, 액센트와 무관) */
  --g1:#9a988f;  /* 일반 (회색) */
  --g2:#5cd98a;  /* 고급 (녹색) */
  --g3:#4db8ff;  /* 희귀 (파랑) */
  --g4:#b06bff;  /* 영웅 (보라) */
  --g5:#ffb24d;  /* 전설 (금색) */

  /* 폰트 */
  --mono:'JetBrains Mono', ui-monospace, monospace; /* UI·본문·로그 전부 */
  --disp:'Space Mono', monospace;                   /* 로고·숫자 강조·페이지 제목 */

  /* 치수 */
  --rail:236px;   /* 좌측 내비 너비 */
  --header:60px;  /* 상단바 높이 */
}
```

**폰트 로딩** (Google Fonts):
```html
<link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700;800&family=Space+Mono:wght@400;700&display=swap" rel="stylesheet">
```

**전역 body 규칙 (중요):**
```css
body {
  background:var(--bg); color:var(--txt);
  font-family:var(--mono); font-size:14px; line-height:1.5;
  overflow:hidden;          /* 앱 셸이 화면을 꽉 채우고, 스크롤은 내부에서만 */
  word-break:keep-all;      /* ★한국어 필수★ 단어(어절) 중간에서 줄바꿈 금지 */
}
::selection { background:var(--acc); color:var(--bg); }
```

> **❗ `word-break:keep-all` 은 반드시 넣으세요.** 없으면 "사냥 현황" 같은 한글이 "사냥 현/황"으로 글자 중간에서 잘립니다. 이게 가장 흔한 한글 UI 버그입니다.

**기본 간격 규칙:** 패딩은 보통 `14px`(패널), `10~16px`(버튼/행). 카드 사이 `gap`은 `14px`. **모서리는 각지게(border-radius 0)** — 둥근 모서리 쓰지 마세요. 정렬은 항상 `display:flex`/`grid` + `gap`을 쓰고, inline 요소 + margin 으로 간격 만들지 마세요.

---

## 3. CRT 효과

화면 전체에 **고정 오버레이**를 깝니다. 강도는 "중상"(스캔라인 + 비네팅 + 미세 플리커 + 커서 깜빡임).

HTML 끝에 추가:
```html
<div id="crt"><div class="vig"></div><div class="scan"></div><div class="flick"></div></div>
```

```css
#crt { position:fixed; inset:0; pointer-events:none; z-index:9000; }

/* 스캔라인: 가로줄. overlay 블렌드로 미묘하게 */
#crt .scan { position:absolute; inset:0; mix-blend-mode:overlay; opacity:.5;
  background:repeating-linear-gradient(0deg, rgba(0,0,0,0) 0 2px, rgba(0,0,0,.6) 3px, rgba(0,0,0,0) 4px); }

/* 비네팅: 가장자리 어둡게(곡면 CRT 흉내) */
#crt .vig { position:absolute; inset:0;
  background:radial-gradient(130% 100% at 50% 38%, transparent 56%, rgba(0,0,0,.6) 100%); }

/* 플리커: 7초마다 거의 안 보이게 깜빡 */
#crt .flick { position:absolute; inset:0; background:var(--acc); opacity:0; mix-blend-mode:overlay;
  animation:crt-flick 7s steps(40) infinite; }
@keyframes crt-flick { 0%,92%,100%{opacity:0} 93%{opacity:.018} 95%{opacity:.008} 97%{opacity:.02} }

/* 커서 깜빡임 유틸 */
.blink { animation:tw-blink 1.05s steps(1) infinite; }
@keyframes tw-blink { 50%{opacity:0} }

/* 접근성: 모션 줄이기 설정 시 애니메이션 끔 */
@media (prefers-reduced-motion: reduce){ #crt .flick{animation:none} .blink,.pulse{animation:none!important} }
```

**글로우 유틸** (로고·치명타·주요 버튼에 사용):
```css
.glow { text-shadow:0 0 6px color-mix(in oklch, var(--acc) 55%, transparent),
                    0 0 16px color-mix(in oklch, var(--acc) 28%, transparent); }
```

> **❗ 모션 규칙 (중요 — 콘텐츠가 절대 안 보이는 상태가 되면 안 됨):**
> 진입 애니메이션은 **반드시 보이는 상태가 기본값**이어야 합니다. 그래서 항상 켜져 있는 콘텐츠(`.page`, 로그 줄 `.ln`)의 키프레임은 **`opacity`를 건드리지 말고 `transform`만** 움직이세요(예: `translateY(7px) → 0`). 이렇게 하면 애니메이션이 실행되지 않는 환경(프린트/PDF/백그라운드 탭/캡처)에서도 내용이 그대로 보입니다.
> - ❌ `@keyframes { from{opacity:0} }` + `fill-mode:both` → 애니메이션이 안 돌면 화면이 **빈칸**으로 굳습니다. 금지.
> - ✅ `transform`만 애니메이션, `opacity`는 항상 1. 모달/토스트처럼 사용자 액션으로만 뜨는 요소는 opacity 페이드 OK.
> - `@media (prefers-reduced-motion: reduce)` 에서는 모든 진입 애니메이션을 끄세요(즉시 표시). 커서 깜빡임/플리커도 정지.
> - 콘텐츠에 **무한 반복 장식 애니메이션 금지** (커서 `.blink`, CRT 플리커, 상태점 `.dot` 깜빡임만 예외).

---

## 4. 로고

문자열은 항상 정확히 `TOWER://` + 깜빡이는 **블록 커서**.

- `TOWER` → `--disp`(Space Mono) **700**, 색 `--acc`, `.glow` 적용.
- `://` → 색 `--mut`(글로우 없음). URL 스킴처럼 읽히게.
- 커서 → `--acc` 채워진 사각 블록, `box-shadow:0 0 8~10px var(--acc)`, `.blink`.

```html
<div class="rail-logo glow">TOWER<span class="sl">://</span><span class="cur blink"></span></div>
```
```css
.rail-logo { font-family:var(--disp); font-weight:700; font-size:22px; letter-spacing:.5px; color:var(--acc); }
.rail-logo .sl { color:var(--mut); }
.rail-logo .cur { display:inline-block; width:10px; height:18px; background:var(--acc);
  margin-left:4px; transform:translateY(2px); box-shadow:0 0 8px var(--acc); }
```
- 인증 화면에서는 같은 구조로 **크게**: 폰트 40px, 커서 14×30px.
- 로고 클릭 → 대시보드로 이동.

---

## 5. 전역 레이아웃

데스크탑은 **2열 그리드**: 좌측 고정 내비 레일 + 우측 메인.

```css
#app { display:grid; grid-template-columns:var(--rail) 1fr; grid-template-rows:100vh; height:100vh; }
```

메인 영역은 세로 플렉스: `상단바(고정) → 콘텐츠(스크롤) → 힌트 바(고정)`.
```css
.main { display:flex; flex-direction:column; overflow:hidden; min-width:0; }
.content { flex:1; overflow-y:auto; padding:26px 28px 40px; }
.page { max-width:1180px; margin:0 auto; animation:page-in .22s ease both; }
@keyframes page-in { from{opacity:0; transform:translateY(6px)} to{opacity:1; transform:none} }
```

### 5.1 좌측 레일 (`.rail`)
- 배경 `--bg-2`, 우측 1px `--line` 보더, 세로 패딩 18px.
- 위에서부터: **로고 → 내비 항목 7개 → 하단 상태 푸터**.
- 내비 항목: `[아이콘] [라벨] [단축키 숫자]` 한 줄.
  - 기본: 색 `--mut`. hover: 색 `--txt` + 배경 `--surf`.
  - 활성(`.on`): 색 `--acc`, 배경 `색 8% 틴트`, 좌측에 글로우 바(`::before`, 2px, `--acc`).
  - 숫자 키캡: 작은 박스(`.kc`).
- 내비 7항목(순서 = 단축키 1~7):

  | 키 | 라벨 | 아이콘(글리프) | page id |
  |----|------|------|---------|
  | 1 | 대시보드 | `▣` | `dashboard` |
  | 2 | 사냥 | `⚔` | `hunting` |
  | 3 | 탑 | `▲` | `tower` |
  | 4 | 캐릭터 | `◉` | `character` |
  | 5 | 장비 | `◆` | `equipment` |
  | 6 | 정수 | `◈` | `essence` |
  | 7 | 랭킹 | `≡` | `ranking` |

  > 아이콘은 위 **유니코드 글리프**로 충분합니다. SVG 아이콘을 직접 그리지 마세요.

- 하단 푸터: `● 자동사냥 진행 중 / 사냥 정지` + `Tab 섹션이동 · Esc 닫기` (작은 `--mut-2` 텍스트).

### 5.2 상단바 (`.topbar`, 높이 60px)
- 좌측: 빵부스러기 `TOWER://<현재페이지>` (`//`는 `--acc`).
- 우측: 캐릭터 요약 스탯 묶음(`Lv`, `HP` 미니 바, `◆ 골드`, `탑 NF`). 모바일에선 `Lv`/`탑`은 숨김.
- 배경 `linear-gradient(180deg,var(--bg-2),var(--bg))`, 하단 1px 보더.

### 5.3 힌트 바 (`.hints`, 콘텐츠 하단 고정)
- 키보드 힌트: `1–7 페이지`, `Tab 섹션 전환`, `Esc 뒤로/모달 닫기`, 우측 끝에 `◉ 자동사냥 LIVE / ○ 사냥 정지`.
- 키 표기는 `<b>` 작은 보더 박스.

---

## 6. 공통 컴포넌트

모든 컴포넌트는 **각진 1px 보더 + 어두운 표면**이 기본형. 아래 스펙대로 클래스를 만드세요.

### 6.1 패널 `.panel`
카드의 기본 단위. 헤더(선택) + 바디.
```
구조: .panel > [.panel-h] + .panel-b
.panel    { border:1px solid var(--line); background:var(--surf); }
.panel-h  { 패딩 11×14, 하단 보더, 폰트 11px, 색 --mut, letter-spacing .5px }
.panel-h .ttl { 색 --txt, weight 500, white-space:nowrap }
.panel-h .rt  { margin-left:auto (우측 정렬 요소) }
.panel-b  { 패딩 14 }
.dot      { 7px 원, 배경 --acc, box-shadow 글로우 — 헤더 좌측 상태점. live면 .blink }
```

### 6.2 버튼 `.btn`
```
기본:    border 1px --line-2, 배경 --surf-2, 색 --txt, 패딩 10×16, 12.5px, weight 500
hover:   border --line-3, 배경 --surf-3, 색 --txt-bright
.btn-primary : 배경 --acc, 색 #04140a(거의 검정), weight 700, 글로우 그림자. hover 시 --acc-2
.btn-ghost   : 투명 배경, 색 --acc, border --acc-deep
.btn-danger  : 색 --neg, 어두운 빨강 배경/보더 (정지/위험 동작)
.btn-sm      : 패딩 6×11, 11px
.btn-block   : width 100%
:disabled    : opacity .4, cursor not-allowed
```
버튼 안에 단축키 표기 `.kc`(작은 보더 박스) 넣을 수 있음.

### 6.3 진행 바 `.bar`
```css
.bar { height:8px; background:#101813; border:1px solid var(--line); position:relative; overflow:hidden; }
.bar > i { position:absolute; inset:0; transform-origin:left; transition:width .4s ease;
           background:linear-gradient(90deg,var(--acc-dim),var(--acc)); box-shadow:0 0 8px ...; }
```
변형: `.hp`(녹색), `.exp`(파랑 `#37e0ff` 그래디언트), `.ess`(보라 `--ess` 그래디언트), `.lg`(높이 12px).
채움은 자식 `<i style="width:NN%">`로.

### 6.4 메트릭 `.metric` (큰 숫자 지표)
```
.metric  { border 1px --line, 배경 --surf-2, 패딩 13×15, min-width:116px }
.lab     { 10px, letter-spacing 1.5px, 대문자, 색 --mut, nowrap+ellipsis }
.big     { --disp 폰트, 26px, 색 --txt-bright (또는 .acc 면 --acc) }
.sub     { 11px, 색 --mut }
```
예: 라벨 "누적 골드" / big "148,230" / sub "G".

### 6.5 KV 행 `.kv` (라벨—값 한 줄)
```
.kv   { display:flex; justify-content:space-between; padding:7px 0; border-bottom:1px dashed var(--line); }
.kv .k{ 색 --mut, 12px, nowrap }   .kv .v{ 색 --txt-bright, 13px, nowrap }
```

### 6.6 탭 `.tabs` / `.tab`
페이지 내부 서브섹션 전환용(하단 보더 라인 스타일).
```
.tab     { 패딩 9×16, 색 --mut, 12.5px, 하단 2px 투명 보더, nowrap }
.tab.on  { 색 --acc, 하단 보더 --acc }
.tab:hover{ 색 --txt }
```

### 6.7 리스트 행 `.row` (사냥터/층/인벤토리)
```
.row        { display:flex; align-items:center; gap:14px; 패딩 13×15; border 1px --line; 배경 --surf; cursor:pointer; }
.row:hover  { border --line-3; 배경 --surf-2 }
.row.sel    { border --acc-dim; 배경 액센트 7% 틴트 }
.row.locked { opacity .45; cursor default; hover 무효 }
```

### 6.8 태그/뱃지 `.tag`
작은 라벨 칩. `nowrap` 필수.
```
.tag      { 9.5px, letter-spacing 1px, 대문자, 패딩 2×7, border 1px --acc-deep, 색 --acc }
.tag.rec  { 추천: 액센트 12% 배경 }
.tag.boss { 보스: 색 --g5, 어두운 금색 배경/보더 }
.tag.dim  { 비활성: 색 --mut, border --line-2 }
```

### 6.9 슬롯 `.slot` (장비/정수 칸)
```
.slot       { border 1px --line-2; 배경 --surf-2; aspect-ratio:1; flex column center; cursor:pointer; position:relative }
.slot.filled{ border-color:currentColor (등급색을 color로 지정) }
.slot.empty { border 점선; 색 --mut-2 }
.slot.drag-ok { border --acc + inset 글로우 (드롭 가능 상태) }
.slot .type { 좌상단 8px 라벨 "ACTIVE/PASSIVE/무기..." }
.slot .cd   { 우상단 9px, 색 --ess (정수 쿨타임) }
.slot .ico  { 20px 글리프(◈ 등) }   .slot .nm { 10px 이름 }
```

### 6.10 모달 `.scrim` + `.modal`
```
.scrim { position:fixed inset:0; 배경 rgba(2,5,3,.78); z-index:8000; flex center; }
.modal { max-width:560px; border 1px --line-3; 배경 --bg-2; 진입 애니메이션(아래에서 떠오름) }
.modal-h { 패딩 14×18, 하단 보더; .ttl(--disp 15px --txt-bright); .x(우측 "ESC ✕" 닫기) }
.modal-b { 패딩 18 }
```
**Esc로 닫혀야 함** (모달이 keydown capture로 자체 처리).

### 6.11 토스트 `#toasts` / `.toast`
우하단 누적. 2.6초 후 자동 소멸.
```
.toast { border 1px --acc-deep; 배경 --bg-2; 패딩 10×14; 12px; 좌측에 3px 글로우 바(.b); 우측 슬라이드 인 }
```

### 6.12 기타 유틸
- `.eyebrow` : 페이지 상단 작은 라벨 "// DASHBOARD" (10.5px, letter-spacing 2.5px, 대문자, --mut, nowrap).
- `.h-title` : 페이지 제목 (--disp 24px --txt-bright). `.h-sub` 설명(--mut 12.5px).
- `.section-row` : 제목 영역과 우측 액션을 양끝 정렬.
- `.pip` : 6px 액센트 사각 + 글로우 (목록 불릿). 등급색으로도 사용.
- `.legend` : 색상 범례(작은 `i` 색칩 + 라벨), `nowrap`.
- `.muted-box` : 점선 보더 빈 상태 안내 박스.
- `.divider` : 1px `--line` 가로 구분선.

---

## 7. 전투 로그 색상 시스템

게임의 심장. **터미널 구조(타임스탬프 + 모노스페이스) + 미묘한 색/굵기 강조**의 하이브리드.

각 로그 줄 = `.ln`, 맨 앞에 타임스탬프 span, 이어서 내용 span들. 줄은 `nowrap + ellipsis`, 새 줄은 좌측에서 슬라이드 인. 피드는 새 줄 추가 시 자동으로 맨 아래로 스크롤.

```
.feed     { font-size:12px; line-height:1.95; padding:12px 14px; overflow-y:auto; }
.feed .ln { white-space:nowrap; overflow:hidden; text-overflow:ellipsis; animation:ln-in .18s ease both; }
@keyframes ln-in { from{opacity:0; transform:translateX(-6px)} to{opacity:1} }
```

**색상 코드 (이게 핵심 — 정확히 지키세요):**

| 종류 | 클래스 | 색 | 굵기/효과 | 접두 기호 | 예시 |
|------|--------|-----|-----------|-----------|------|
| 타임스탬프 | `.ts` | `--mut-2` | — | `[HH:MM:SS]` | `[12:04:01]` |
| 일반 공격 | `.norm` | `#9aa39d` | 보통 | 없음 | `플레이어 → 고블린 -142` |
| **치명타** | `.crit` | `--acc` | **700 + glow** | `✦ 치명타!` | `✦ 치명타! 플레이어 → 고블린 -488` |
| **정수 발동** | `.ess` | `--ess`(보라) | 보통 | `◇ 정수 발동 ·` | `◇ 정수 발동 · 화염의 숨결 -320` |
| 시스템/입장 | `.sys` | `--acc` | 보통 | `▶` | `▶ 24층 입장 — 수호자 출현` |
| 처치+보상 | `.kill` | `--txt` | 보통 | 없음 | `고블린 처치 +18 EXP +44 G` |
| 드랍 | `.drop` | `--txt` + 등급색 | — | `+ 드랍 ·` | `+ 드랍 · <희귀>단검 ×1` |
| 피해 수치 | `.neg` | `--neg`(빨강) | — | — | `-142` |
| 보상 수치 | `.num` | `--acc` | — | — | `+44 G` |
| 정보/휴식 | `.info` | `--mut` | — | — | `HP 35% 미만 — 휴식 진입` |

규칙: **액센트(녹색) = 신호**(치명타·정수 발동의 강조·시스템·보상 수치). **빨강 = 피해.** **보라 = 정수.** **드랍 아이템 이름 앞 등급 라벨은 해당 등급색.** 일반 공격은 눈에 안 띄는 회색으로 깔아주고, 중요한 이벤트만 색으로 튀게 한다.

범례(`.legend`)를 피드 위에 항상 표시: `일반 / 치명타 / 정수 / 드랍 / 처치`.

---

## 8. 등급 색상 시스템

아이템·정수 공통 **5단계 레어도**. 클래식 MMO 램프.

| 등급 | 한글 | 변수 | 색 |
|------|------|------|-----|
| 1 | 일반 | `--g1` | `#9a988f` 회색 |
| 2 | 고급 | `--g2` | `#5cd98a` 녹색 |
| 3 | 희귀 | `--g3` | `#4db8ff` 파랑 |
| 4 | 영웅 | `--g4` | `#b06bff` 보라 |
| 5 | 전설 | `--g5` | `#ffb24d` 금색 |

- 등급 뱃지 `.grade.gg{1..5}` : 보더+텍스트 모두 `currentColor`(=등급색), 한글 라벨 표시.
- 아이템/정수 이름 자체도 등급색으로 칠한다(`.gtext{1..5}`).
- 슬롯/아이콘 보더도 등급색.
- **이 색들은 액센트와 독립적**이며 어느 테마에서도 고정. (정수 보라 `--ess`는 등급4 보라와 다른 용도 — 헷갈리지 말 것.)

---

---

# □ PART B — 페이지 구조 (변경 가능 · EXAMPLE)

> **여기부터는 "예시"입니다.** 아래 페이지 구성·레이아웃은 현재 레퍼런스 구현 기준이며, 제품 요구사항에 따라 **자유롭게 재배치·추가·삭제**할 수 있습니다.
> 단, 어떤 페이지를 만들든 그 안의 색·타입·버튼·패널·전투로그·등급·모션은 반드시 **PART A**를 그대로 재사용하세요. (페이지는 변해도 디자인 요소는 불변)

## 9. 페이지별 명세

각 페이지는 `.page` 래퍼 안에 `.section-row`(eyebrow + h-title + 우측 액션)로 시작.

### 9.0 인증 (로그인/회원가입)
- 앱 진입 전 단독 풀스크린. 중앙 카드(`max-width 420px`).
- 배경: 중앙 상단 액센트 방사 글로우 + 페이드되는 격자 그리드(`40px` 라인).
- 카드 상단: 큰 로고(40px) + 태그라인 "자동사냥 RPG · 최고 층수에 도전하라".
- 탭 2개: **로그인 / 회원가입**(밑줄 활성). 회원가입이면 "비밀번호 확인" 필드 추가.
- 필드: 라벨(대문자 작은) + `.input`(어두운 배경, focus 시 액센트 보더 글로우).
- CTA: `.btn-primary.btn-block.glow` — "접속 →" / "계정 생성 →".
- 하단: 작은 안내 + `$ connect --resume-session` 같은 CLI 한 줄(분위기용).
- 제출 → 메인 앱으로 진입(인증 통과). 실제 검증 로직은 불필요(프로토타입).

### 9.1 대시보드 (`dashboard`)
허브. 한눈에 현재 상태 파악.
- 헤더: eyebrow `// dashboard`, 제목 `{캐릭터명} · Lv.NN`, 우측 **상태 뱃지**(사냥 중/사망 패널티/정지).
- **메트릭 4열**: 누적 골드 / 최고 탑 층수(+랭킹#) / 캐릭터 레벨(+EXP%) / 미분배 스탯.
- **2열 패널**:
  - 좌: "사냥 현황" — 현재 사냥터 이름(--disp 18px) + 권장레벨·G/h, HP 바, EXP 바, "이동 [2]" 버튼.
  - 우: "최근 드랍" — 최근 5개, 각 행 `[등급색 pip] 이름 [등급 뱃지]`. 없으면 muted-box.
- **빠른 이동 4칸**: 사냥[2]/탑[3]/장비[5]/정수[6] — 클릭 시 해당 페이지.

상태 뱃지 색: 사냥 중=`.tag.rec`(녹색 ●), 사망 패널티=빨강, 정지=`.tag.dim`(회색 ●).

### 9.2 사냥 (`hunting`) — 탭 2개
헤더 우측에 사냥터 선택돼 있으면 `▶ 자동사냥 시작` / `■ 자동사냥 정지` 토글 버튼(시작=primary, 정지=danger).

**탭 A · 사냥터 선택:** 사냥터 목록(`.row`).
- 각 행: `[머리글자 박스] 이름 / 권장 Lv·몬스터목록·G/h`, 우측 태그(추천/잠김/선택됨).
- 잠긴 사냥터는 `.locked`(흐리게, 클릭 불가). 추천 사냥터엔 `.tag.rec` "추천".
- 선택 시 `.sel`, 우측에 시작/정지 버튼.

**탭 B · 사냥 현황:** (사냥터 선택돼야 표시)
- 좌(넓게 1.6fr): "전투 로그 :: {사냥터}" 패널 — 범례 + **실시간 피드**(높이 ~330) + (정지 시 안내).
- 우(1fr): "상태" 패널(HP 바 + 정수 쿨타임 보라 바 + **휴식 기준 체력 % 슬라이더**) + "드랍 목록" 패널(스크롤).
- 슬라이더: `accent-color:var(--acc)`, 10~80%. "HP가 이 값 미만이면 자동 휴식 진입".

### 9.3 탑 (`tower`) — 탭 2개
- 헤더 우측: 메트릭 "최고 도달 NF" + "내 순위 #N".
- **탭 A · 층 목록:** 1~100층. **5층 단위 밴드**로 가로 배치(좌측에 "1–5" 구간 라벨 + 5칸 그리드). 전체 세로 스크롤.
  - 각 칸(`FloorCell`): 큰 층 숫자(N + 작은 F), 상태 표시.
    - 클리어: 우상단 `✓`(--acc).
    - 현재 도전 가능 층(`current`): 액센트 보더 + inset 글로우 + `NOW` 태그.
    - 잠김: 흐리게 + 🔒, 클릭 불가.
    - **보스 층(5의 배수)**: 숫자 `--g5`(금색) + `BOSS` 태그(`.tag.boss`).
    - 하단에 입장 비용 `{cost} G`.
  - 비용 공식: `cost = 200 + (floor-1)*180`.
  - 입장 가능 조건: `cleared` 이거나 `current`(=clearedFloor+1). 클릭 시 전투 모달.
  - 범례: 클리어 / 도전 가능 / 보스 / 잠김.
- **탭 B · 랭킹:** 9.7과 동일한 표.

**전투 모달 (3단계 상태머신):** `confirm → fight → result`
1. **confirm**: 입장 비용(큰 액센트 숫자), 보유 골드, 예상 보상(정수 1·업적). 보스면 금색 안내. 버튼: 취소[ESC] / 도전 시작(골드 부족 시 비활성). 시작 시 골드 차감.
2. **fight**: 범례 + **실시간 전투 피드**(높이 240, 더 어두운 배경) + 하단에 현재 장착 정수 3슬롯 미니 표시. 약 360ms 간격으로 14줄 진행(입장 줄 → 전투 줄들 → 종료).
3. **result**: 큰 `CLEAR`(--disp 28px --acc glow) + "N층 클리어 — 신기록!/재도전 완료" + 획득 패널(정수 + 업적 +1) + "보상 수령 → N+1층 해금" 버튼. 수령 시 `clearedFloor` 갱신(신기록일 때만) + 토스트.

### 9.4 캐릭터 (`character`)
- 헤더 우측: "스탯 재분배 · 5,000 G" danger 버튼.
- 좌 패널 "1차 스탯 · 7종": 각 스탯 행 `[pip] 이름/설명 ... 값 [＋버튼]`. ＋는 미분배 포인트>0일 때만 활성, 누르면 값+1·포인트-1.
  - 7종: 근력(str)/민첩(agi)/손재주(dex)/체력(vit)/인내(end)/지력(int)/지혜(wis). 각 설명 문구 포함.
- 우: "2차 스탯(계산값)" 패널(펼치기/접기 가능, 2열 KV: 물리/마법 공격력, 방어력, 치명타 확률·피해, 공격속도, 회피, 생명력 흡수 등) + "요약" 패널(레벨·HP 메트릭).
- 재분배: 골드 5,000 차감, 스탯 기본값으로 리셋, 포인트 복구, 토스트.

### 9.5 장비 (`equipment`)
- 슬롯 3종: **무기 / 방어구 / 장신구** 각 1개.
- 좌 패널 "장착 슬롯": 3칸(`.slot.filled`, 등급색 보더). 클릭으로 선택. 하단에 전투력 합산·세트 효과 KV.
- 우 2열:
  - "상세 · {부위}": 이름(등급색 --disp), 주 옵션(액센트)·부 옵션들 KV, 우측 등급 뱃지.
  - "강화": 추후 업데이트 예정. 현재 MVP에서는 노출하지 않거나 비활성 안내만 표시.

### 9.6 정수 (`essence`) — 탭 3개
- **탭 A · 슬롯 배치:** 좌 "장착 슬롯 · 3"(3칸 그리드, 액티브는 `◇Ns` 쿨타임·`ACTIVE`/`PASSIVE` 타입 표시, 클릭 시 해제) + 우 "보유 정수" 목록(드래그 또는 클릭으로 빈 슬롯에 장착, 장착된 건 흐리게).
  - 드래그&드롭: 인벤토리 항목 `draggable`, 슬롯에 `dragover→.drag-ok`, `drop` 시 장착. 클릭으로도 장착 가능(둘 다 지원).
  - 안내: "◇ 액티브 정수는 쿨타임마다 자동 발동 · 패시브는 상시 적용. 슬롯 클릭 시 해제."
- **탭 B · 정수 목록:** 필터 칩(타입: 전체/액티브/패시브, 등급: 전체/1~5) + 2열 카드. 각 카드: 아이콘 슬롯(등급색) + 이름(등급색) + 타입·계열 + 효과 설명 + 보유 수량.
- **탭 C · 합성:** "같은 정수 3개 → 한 단계 상위 등급". 합성 가능(보유≥3 & 등급<5)만 표시. 각 카드에 `[등급 뱃지] ×3 → [상위 뱃지]` + "합성" 버튼. 누르면 3개 소모·1개 상위 생성·토스트.

### 9.7 랭킹 (`ranking`)
- 최고 도달 **층수** 기준 순위표.
- 각 행: `#순위 / 닉네임 / NF / 달성일시`. 상위 3위는 순위 숫자 액센트.
- **내 순위 행은 항상 강조**(액센트 틴트 배경 + 좌측 액센트 보더 + "◀ 나" 표기). 리스트 중간(예: #42)에 있어도 보이게.

---

## 10. 키보드 단축키

전역 `keydown` 리스너(입력 필드 포커스 중이면 무시):

| 키 | 동작 |
|----|------|
| `1`~`7` | 해당 페이지로 이동(레일 순서와 동일) |
| `Tab` | `preventDefault` 후 **현재 페이지의 서브탭/섹션 순환** |
| `Esc` | 모달 닫기 / 뒤로 |

`Tab` 구현: 전역에서 커스텀 이벤트(`tw-nexttab`)를 디스패치하고, 서브탭이 있는 페이지(사냥/탑/정수)가 이를 듣고 자기 탭을 다음으로 순환. `Esc`는 모달이 capture 단계에서 자체 처리.

---

## 11. 반응형

브레이크포인트 **`max-width:860px`** = 모바일.
- `#app`을 단일 컬럼으로(`grid-template-columns:1fr`), **좌측 레일 `display:none`**.
- 대신 **하단 고정 탭바**(`.mtabbar`, 높이 62px) 노출 — 주요 5개: 대시보드/사냥/탑/정수/캐릭터(아이콘+라벨 세로).
- 콘텐츠 패딩 축소(`18px 14px 90px` — 하단 탭바 공간 확보).
- 모든 `.cols-2/3/4` → 1열(단, 슬롯 그리드처럼 `.keep-m`이 붙은 건 유지).
- 상단바 축소(높이 52px), `Lv`·`탑` 스탯 숨김, 힌트 바 숨김.
- 데스크탑 우선으로 설계하고 위 규칙으로 모바일 대응 — **레이아웃을 새로 만들지 말고** 1열로 접는 방식.

---

## 12. 상태 모델 & 데이터

전역 게임 상태(예: React 훅/스토어) 하나로 관리. 핵심 필드:

```
page            현재 페이지 id
char            { name, level, exp, expMax, gold, hp, hpMax, statPoints, restThreshold, topFloor }
stats[7]        1차 스탯 { key, name, val, desc }
ground          현재 사냥터 id   |  hunting(bool) 자동사냥 on/off  |  dead(bool)
huntLines[]     사냥 전투 로그(최대 ~80줄, 오래된 것부터 버림)
drops[]         최근 드랍 { grade, name }(최대 ~40)
essCd           정수 쿨타임 표시값(초)
inv[]           보유 정수 [{ id, name, family, type:'active|passive', grade, cd?, eff, qty }]
slots[3]        장착 정수 id 배열(빈칸 null)
equip           { weapon, armor, trinket } 각 { name, slot, grade, lvl, main, subs[] }
towerCleared    최고 클리어 층수(=현재 도전가능층 -1)
toasts[]        토스트 큐
```

**실시간 사냥 루프 (hunting && !dead 일 때, ~1100ms 간격):**
1. 전투 로그 한 줄 생성(아래 확률) → `huntLines`에 push(80줄 캡).
2. 처치 줄이면 EXP/골드 가산(레벨업 처리), 드랍 줄이면 `drops`에 push.
3. HP 변동: 평소 `-20~90`. HP가 `hpMax*restThreshold/100` 미만이면 휴식 진입. 포션 보유 시 자동으로 포션을 사용하고, 없으면 일반 휴식으로 처리한다. `RECOVERY_ACTION_SECONDS` 후 HP를 100%로 회복하고 휴식 종료.
4. `essCd`는 전투 중 시간 경과와 휴식/포션의 `RECOVERY_ACTION_SECONDS`만큼 감소, 0 이하면 8.0으로 리셋.

**사냥 로그 줄 생성 확률(누적):** 일반공격 34% / 치명타 12% / 정수발동 10% / 피격 10% / 처치+보상 16% / 드랍 12% / 정보 6%.

**예시 콘텐츠(분위기용 — 그대로 써도 됨):**
- 사냥터: 초록 숲길 전반(권장1) / 초록 숲길 후반(6) / 그늘 동굴 전반(11) / 그늘 동굴 후반(16) / 축축한 늪지 전반(21) / 축축한 늪지 후반(26). 실제 데이터 이름을 사용한다.
- 정수 예: 화염의 숨결(액티브·희귀·8s·"전방 광역 화염 320% 피해"), 정찰병의 직감(패시브·고급·"치명타 +6%"), 망령의 장막(액티브·영웅·14s·"4초간 피해 40% 감소"), 고대의 봉인(액티브·전설·22s·"6초 무적+반사 60%") 등.
- 캐릭터 기본: Lv.23, EXP 6240/9800, 골드 148,230, HP 1840/2710, 미분배 5P, 최고층 23.

---

## 13. 구현 체크리스트

코딩 후 아래를 **전부** 확인하세요:

- [ ] `:root` 토큰을 그대로 선언했고, 색은 변수로만 사용(하드코딩 금지).
- [ ] `word-break:keep-all` 적용 — 한글이 어절 중간에서 안 잘림.
- [ ] 폰트 2종 로드: UI/로그=JetBrains Mono, 로고/숫자강조/제목=Space Mono.
- [ ] CRT 오버레이(스캔라인+비네팅+플리커) + 로고 커서 깜빡임 동작.
- [ ] 모서리 **각짐**(border-radius 0). 둥근 카드·그라데이션 배경·이모지 없음.
- [ ] 좌측 레일 7항목 + 단축키 1~7 + 활성 글로우 바.
- [ ] 전투 로그 색상 코드 정확(치명=녹색 glow, 정수=보라, 피해=빨강, 보상=녹색, 일반=회색).
- [ ] 등급 5색(회·녹·청·보·금)이 아이템/정수/슬롯 보더에 일관 적용.
- [ ] 키보드: 1~7 이동 / Tab 서브탭 순환 / Esc 모달 닫기.
- [ ] 사냥 실시간 피드가 흐르고 골드·EXP·HP·드랍이 변동, 새 줄에서 자동 하단 스크롤.
- [ ] 탑 전투 모달 confirm→fight→result 3단계 + "N+1층 해금".
- [ ] 정수 슬롯 드래그/클릭 장착·해제, 합성 3→1 상위 등급.
- [ ] 모바일(≤860px): 레일 숨김 + 하단 탭바, 모든 그리드 1열.
- [ ] 진입/로그 애니메이션은 보이는 최종 상태가 기본 — 캡처/프린트에서 빈 화면 안 됨.

> **레퍼런스 구현:** 동일 디렉터리의 `TOWER.html`(+ `tower-styles.css`, `tower-*.jsx`)이 이 명세의 정답 구현입니다. 값이 헷갈리면 그 파일을 보세요.
