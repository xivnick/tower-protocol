import { supabase } from "../lib/supabase";
import { toKoreanAuthMessage } from "../shared/authMessages";
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
  if (!supabase) return { ok: false, state: null, message: "Supabase 설정을 확인해주세요." };

  const { data, error } = await supabase.rpc("get_my_part_time_job_state");
  if (error) return { ok: false, state: null, message: toKoreanAuthMessage(error.message, "알바 상태를 불러오지 못했습니다.") };

  return { ok: true, state: mapPartTimeJobState(data as PartTimeJobPayload["job_state"]), message: "" };
}

export async function workPartTime(): Promise<{ ok: boolean; character: Character | null; gainedCredits: number; state: PartTimeJobState | null; message: string }> {
  if (!supabase) return { ok: false, character: null, gainedCredits: 0, state: null, message: "Supabase 설정을 확인해주세요." };

  const { data, error } = await supabase.rpc("work_part_time");
  if (error) return { ok: false, character: null, gainedCredits: 0, state: null, message: toKoreanAuthMessage(error.message, "알바를 완료하지 못했습니다.") };

  const payload = (data ?? {}) as PartTimeJobPayload;

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
