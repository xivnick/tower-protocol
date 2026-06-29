import { callRpc } from "./rpcClient";
import type { Character } from "../types/character";

export type PartTimeJobState = {
  charges: number;
  maxCharges: number;
  nextRechargeAt: string | null;
};

type PartTimeJobPayload = {
  character?: Character;
  gained_credits?: number;
  job_state?: {
    charges?: number;
    max_charges?: number;
    next_recharge_at?: string | null;
  };
};

export async function getMyPartTimeJobState(): Promise<{ ok: boolean; state: PartTimeJobState | null; message: string }> {
  const result = await callRpc<PartTimeJobPayload["job_state"]>("get_my_part_time_job_state", "알바 상태를 불러오지 못했습니다.");
  if (!result.ok) return { ok: false, state: null, message: result.message };

  return { ok: true, state: mapPartTimeJobState(result.data), message: "" };
}

export async function workPartTime(): Promise<{ ok: boolean; character: Character | null; gainedCredits: number; state: PartTimeJobState | null; message: string }> {
  const result = await callRpc<PartTimeJobPayload>("work_part_time", "알바를 완료하지 못했습니다.");
  if (!result.ok) return { ok: false, character: null, gainedCredits: 0, state: null, message: result.message };

  const payload = result.data ?? {};

  return {
    ok: Boolean(payload.character),
    character: payload.character ?? null,
    gainedCredits: payload.gained_credits ?? 0,
    state: mapPartTimeJobState(payload.job_state),
    message: payload.character ? "" : "알바를 완료하지 못했습니다.",
  };
}

function mapPartTimeJobState(payload: PartTimeJobPayload["job_state"]): PartTimeJobState {
  return {
    charges: payload?.charges ?? 0,
    maxCharges: payload?.max_charges ?? 10,
    nextRechargeAt: payload?.next_recharge_at ?? null,
  };
}
