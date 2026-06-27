export type EssenceDetailSource = {
  code: string;
  grade: number;
};

export const ESSENCE_DETAILS: Record<string, { summary: string; effects: string[] }> = {
  "angry-boar-might": { summary: "다음 일반 공격 강화", effects: ["CD 8.0초 · 다음 일반 공격 피해 +60%", "CD 4.5초 · 다음 일반 공격 피해 +90%", "CD 4.5초 · 다음 일반 공격 피해 +180%", "CD 3.5초 · 다음 일반 공격 피해 +220%", "CD 3.2초 · 다음 일반 공격 피해 +260%"] },
  "forest-wolf-flurry": { summary: "일반 공격 추가타", effects: ["CD 9.0초 · 4초 동안 일반 공격 시 30% 추가타", "CD 5.0초 · 4초 동안 일반 공격 시 40% 추가타", "CD 5.0초 · 4초 동안 일반 공격 시 80% 추가타", "CD 4.0초 · 4초 동안 일반 공격 시 95% 추가타", "CD 4.0초 · 5초 동안 일반 공격 시 110% 추가타"] },
  "firefly-spirit-ember": { summary: "즉시 마법 피해", effects: ["CD 5.0초 · 마법 공격력 60% 피해", "CD 2.5초 · 마법 공격력 80% 피해", "CD 2.5초 · 마법 공격력 160% 피해", "CD 2.0초 · 마법 공격력 180% 피해", "CD 2.0초 · 마법 공격력 220% 피해"] },
  "stone-beetle-stonehide": { summary: "방어막", effects: ["CD 9.0초 · 4초 동안 최대 HP 8% 방어막", "CD 5.0초 · 4초 동안 최대 HP 10% 방어막", "CD 5.0초 · 4초 동안 최대 HP 20% 방어막", "CD 4.0초 · 4초 동안 최대 HP 24% 방어막", "CD 4.0초 · 5초 동안 최대 HP 28% 방어막"] },
  "forest-warden-stag-charge": { summary: "돌진 및 잃은 HP 회복", effects: ["CD 8.0초 · 물리 공격력 100% 피해 · 잃은 HP 5% 회복", "CD 5.0초 · 물리 공격력 130% 피해 · 잃은 HP 7% 회복", "CD 5.0초 · 물리 공격력 220% 피해 · 잃은 HP 10% 회복", "CD 4.0초 · 물리 공격력 260% 피해 · 잃은 HP 12% 회복", "CD 4.0초 · 물리 공격력 320% 피해 · 잃은 HP 14% 회복"] },
  "green-viper-fang": { summary: "독 지속 피해", effects: ["CD 7.0초 · 물리 50% 피해 · 4초 독", "CD 4.5초 · 물리 60% 피해 · 4초 독", "CD 4.5초 · 물리 90% 피해 · 5초 독", "CD 3.8초 · 물리 110% 피해 · 5초 독", "CD 3.8초 · 물리 130% 피해 · 6초 독"] },
  "vine-hunter-bind": { summary: "마법 속박", effects: ["CD 8.0초 · 마법 공격력 60% 피해", "CD 5.0초 · 마법 공격력 80% 피해", "CD 5.0초 · 마법 공격력 140% 피해", "CD 4.0초 · 마법 공격력 170% 피해", "CD 4.0초 · 마법 공격력 210% 피해"] },
  "moss-slime-regeneration": { summary: "잃은 HP 재생", effects: ["패시브 · 매초 잃은 HP 2% 회복", "패시브 · 매초 잃은 HP 4% 회복", "패시브 · 매초 잃은 HP 8% 회복", "패시브 · 매초 잃은 HP 10% 회복", "패시브 · 매초 잃은 HP 12% 회복"] },
  "leafshade-panther-counter": { summary: "회피 후 반격 강화", effects: ["패시브 · 회피 후 다음 일반 공격 +60%", "패시브 · 회피 후 다음 일반 공격 +120%", "패시브 · 회피 후 다음 일반 공격 +240%", "패시브 · 회피 후 다음 일반 공격 +300%", "패시브 · 회피 후 다음 일반 공격 +360%"] },
  "redthorn-beast-spines": { summary: "가시 추가 피해", effects: ["CD 8.0초 · 4초 동안 가시 15%", "CD 5.0초 · 4초 동안 가시 25%", "CD 5.0초 · 4초 동안 가시 50%", "CD 4.0초 · 4초 동안 가시 60%", "CD 4.0초 · 5초 동안 가시 75%"] },
  "blackneedle-bat-leech": { summary: "흡혈 물리 피해", effects: ["CD 7.0초 · 물리 70% 피해 · 피해의 20% 흡혈", "CD 4.5초 · 물리 90% 피해 · 피해의 25% 흡혈", "CD 4.5초 · 물리 180% 피해 · 피해의 30% 흡혈", "CD 3.8초 · 물리 220% 피해 · 피해의 35% 흡혈", "CD 3.8초 · 물리 260% 피해 · 피해의 40% 흡혈"] },
  "bigeye-bat-night-sight": { summary: "명중률 보정", effects: ["패시브 · 명중률 +5%", "패시브 · 명중률 +10%", "패시브 · 명중률 +18%", "패시브 · 명중률 +22%", "패시브 · 명중률 +28%"] },
  "blade-beetle-edge": { summary: "일반 공격 출혈", effects: ["CD 8.0초 · 5초 동안 출혈 15%", "CD 5.0초 · 5초 동안 출혈 25%", "CD 5.0초 · 5초 동안 출혈 45%", "CD 4.0초 · 5초 동안 출혈 55%", "CD 4.0초 · 6초 동안 출혈 65%"] },
  "crystal-lizard-refraction": { summary: "마법 추가 피해", effects: ["CD 8.0초 · 4초 동안 마법 추가 피해 15%", "CD 5.0초 · 4초 동안 마법 추가 피해 25%", "CD 5.0초 · 4초 동안 마법 추가 피해 50%", "CD 4.0초 · 4초 동안 마법 추가 피해 60%", "CD 4.0초 · 5초 동안 마법 추가 피해 75%"] },
  "crystaljaw-centipede-crush": { summary: "방어막 파쇄", effects: ["CD 8.0초 · 물리 공격력 100% 피해", "CD 5.0초 · 물리 공격력 130% 피해", "CD 5.0초 · 물리 공격력 240% 피해", "CD 4.0초 · 물리 공격력 280% 피해", "CD 4.0초 · 물리 공격력 340% 피해"] },
  "cave-vampire-bat-bloodcry": { summary: "흡혈 물리 피해", effects: ["CD 8.0초 · 물리 80% 피해 · 피해의 15% 흡혈", "CD 5.0초 · 물리 100% 피해 · 피해의 20% 흡혈", "CD 5.0초 · 물리 190% 피해 · 피해의 25% 흡혈", "CD 4.0초 · 물리 230% 피해 · 피해의 30% 흡혈", "CD 4.0초 · 물리 280% 피해 · 피해의 35% 흡혈"] },
};

export function getEssenceSummary(essence: EssenceDetailSource) {
  return ESSENCE_DETAILS[essence.code]?.summary ?? "정수 효과";
}

export function getEssenceEffect(essence: EssenceDetailSource) {
  return ESSENCE_DETAILS[essence.code]?.effects[essence.grade - 1] ?? "정수 효과를 전투 중 자동 사용합니다.";
}
