import type { TrainingRewardTier } from "../api/characterApi";
import type { ToastInput, ToastTone } from "../types/toast";

export const toastMessages = {
  character: {
    refreshed: (): ToastInput => ({ message: "최신 캐릭터 정보를 반영했습니다.", tone: "system" }),
    statsApplied: (): ToastInput => ({ message: "능력치를 적용했습니다.", tone: "system" }),
    statsReset: (): ToastInput => ({ message: "능력치를 초기화했습니다.", tone: "system" }),
    deleted: (): ToastInput => ({ message: "캐릭터를 삭제했습니다.", tone: "system" }),
    levelUp: (level: number): ToastInput => ({ message: `레벨업! -> LV.${level}`, tone: "epic" }),
  },
  training: {
    completed: (gainedExperience: number, rewardTier: TrainingRewardTier): ToastInput => ({
      message: `${getTrainingRewardLabel(rewardTier)} +${gainedExperience.toLocaleString()} EXP`,
      tone: getTrainingRewardTone(rewardTier),
    }),
  },
  partTimeJob: {
    completed: (gainedCredits: number): ToastInput => ({ message: `알바 완료 +${gainedCredits.toLocaleString()} CR`, tone: "common" }),
  },
  hunt: {
    defeated: (): ToastInput => ({ message: "전투에서 패배했습니다.", tone: "error" }),
    timedOut: (): ToastInput => ({ message: "시간 제한에 도달해 전투를 종료했습니다.", tone: "system" }),
    completed: (gainedExperience: number): ToastInput => ({ message: `전투 완료 · +${gainedExperience} EXP`, tone: "system" }),
    autoBattleStarted: (level: number, name: string): ToastInput => ({ message: `자동 전투 시작 · LV.${level} ${name}`, tone: "system" }),
    autoHuntStarted: (): ToastInput => ({ message: "자동사냥을 시작했습니다.", tone: "system" }),
    autoHuntUpdated: (): ToastInput => ({ message: "자동전투 횟수를 갱신했습니다.", tone: "system" }),
    autoHuntStopped: (): ToastInput => ({ message: "자동사냥을 중단했습니다.", tone: "system" }),
    autoHuntCompleted: (): ToastInput => ({ message: "자동사냥이 종료되었습니다.", tone: "system" }),
  },
  recovery: {
    completed: (): ToastInput => ({ message: "체력이 모두 회복되었습니다.", tone: "system" }),
  },
};

function getTrainingRewardLabel(rewardTier: TrainingRewardTier) {
  if (rewardTier === "great") return "훈련 대성공";
  if (rewardTier === "good") return "훈련 성공";
  return "훈련 완료";
}

function getTrainingRewardTone(rewardTier: TrainingRewardTier): ToastTone {
  if (rewardTier === "great") return "rare";
  if (rewardTier === "good") return "uncommon";
  return "common";
}
