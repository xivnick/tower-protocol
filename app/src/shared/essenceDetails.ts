export type EssenceDetailSource = {
  code?: string;
  name?: string;
  grade: number;
};

export const ESSENCE_DETAILS: Record<string, { summary: string; effects: string[] }> = {
  "artificial-strike": { summary: "즉시 물리 피해", effects: ["CD 8.0초 · 물리 공격력 50% 피해", "CD 5.0초 · 물리 공격력 65% 피해", "CD 5.0초 · 물리 공격력 100% 피해", "CD 4.0초 · 물리 공격력 120% 피해 · 적중 후 3초간 물리 공격력 +5%", "CD 4.0초 · 물리 공격력 145% 피해 · 적중 후 3초간 물리 공격력 +8%"] },
  "artificial-might": { summary: "물리 공격력 보정", effects: ["패시브 · 물리 공격력 +2%", "패시브 · 물리 공격력 +4%", "패시브 · 물리 공격력 +6%", "패시브 · 물리 공격력 +7% · 일반 공격 피해 +3%", "패시브 · 물리 공격력 +8% · 일반 공격 피해 +5%"] },
  "artificial-bolt": { summary: "즉시 마법 피해", effects: ["CD 8.0초 · 마법 공격력 50% 피해", "CD 5.0초 · 마법 공격력 65% 피해", "CD 5.0초 · 마법 공격력 100% 피해", "CD 4.0초 · 마법 공격력 120% 피해 · 적중 후 3초간 마법 공격력 +5%", "CD 4.0초 · 마법 공격력 145% 피해 · 적중 후 3초간 마법 공격력 +8%"] },
  "artificial-knowledge": { summary: "마법 공격력 보정", effects: ["패시브 · 마법 공격력 +2%", "패시브 · 마법 공격력 +4%", "패시브 · 마법 공격력 +6%", "패시브 · 마법 공격력 +7%", "패시브 · 마법 공격력 +8%"] },
  "artificial-armor": { summary: "방어력 보정", effects: ["패시브 · 방어력 +3%", "패시브 · 방어력 +6%", "패시브 · 방어력 +9%", "패시브 · 방어력 +10%", "패시브 · 방어력 +12%"] },
  "artificial-guard": { summary: "공격 적중 보호막", effects: ["CD 9.0초 · 4초 동안 공격 적중 시 최대 HP 0.20% 보호막 · 최대 10회", "CD 5.5초 · 4초 동안 공격 적중 시 최대 HP 0.25% 보호막 · 최대 10회", "CD 5.5초 · 4초 동안 공격 적중 시 최대 HP 0.40% 보호막 · 최대 10회", "CD 4.5초 · 4초 동안 공격 적중 시 최대 HP 0.45% 보호막 · 최대 10회", "CD 4.5초 · 5초 동안 공격 적중 시 최대 HP 0.55% 보호막 · 최대 10회"] },
  "artificial-life": { summary: "최대 HP 보정", effects: ["패시브 · 최대 HP +2%", "패시브 · 최대 HP +4%", "패시브 · 최대 HP +6%", "패시브 · 최대 HP +7%", "패시브 · 최대 HP +8%"] },
  "artificial-focus": { summary: "명중 보정", effects: ["CD 10.0초 · 4초 동안 명중 +5%", "CD 6.0초 · 4초 동안 명중 +7%", "CD 6.0초 · 5초 동안 명중 +11%", "CD 5.0초 · 5초 동안 명중 +13% · 치명타 확률 +3%", "CD 5.0초 · 6초 동안 명중 +16% · 치명타 확률 +5%"] },
  "artificial-critical": { summary: "치명타 피해 보정", effects: ["패시브 · 치명타 피해 +4%", "패시브 · 치명타 피해 +8%", "패시브 · 치명타 피해 +12%", "패시브 · 치명타 피해 +14% · 치명타 확률 +2%", "패시브 · 치명타 피해 +16% · 치명타 확률 +3%"] },
  "artificial-pierce": { summary: "일반 공격 관통", effects: ["패시브 · 일반 공격 3% 확률로 방어 무시", "패시브 · 일반 공격 6% 확률로 방어 무시", "패시브 · 일반 공격 9% 확률로 방어 무시", "패시브 · 일반 공격 10% 확률로 방어 무시 · 발동 피해 +5%", "패시브 · 일반 공격 12% 확률로 방어 무시 · 발동 피해 +8%"] },
  "angry-boar-might": { summary: "다음 일반 공격 강화", effects: ["CD 8.0초 · 다음 일반 공격 피해 +60%", "CD 4.5초 · 다음 일반 공격 피해 +90%", "CD 4.5초 · 다음 일반 공격 피해 +180%", "CD 3.5초 · 다음 일반 공격 피해 +220%", "CD 3.2초 · 다음 일반 공격 피해 +260%"] },
  "forest-wolf-flurry": { summary: "일반 공격 추가타", effects: ["CD 9.0초 · 4초 동안 일반 공격 시 30% 추가타", "CD 5.0초 · 4초 동안 일반 공격 시 40% 추가타", "CD 5.0초 · 4초 동안 일반 공격 시 80% 추가타", "CD 4.0초 · 4초 동안 일반 공격 시 95% 추가타", "CD 4.0초 · 5초 동안 일반 공격 시 110% 추가타"] },
  "firefly-spirit-ember": { summary: "즉시 마법 피해", effects: ["CD 5.0초 · 마법 공격력 60% 피해", "CD 2.5초 · 마법 공격력 80% 피해", "CD 2.5초 · 마법 공격력 160% 피해", "CD 2.0초 · 마법 공격력 180% 피해", "CD 2.0초 · 마법 공격력 220% 피해"] },
  "stone-beetle-stonehide": { summary: "방어막", effects: ["CD 9.0초 · 4초 동안 최대 HP 8% 방어막", "CD 5.0초 · 4초 동안 최대 HP 10% 방어막", "CD 5.0초 · 4초 동안 최대 HP 20% 방어막", "CD 4.0초 · 4초 동안 최대 HP 24% 방어막", "CD 4.0초 · 5초 동안 최대 HP 28% 방어막"] },
  "forest-warden-stag-charge": { summary: "돌진 및 잃은 HP 회복", effects: ["CD 8.0초 · 물리 공격력 100% 피해 · 잃은 HP 5% 회복", "CD 5.0초 · 물리 공격력 130% 피해 · 잃은 HP 7% 회복", "CD 5.0초 · 물리 공격력 220% 피해 · 잃은 HP 10% 회복", "CD 4.0초 · 물리 공격력 260% 피해 · 잃은 HP 12% 회복", "CD 4.0초 · 물리 공격력 320% 피해 · 잃은 HP 14% 회복"] },
  "green-viper-fang": { summary: "독/지속 피해", effects: ["CD 7.0초 · 물리 50% 피해 · 4초 독 · 독 초당 마법 20%", "CD 4.5초 · 물리 60% 피해 · 4초 독 · 독 초당 마법 25%", "CD 4.5초 · 물리 90% 피해 · 5초 독 · 독 초당 마법 45%", "CD 3.8초 · 물리 110% 피해 · 5초 독 · 독 초당 마법 55% · 독 대상 피해 +8%", "CD 3.8초 · 물리 130% 피해 · 6초 독 · 독 초당 마법 65% · 독 대상 피해 +12%"] },
  "vine-hunter-bind": { summary: "마법 속박", effects: ["CD 8.0초 · 마법 공격력 60% 피해", "CD 5.0초 · 마법 공격력 80% 피해", "CD 5.0초 · 마법 공격력 140% 피해", "CD 4.0초 · 마법 공격력 170% 피해", "CD 4.0초 · 마법 공격력 210% 피해"] },
  "moss-slime-regeneration": { summary: "잃은 HP 재생", effects: ["패시브 · 매초 잃은 HP 2% 회복", "패시브 · 매초 잃은 HP 4% 회복", "패시브 · 매초 잃은 HP 8% 회복", "패시브 · 매초 잃은 HP 10% 회복", "패시브 · 매초 잃은 HP 12% 회복"] },
  "leafshade-panther-counter": { summary: "회피 후 반격 강화", effects: ["패시브 · 회피 후 다음 일반 공격 +60%", "패시브 · 회피 후 다음 일반 공격 +120%", "패시브 · 회피 후 다음 일반 공격 +240%", "패시브 · 회피 후 다음 일반 공격 +300%", "패시브 · 회피 후 다음 일반 공격 +360%"] },
  "redthorn-beast-spines": { summary: "가시/물리 반사", effects: ["CD 8.0초 · 4초 동안 일반공격 추가피해 15% · 물리 피해 반사 15%", "CD 5.0초 · 4초 동안 일반공격 추가피해 25% · 물리 피해 반사 25%", "CD 5.0초 · 4초 동안 일반공격 추가피해 50% · 물리 피해 반사 50%", "CD 4.0초 · 4초 동안 일반공격 추가피해 60% · 물리 피해 반사 60% · 받는 물리 피해 -10%", "CD 4.0초 · 5초 동안 일반공격 추가피해 75% · 물리 피해 반사 75% · 받는 물리 피해 -15%"] },
  "blackneedle-bat-leech": { summary: "흡혈 물리 피해", effects: ["CD 7.0초 · 물리 70% 피해 · 피해의 20% 흡혈", "CD 4.5초 · 물리 90% 피해 · 피해의 25% 흡혈", "CD 4.5초 · 물리 180% 피해 · 피해의 30% 흡혈", "CD 3.8초 · 물리 220% 피해 · 피해의 35% 흡혈", "CD 3.8초 · 물리 260% 피해 · 피해의 40% 흡혈"] },
  "bigeye-bat-night-sight": { summary: "명중률 보정", effects: ["패시브 · 명중률 +5%", "패시브 · 명중률 +10%", "패시브 · 명중률 +18%", "패시브 · 명중률 +22%", "패시브 · 명중률 +28%"] },
  "blade-beetle-edge": { summary: "일반 공격 출혈", effects: ["CD 8.0초 · 5초 동안 출혈 15%", "CD 5.0초 · 5초 동안 출혈 25%", "CD 5.0초 · 5초 동안 출혈 45%", "CD 4.0초 · 5초 동안 출혈 55%", "CD 4.0초 · 6초 동안 출혈 65%"] },
  "crystal-lizard-refraction": { summary: "마법 추가 피해", effects: ["CD 8.0초 · 4초 동안 마법 추가 피해 15%", "CD 5.0초 · 4초 동안 마법 추가 피해 25%", "CD 5.0초 · 4초 동안 마법 추가 피해 50%", "CD 4.0초 · 4초 동안 마법 추가 피해 60%", "CD 4.0초 · 5초 동안 마법 추가 피해 75%"] },
  "crystaljaw-centipede-crush": { summary: "방어막 파쇄", effects: ["CD 8.0초 · 물리 공격력 100% 피해", "CD 5.0초 · 물리 공격력 130% 피해", "CD 5.0초 · 물리 공격력 240% 피해", "CD 4.0초 · 물리 공격력 280% 피해", "CD 4.0초 · 물리 공격력 340% 피해"] },
  "cave-vampire-bat-bloodcry": { summary: "흡혈 물리 피해", effects: ["CD 8.0초 · 물리 80% 피해 · 피해의 15% 흡혈", "CD 5.0초 · 물리 100% 피해 · 피해의 20% 흡혈", "CD 5.0초 · 물리 190% 피해 · 피해의 25% 흡혈", "CD 4.0초 · 물리 230% 피해 · 피해의 30% 흡혈", "CD 4.0초 · 물리 280% 피해 · 피해의 35% 흡혈"] },
};

const ESSENCE_NAME_CODES: Record<string, keyof typeof ESSENCE_DETAILS> = {
  "인공 정수: 강타": "artificial-strike",
  "인공 정수: 완력": "artificial-might",
  "인공 정수: 마탄": "artificial-bolt",
  "인공 정수: 지식": "artificial-knowledge",
  "인공 정수: 철갑": "artificial-armor",
  "인공 정수: 수호": "artificial-guard",
  "인공 정수: 생명": "artificial-life",
  "인공 정수: 집중": "artificial-focus",
  "인공 정수: 치명": "artificial-critical",
  "인공 정수: 관통": "artificial-pierce",
};

function getEssenceDetail(essence: EssenceDetailSource) {
  const code = essence.code?.trim();
  if (code && ESSENCE_DETAILS[code]) return ESSENCE_DETAILS[code];
  const nameCode = essence.name ? ESSENCE_NAME_CODES[essence.name.trim()] : undefined;
  return nameCode ? ESSENCE_DETAILS[nameCode] : undefined;
}

export function getEssenceSummary(essence: EssenceDetailSource) {
  return getEssenceDetail(essence)?.summary ?? "정수 효과";
}

export function getEssenceEffect(essence: EssenceDetailSource) {
  const detail = getEssenceDetail(essence);
  if (!detail) return "정수 효과를 전투 중 자동 사용합니다.";
  const gradeIndex = Math.max(0, Math.min(detail.effects.length - 1, Math.trunc(essence.grade) - 1));
  return detail.effects[gradeIndex];
}
