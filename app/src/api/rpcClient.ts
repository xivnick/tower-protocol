import { supabase } from "../lib/supabase";
import { toKoreanAuthMessage } from "../shared/authMessages";

type RpcParams = Record<string, unknown>;

type RpcResult<TData> =
  | { ok: true; data: TData }
  | { ok: false; message: string };

export async function callRpc<TData>(
  rpcName: string,
  fallbackMessage: string,
  params?: RpcParams,
): Promise<RpcResult<TData>> {
  if (!supabase) {
    return { ok: false, message: "Supabase 설정을 확인해주세요." };
  }

  const { data, error } = params === undefined
    ? await supabase.rpc(rpcName)
    : await supabase.rpc(rpcName, params);

  if (error) {
    return { ok: false, message: toKoreanAuthMessage(error.message, fallbackMessage) };
  }

  return { ok: true, data: data as TData };
}
