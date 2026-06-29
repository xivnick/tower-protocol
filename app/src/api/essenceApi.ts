import { callRpc } from "./rpcClient";

export type Essence = {
  id: string;
  templateId: string;
  code: string;
  name: string;
  grade: number;
  quantity: number;
  equippedSlotIndex: number | null;
  createdAt: string;
  seenAt: string | null;
};

export type EssenceSlot = {
  slotIndex: number;
  characterEssenceId: string;
};

export type EssenceInventory = {
  essences: Essence[];
  slots: EssenceSlot[];
};

type EssencePayload = {
  id?: string;
  template_id?: string;
  code?: string;
  name?: string;
  grade?: number;
  quantity?: number;
  equipped_slot_index?: number | null;
  created_at?: string;
  seen_at?: string | null;
};

type EssenceSlotPayload = {
  slot_index?: number;
  character_essence_id?: string;
};

type EssenceInventoryPayload = {
  essences?: EssencePayload[];
  slots?: EssenceSlotPayload[];
};

function mapEssence(payload: EssencePayload): Essence | null {
  if (!payload.id || !payload.template_id || !payload.code || !payload.name || !payload.grade || !payload.quantity || !payload.created_at) return null;
  return {
    id: payload.id,
    templateId: payload.template_id,
    code: payload.code,
    name: payload.name,
    grade: payload.grade,
    quantity: payload.quantity,
    equippedSlotIndex: payload.equipped_slot_index ?? null,
    createdAt: payload.created_at,
    seenAt: payload.seen_at ?? null,
  };
}

function mapInventory(payload: EssenceInventoryPayload | null): EssenceInventory {
  return {
    essences: (payload?.essences ?? []).map(mapEssence).filter((essence): essence is Essence => essence !== null),
    slots: (payload?.slots ?? []).flatMap((slot) => slot.slot_index && slot.character_essence_id ? [{ slotIndex: slot.slot_index, characterEssenceId: slot.character_essence_id }] : []),
  };
}

export async function getMyEssences(): Promise<{ ok: boolean; inventory: EssenceInventory; message: string }> {
  const result = await callRpc<EssenceInventoryPayload>("get_my_essences", "정수를 불러오지 못했습니다.");
  if (!result.ok) return { ok: false, inventory: mapInventory(null), message: result.message };
  return { ok: true, inventory: mapInventory(result.data), message: "" };
}

export async function equipEssence(essenceId: string, slotIndex: number): Promise<{ ok: boolean; inventory: EssenceInventory; message: string }> {
  const result = await callRpc<EssenceInventoryPayload>("equip_essence", "정수를 장착하지 못했습니다.", {
    target_character_essence_id: essenceId,
    target_slot_index: slotIndex,
  });
  if (!result.ok) return { ok: false, inventory: mapInventory(null), message: result.message };
  return { ok: true, inventory: mapInventory(result.data), message: "" };
}

export async function unequipEssence(slotIndex: number): Promise<{ ok: boolean; inventory: EssenceInventory; message: string }> {
  const result = await callRpc<EssenceInventoryPayload>("unequip_essence", "정수를 해제하지 못했습니다.", { target_slot_index: slotIndex });
  if (!result.ok) return { ok: false, inventory: mapInventory(null), message: result.message };
  return { ok: true, inventory: mapInventory(result.data), message: "" };
}
