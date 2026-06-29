import { callRpc } from "./rpcClient";

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
  const result = await callRpc<InventoryNoticePayload>("get_inventory_notice_status", "인벤토리 알림을 불러오지 못했습니다.");
  if (!result.ok) return { ok: false, status: mapInventoryNoticeStatus(null), message: result.message };
  return { ok: true, status: mapInventoryNoticeStatus(result.data), message: "" };
}

export async function markInventoryItemSeen(itemKind: "weapon" | "armor" | "essence", itemId: string): Promise<{ ok: boolean; status: InventoryNoticeStatus; message: string }> {
  const result = await callRpc<InventoryNoticePayload>("mark_inventory_item_seen", "새 항목 확인을 저장하지 못했습니다.", {
    item_kind: itemKind,
    item_id: itemId,
  });
  if (!result.ok) return { ok: false, status: mapInventoryNoticeStatus(null), message: result.message };
  return { ok: true, status: mapInventoryNoticeStatus(result.data), message: "" };
}
