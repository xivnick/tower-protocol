import { supabase } from "../lib/supabase";
import { toKoreanAuthMessage } from "../shared/authMessages";
import type { Character } from "../types/character";

export type CreditVaultState = {
  initialMask: number;
  charges: number;
  nextChargeAt: string | null;
};

type CreditVaultPayload = {
  ok?: boolean;
  initial_mask?: number | null;
  charges?: number;
  next_charge_at?: string | null;
  character?: Character | null;
  message?: string;
};

export async function openCreditVault(): Promise<{ ok: boolean; state: CreditVaultState | null; charges: number; nextChargeAt: string | null; message: string }> {
  if (!supabase) return { ok: false, state: null, charges: 0, nextChargeAt: null, message: "Supabase 설정을 확인해주세요." };

  const { data, error } = await supabase.rpc("open_credit_vault");

  if (error) {
    return { ok: false, state: null, charges: 0, nextChargeAt: null, message: toKoreanAuthMessage(error.message, "금고를 열지 못했습니다.") };
  }

  const payload = (data ?? {}) as CreditVaultPayload;
  const initialMask = payload.initial_mask;

  const charges = payload.charges ?? 0;
  const nextChargeAt = payload.next_charge_at ?? null;

  if (!payload.ok || typeof initialMask !== "number") {
    return { ok: false, state: null, charges, nextChargeAt, message: payload.message ?? "금고를 열지 못했습니다." };
  }

  return {
    ok: true,
    state: { initialMask, charges, nextChargeAt },
    charges,
    nextChargeAt,
    message: payload.message ?? "",
  };
}

export async function resolveCreditVault(moves: number[]): Promise<{ ok: boolean; character: Character | null; message: string }> {
  if (!supabase) return { ok: false, character: null, message: "Supabase 설정을 확인해주세요." };

  const { data, error } = await supabase.rpc("resolve_credit_vault", { p_moves: moves });

  if (error) {
    return { ok: false, character: null, message: toKoreanAuthMessage(error.message, "금고 해제에 실패했습니다.") };
  }

  const payload = (data ?? {}) as CreditVaultPayload;

  return {
    ok: Boolean(payload.ok),
    character: payload.character ?? null,
    message: payload.message ?? (payload.ok ? "" : "금고 해제에 실패했습니다."),
  };
}
