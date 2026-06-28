import { supabase } from "../lib/supabase";
import { toKoreanAuthMessage } from "../shared/authMessages";

export type InventoryNoticeStatus = {
  equipment: boolean;
  essence: boolean;
};

type InventoryNoticePayload = {
  equipment?: boolean;
  essence?: boolean;
};

function mapInventoryNoticeStatus(payload: InventoryNoticePayload | null): InventoryNoticeStatus {
  return {
    equipment: Boolean(payload?.equipment),
    essence: Boolean(payload?.essence),
  };
}

export async function getInventoryNoticeStatus(): Promise<{ ok: boolean; status: InventoryNoticeStatus; message: string }> {
  if (!supabase) return { ok: false, status: mapInventoryNoticeStatus(null), message: "Supabase 설정을 확인해주세요." };
  const { data, error } = await supabase.rpc("get_inventory_notice_status");
  if (error) return { ok: false, status: mapInventoryNoticeStatus(null), message: toKoreanAuthMessage(error.message, "인벤토리 알림을 불러오지 못했습니다.") };
  return { ok: true, status: mapInventoryNoticeStatus(data as InventoryNoticePayload), message: "" };
}

export async function markInventoryItemSeen(itemKind: "weapon" | "armor" | "essence", itemId: string): Promise<{ ok: boolean; status: InventoryNoticeStatus; message: string }> {
  if (!supabase) return { ok: false, status: mapInventoryNoticeStatus(null), message: "Supabase 설정을 확인해주세요." };
  const { data, error } = await supabase.rpc("mark_inventory_item_seen", { item_kind: itemKind, item_id: itemId });
  if (error) return { ok: false, status: mapInventoryNoticeStatus(null), message: toKoreanAuthMessage(error.message, "새 항목 확인을 저장하지 못했습니다.") };
  return { ok: true, status: mapInventoryNoticeStatus(data as InventoryNoticePayload), message: "" };
}
