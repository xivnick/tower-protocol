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

export type EssenceUpgradeResult = {
  inventory: EssenceInventory;
  upgradedEssenceId: string | null;
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
  upgraded_essence_id?: string | null;
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

export async function upgradeEssence(essenceId: string): Promise<{ ok: boolean; result: EssenceUpgradeResult; message: string }> {
  const emptyResult = { inventory: mapInventory(null), upgradedEssenceId: null };
  if (!supabase) return { ok: false, result: emptyResult, message: "Supabase 설정을 확인해주세요." };
  const { data, error } = await supabase.rpc("upgrade_essence", { target_character_essence_id: essenceId });
  if (error) return { ok: false, result: emptyResult, message: toKoreanAuthMessage(error.message, "정수를 강화하지 못했습니다.") };
  const payload = data as EssenceInventoryPayload;
  return {
    ok: true,
    result: { inventory: mapInventory(payload), upgradedEssenceId: payload?.upgraded_essence_id ?? null },
    message: "",
  };
}
