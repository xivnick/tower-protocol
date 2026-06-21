import { supabase } from "../lib/supabase";
import { toKoreanAuthMessage } from "../shared/authMessages";
import type { Character } from "../types/character";

export type WeaponType = "longsword" | "greatsword" | "dagger" | "bow" | "wand" | "staff";

export type Weapon = {
  id: string;
  weaponType: WeaponType;
  weaponLevel: number;
  createdAt: string;
};

export type WeaponInventory = {
  weapons: Weapon[];
  equippedWeaponId: string | null;
};

type WeaponPayload = {
  id?: string;
  weapon_type?: WeaponType;
  weapon_level?: number;
  created_at?: string;
};

type InventoryPayload = {
  weapons?: WeaponPayload[];
  equipped_weapon_id?: string | null;
};

function mapWeapon(payload: WeaponPayload): Weapon | null {
  if (!payload.id || !payload.weapon_type || !payload.weapon_level || !payload.created_at) return null;
  return { id: payload.id, weaponType: payload.weapon_type, weaponLevel: payload.weapon_level, createdAt: payload.created_at };
}

function mapInventory(payload: InventoryPayload | null): WeaponInventory {
  return {
    weapons: (payload?.weapons ?? []).map(mapWeapon).filter((weapon): weapon is Weapon => weapon !== null),
    equippedWeaponId: payload?.equipped_weapon_id ?? null,
  };
}

export async function getMyWeapons(): Promise<{ ok: boolean; inventory: WeaponInventory; message: string }> {
  if (!supabase) return { ok: false, inventory: mapInventory(null), message: "Supabase 설정을 확인해주세요." };
  const { data, error } = await supabase.rpc("get_my_weapons");
  if (error) return { ok: false, inventory: mapInventory(null), message: toKoreanAuthMessage(error.message, "무기를 불러오지 못했습니다.") };
  return { ok: true, inventory: mapInventory(data as InventoryPayload), message: "" };
}

export async function openWeaponBox(): Promise<{ ok: boolean; character: Character | null; weapon: Weapon | null; message: string }> {
  if (!supabase) return { ok: false, character: null, weapon: null, message: "Supabase 설정을 확인해주세요." };
  const { data, error } = await supabase.rpc("open_weapon_box");
  if (error) return { ok: false, character: null, weapon: null, message: toKoreanAuthMessage(error.message, "무기 상자를 열지 못했습니다.") };
  const payload = data as { character?: Character; weapon?: WeaponPayload };
  return { ok: true, character: payload.character ?? null, weapon: mapWeapon(payload.weapon ?? {}), message: "" };
}

export async function equipWeapon(weaponId: string): Promise<{ ok: boolean; inventory: WeaponInventory; message: string }> {
  if (!supabase) return { ok: false, inventory: mapInventory(null), message: "Supabase 설정을 확인해주세요." };
  const { data, error } = await supabase.rpc("equip_weapon", { target_weapon_id: weaponId });
  if (error) return { ok: false, inventory: mapInventory(null), message: toKoreanAuthMessage(error.message, "무기를 장착하지 못했습니다.") };
  return { ok: true, inventory: mapInventory(data as InventoryPayload), message: "" };
}

export async function unequipWeapon(): Promise<{ ok: boolean; inventory: WeaponInventory; message: string }> {
  if (!supabase) return { ok: false, inventory: mapInventory(null), message: "Supabase 설정을 확인해주세요." };
  const { data, error } = await supabase.rpc("unequip_weapon");
  if (error) return { ok: false, inventory: mapInventory(null), message: toKoreanAuthMessage(error.message, "무기를 해제하지 못했습니다.") };
  return { ok: true, inventory: mapInventory(data as InventoryPayload), message: "" };
}
