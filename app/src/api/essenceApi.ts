import { supabase } from "../lib/supabase";
import { toKoreanAuthMessage } from "../shared/authMessages";

export type Essence = {
  id: string;
  templateId: string;
  code: string;
  name: string;
  grade: number;
  quantity: number;
  equippedSlotIndex: number | null;
  createdAt: string;
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
  };
}

function mapInventory(payload: EssenceInventoryPayload | null): EssenceInventory {
  return {
    essences: (payload?.essences ?? []).map(mapEssence).filter((essence): essence is Essence => essence !== null),
    slots: (payload?.slots ?? []).flatMap((slot) => slot.slot_index && slot.character_essence_id ? [{ slotIndex: slot.slot_index, characterEssenceId: slot.character_essence_id }] : []),
  };
}

export async function getMyEssences(): Promise<{ ok: boolean; inventory: EssenceInventory; message: string }> {
  if (!supabase) return { ok: false, inventory: mapInventory(null), message: "Supabase 설정을 확인해주세요." };
  const { data, error } = await supabase.rpc("get_my_essences");
  if (error) return { ok: false, inventory: mapInventory(null), message: toKoreanAuthMessage(error.message, "정수를 불러오지 못했습니다.") };
  return { ok: true, inventory: mapInventory(data as EssenceInventoryPayload), message: "" };
}

export async function equipEssence(essenceId: string, slotIndex: number): Promise<{ ok: boolean; inventory: EssenceInventory; message: string }> {
  if (!supabase) return { ok: false, inventory: mapInventory(null), message: "Supabase 설정을 확인해주세요." };
  const { data, error } = await supabase.rpc("equip_essence", { target_character_essence_id: essenceId, target_slot_index: slotIndex });
  if (error) return { ok: false, inventory: mapInventory(null), message: toKoreanAuthMessage(error.message, "정수를 장착하지 못했습니다.") };
  return { ok: true, inventory: mapInventory(data as EssenceInventoryPayload), message: "" };
}

export async function unequipEssence(slotIndex: number): Promise<{ ok: boolean; inventory: EssenceInventory; message: string }> {
  if (!supabase) return { ok: false, inventory: mapInventory(null), message: "Supabase 설정을 확인해주세요." };
  const { data, error } = await supabase.rpc("unequip_essence", { target_slot_index: slotIndex });
  if (error) return { ok: false, inventory: mapInventory(null), message: toKoreanAuthMessage(error.message, "정수를 해제하지 못했습니다.") };
  return { ok: true, inventory: mapInventory(data as EssenceInventoryPayload), message: "" };
}
