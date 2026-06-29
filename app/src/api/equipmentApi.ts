import { callRpc } from "./rpcClient";
import type { Character } from "../types/character";
import type { ArmorType, ArmorVariant } from "../shared/armorStats";

export type WeaponType = "longsword" | "greatsword" | "dagger" | "bow" | "wand" | "staff";

export type Weapon = {
  id: string;
  weaponType: WeaponType;
  weaponLevel: number;
  createdAt: string;
  seenAt: string | null;
};

export type WeaponInventory = {
  weapons: Weapon[];
  equippedWeaponId: string | null;
};

export type Armor = {
  id: string;
  armorType: ArmorType;
  armorVariant: ArmorVariant;
  armorLevel: number;
  createdAt: string;
  seenAt: string | null;
};

export type ArmorInventory = {
  armors: Armor[];
  equippedArmorId: string | null;
};

type WeaponPayload = {
  id?: string;
  weapon_type?: WeaponType;
  weapon_level?: number;
  created_at?: string;
  seen_at?: string | null;
};

type InventoryPayload = {
  weapons?: WeaponPayload[];
  equipped_weapon_id?: string | null;
};

type ArmorPayload = {
  id?: string;
  armor_type?: ArmorType;
  armor_variant?: ArmorVariant;
  armor_level?: number;
  created_at?: string;
  seen_at?: string | null;
};

type ArmorInventoryPayload = {
  armors?: ArmorPayload[];
  equipped_armor_id?: string | null;
};

function mapWeapon(payload: WeaponPayload): Weapon | null {
  if (!payload.id || !payload.weapon_type || !payload.weapon_level || !payload.created_at) return null;
  return { id: payload.id, weaponType: payload.weapon_type, weaponLevel: payload.weapon_level, createdAt: payload.created_at, seenAt: payload.seen_at ?? null };
}

function mapInventory(payload: InventoryPayload | null): WeaponInventory {
  return {
    weapons: (payload?.weapons ?? []).map(mapWeapon).filter((weapon): weapon is Weapon => weapon !== null),
    equippedWeaponId: payload?.equipped_weapon_id ?? null,
  };
}

function mapArmor(payload: ArmorPayload): Armor | null {
  if (!payload.id || !payload.armor_type || !payload.armor_variant || !payload.armor_level || !payload.created_at) return null;
  return { id: payload.id, armorType: payload.armor_type, armorVariant: payload.armor_variant, armorLevel: payload.armor_level, createdAt: payload.created_at, seenAt: payload.seen_at ?? null };
}

function mapArmorInventory(payload: ArmorInventoryPayload | null): ArmorInventory {
  return {
    armors: (payload?.armors ?? []).map(mapArmor).filter((armor): armor is Armor => armor !== null),
    equippedArmorId: payload?.equipped_armor_id ?? null,
  };
}

export async function getMyWeapons(): Promise<{ ok: boolean; inventory: WeaponInventory; message: string }> {
  const result = await callRpc<InventoryPayload>("get_my_weapons", "무기를 불러오지 못했습니다.");
  if (!result.ok) return { ok: false, inventory: mapInventory(null), message: result.message };
  return { ok: true, inventory: mapInventory(result.data), message: "" };
}

export async function openWeaponBox(): Promise<{ ok: boolean; character: Character | null; weapon: Weapon | null; message: string }> {
  const result = await callRpc<{ character?: Character; weapon?: WeaponPayload }>("open_weapon_box", "무기 상자를 열지 못했습니다.");
  if (!result.ok) return { ok: false, character: null, weapon: null, message: result.message };
  const payload = result.data;
  return { ok: true, character: payload.character ?? null, weapon: mapWeapon(payload.weapon ?? {}), message: "" };
}

export async function equipWeapon(weaponId: string): Promise<{ ok: boolean; inventory: WeaponInventory; message: string }> {
  const result = await callRpc<InventoryPayload>("equip_weapon", "무기를 장착하지 못했습니다.", { target_weapon_id: weaponId });
  if (!result.ok) return { ok: false, inventory: mapInventory(null), message: result.message };
  return { ok: true, inventory: mapInventory(result.data), message: "" };
}

export async function unequipWeapon(): Promise<{ ok: boolean; inventory: WeaponInventory; message: string }> {
  const result = await callRpc<InventoryPayload>("unequip_weapon", "무기를 해제하지 못했습니다.");
  if (!result.ok) return { ok: false, inventory: mapInventory(null), message: result.message };
  return { ok: true, inventory: mapInventory(result.data), message: "" };
}

export async function sellWeapon(weaponId: string): Promise<{ ok: boolean; character: Character | null; gainedCredits: number; message: string }> {
  const result = await callRpc<{ character?: Character; gained_credits?: number }>("sell_weapon", "무기를 판매하지 못했습니다.", { target_weapon_id: weaponId });
  if (!result.ok) return { ok: false, character: null, gainedCredits: 0, message: result.message };
  const payload = result.data;
  return { ok: true, character: payload.character ?? null, gainedCredits: payload.gained_credits ?? 0, message: "" };
}

export async function getMyArmors(): Promise<{ ok: boolean; inventory: ArmorInventory; message: string }> {
  const result = await callRpc<ArmorInventoryPayload>("get_my_armors", "방어구를 불러오지 못했습니다.");
  if (!result.ok) return { ok: false, inventory: mapArmorInventory(null), message: result.message };
  return { ok: true, inventory: mapArmorInventory(result.data), message: "" };
}

export async function openArmorBox(): Promise<{ ok: boolean; character: Character | null; armor: Armor | null; message: string }> {
  const result = await callRpc<{ character?: Character; armor?: ArmorPayload }>("open_armor_box", "방어구 상자를 열지 못했습니다.");
  if (!result.ok) return { ok: false, character: null, armor: null, message: result.message };
  const payload = result.data;
  return { ok: true, character: payload.character ?? null, armor: mapArmor(payload.armor ?? {}), message: "" };
}

export async function equipArmor(armorId: string): Promise<{ ok: boolean; inventory: ArmorInventory; message: string }> {
  const result = await callRpc<ArmorInventoryPayload>("equip_armor", "방어구를 장착하지 못했습니다.", { target_armor_id: armorId });
  if (!result.ok) return { ok: false, inventory: mapArmorInventory(null), message: result.message };
  return { ok: true, inventory: mapArmorInventory(result.data), message: "" };
}

export async function unequipArmor(): Promise<{ ok: boolean; inventory: ArmorInventory; message: string }> {
  const result = await callRpc<ArmorInventoryPayload>("unequip_armor", "방어구를 해제하지 못했습니다.");
  if (!result.ok) return { ok: false, inventory: mapArmorInventory(null), message: result.message };
  return { ok: true, inventory: mapArmorInventory(result.data), message: "" };
}

export async function sellArmor(armorId: string): Promise<{ ok: boolean; character: Character | null; gainedCredits: number; message: string }> {
  const result = await callRpc<{ character?: Character; gained_credits?: number }>("sell_armor", "방어구를 판매하지 못했습니다.", { target_armor_id: armorId });
  if (!result.ok) return { ok: false, character: null, gainedCredits: 0, message: result.message };
  const payload = result.data;
  return { ok: true, character: payload.character ?? null, gainedCredits: payload.gained_credits ?? 0, message: "" };
}
