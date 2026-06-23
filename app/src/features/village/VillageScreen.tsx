import { useEffect, useState } from "react";
import { getMyTrainingState, trainMyCharacter } from "../../api/characterApi";
import type { TrainingState } from "../../api/characterApi";
import { getMyPartTimeJobState, workPartTime } from "../../api/partTimeJobApi";
import type { PartTimeJobState } from "../../api/partTimeJobApi";
import { toastMessages } from "../../shared/toastMessages";
import { useDocumentTitle } from "../../shared/useDocumentTitle";
import type { Character } from "../../types/character";
import type { ToastInput } from "../../types/toast";
import { useToast } from "../toast/ToastProvider";

type ChargeState = TrainingState | PartTimeJobState;

export function VillageScreen({ character, onCharacterChange, onCharacterRefresh }: { character: Character | null; onCharacterChange: (character: Character | null) => void; onCharacterRefresh: () => Promise<boolean> }) {
  useDocumentTitle("TOWER://VILLAGE");

  if (!character) return <section className="screen-panel"><article className="panel"><p className="panel-message">캐릭터를 먼저 생성해주세요.</p></article></section>;

  return <section className="screen-panel">
    <article className="panel">
      <div className="panel-head"><span>VILLAGE</span><h2>마을</h2></div>
      <p className="panel-message">훈련과 단기 알바를 진행할 수 있습니다.</p>
    </article>
    <TrainingPanel character={character} onCharacterChange={onCharacterChange} onCharacterRefresh={onCharacterRefresh} />
    <PartTimeJobPanel character={character} onCharacterChange={onCharacterChange} onCharacterRefresh={onCharacterRefresh} />
  </section>;
}

function TrainingPanel({ character, onCharacterChange, onCharacterRefresh }: { character: Character; onCharacterChange: (character: Character | null) => void; onCharacterRefresh: () => Promise<boolean> }) {
  const { showToast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [trainingState, setTrainingState] = useState<TrainingState | null>(null);
  const [now, setNow] = useState(Date.now());
  const isMaxLevel = character.level >= 100;
  const displayedState = getDisplayedChargeState(trainingState, now);

  useEffect(() => {
    let isActive = true;
    void getMyTrainingState().then((result) => {
      if (!isActive) return;
      if (!result.ok || !result.state) { setMessage(result.message); return; }
      setTrainingState(result.state);
      setNow(Date.now());
    });
    return () => { isActive = false; };
  }, [character.id]);

  useChargeTimer(trainingState, displayedState.charges, setNow);

  async function handleTrain() {
    if (isSubmitting || isMaxLevel || displayedState.charges === 0) return;
    setIsSubmitting(true);
    setMessage("");
    const [result] = await Promise.all([trainMyCharacter(), wait(400)]);
    setIsSubmitting(false);
    if (!result.ok || !result.character) { handleFailure(result.message, setMessage, onCharacterRefresh, showToast); return; }
    onCharacterChange(result.character);
    if (result.trainingState) { setTrainingState(result.trainingState); setNow(Date.now()); }
    showToast(toastMessages.training.completed(result.gainedExperience, result.rewardTier));
    if (result.levelAfter > result.levelBefore) window.setTimeout(() => showToast(toastMessages.character.levelUp(result.levelAfter)), 300);
  }

  return <article className="panel">
    <div className="panel-head"><span>TRAINING</span><h2>기초 훈련</h2></div>
    <div className="panel-action-body">
      <p className="panel-message">{isMaxLevel ? "최고 레벨에 도달했습니다." : "훈련을 실행하면 경험치를 획득합니다."}</p>
      <button className="btn primary panel-primary-action" type="button" onClick={handleTrain} disabled={isSubmitting || isMaxLevel || !trainingState || displayedState.charges === 0}>
        {isSubmitting ? "훈련 중..." : isMaxLevel ? "훈련 실행" : !trainingState ? "훈련 상태 확인 중..." : displayedState.charges === 0 ? `훈련까지 ${displayedState.secondsUntilNextCharge ?? 0}초...` : `훈련 실행 (${displayedState.charges}/${trainingState.maxCharges})`}
      </button>
      {message && <p className="auth-message is-error" role="status">{message}</p>}
    </div>
  </article>;
}

function PartTimeJobPanel({ character, onCharacterChange, onCharacterRefresh }: { character: Character; onCharacterChange: (character: Character | null) => void; onCharacterRefresh: () => Promise<boolean> }) {
  const { showToast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [jobState, setJobState] = useState<PartTimeJobState | null>(null);
  const [now, setNow] = useState(Date.now());
  const displayedState = getDisplayedChargeState(jobState, now);

  useEffect(() => {
    let isActive = true;
    void getMyPartTimeJobState().then((result) => {
      if (!isActive) return;
      if (!result.ok || !result.state) { setMessage(result.message); return; }
      setJobState(result.state);
      setNow(Date.now());
    });
    return () => { isActive = false; };
  }, [character.id]);

  useChargeTimer(jobState, displayedState.charges, setNow);

  async function handleWork() {
    if (isSubmitting || displayedState.charges === 0) return;
    setIsSubmitting(true);
    setMessage("");
    const [result] = await Promise.all([workPartTime(), wait(400)]);
    setIsSubmitting(false);
    if (!result.ok || !result.character || !result.state) { handleFailure(result.message, setMessage, onCharacterRefresh, showToast); return; }
    onCharacterChange(result.character);
    setJobState(result.state);
    setNow(Date.now());
    showToast(toastMessages.partTimeJob.completed(result.gainedCredits));
  }

  return <article className="panel">
    <div className="panel-head"><span>WORK</span><h2>단기 알바</h2></div>
    <div className="panel-action-body">
      <p className="panel-message">알바를 실행하면 크레딧을 획득합니다.</p>
      <button className="btn primary panel-primary-action" type="button" onClick={handleWork} disabled={isSubmitting || !jobState || displayedState.charges === 0}>
        {isSubmitting ? "알바 중..." : !jobState ? "알바 상태 확인 중..." : displayedState.charges === 0 ? `알바까지 ${displayedState.secondsUntilNextCharge ?? 0}초...` : `알바 실행 (${displayedState.charges}/${jobState.maxCharges})`}
      </button>
      {message && <p className="auth-message is-error" role="status">{message}</p>}
    </div>
  </article>;
}

function useChargeTimer(state: ChargeState | null, charges: number, setNow: (now: number) => void) {
  useEffect(() => {
    if (!state || charges >= state.maxCharges) return;
    const intervalId = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(intervalId);
  }, [charges, setNow, state]);
}

function getDisplayedChargeState(state: ChargeState | null, now: number) {
  if (!state || !state.nextRechargeAt) return { charges: state?.charges ?? 0, secondsUntilNextCharge: null };
  const nextRechargeAt = Date.parse(state.nextRechargeAt);
  if (Number.isNaN(nextRechargeAt)) return { charges: state.charges, secondsUntilNextCharge: null };
  const elapsedCharges = Math.max(0, Math.floor((now - nextRechargeAt) / 6000) + 1);
  const charges = Math.min(state.maxCharges, state.charges + elapsedCharges);
  const nextChargeAt = nextRechargeAt + (elapsedCharges * 6000);
  return { charges, secondsUntilNextCharge: charges >= state.maxCharges ? null : Math.max(0, Math.ceil((nextChargeAt - now) / 1000)) };
}

function handleFailure(message: string, setMessage: (message: string) => void, onCharacterRefresh: () => Promise<boolean>, showToast: (toast: ToastInput) => void) {
  setMessage(message);
  showToast({ message, tone: "error" });
  void onCharacterRefresh().then((isRefreshed) => {
    if (isRefreshed) showToast(toastMessages.character.refreshed());
  }).catch(() => {});
}

function wait(ms: number) { return new Promise((resolve) => window.setTimeout(resolve, ms)); }
