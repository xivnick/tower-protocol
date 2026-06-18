import { supabase } from "../../lib/supabase";
import type { PatchNote } from "./patchNoteTypes";

type PatchNoteRow = {
  id: string;
  version: string;
  title: string;
  release_date: string;
};

type PatchNoteItemRow = {
  patch_note_id: string;
  sort_order: number;
  content: string;
};

export async function loadPatchNotes(): Promise<PatchNote[]> {
  if (!supabase) {
    throw new Error("패치노트를 불러오지 못했습니다.");
  }

  const { data: noteRows, error: noteError } = await supabase
    .from("patch_notes")
    .select("id, version, title, release_date")
    .eq("is_published", true)
    .order("release_date", { ascending: false })
    .order("version", { ascending: false });

  if (noteError) {
    throw new Error("패치노트를 불러오지 못했습니다.");
  }

  const notes = (noteRows ?? []) as PatchNoteRow[];
  const noteIds = notes.map((note) => note.id);

  if (noteIds.length === 0) {
    return [];
  }

  const { data: itemRows, error: itemError } = await supabase
    .from("patch_note_items")
    .select("patch_note_id, sort_order, content")
    .in("patch_note_id", noteIds)
    .order("sort_order", { ascending: true });

  if (itemError) {
    throw new Error("패치노트를 불러오지 못했습니다.");
  }

  const itemsByNoteId = new Map<string, PatchNoteItemRow[]>();

  ((itemRows ?? []) as PatchNoteItemRow[]).forEach((item) => {
    const currentItems = itemsByNoteId.get(item.patch_note_id) ?? [];
    currentItems.push(item);
    itemsByNoteId.set(item.patch_note_id, currentItems);
  });

  return notes
    .map((note) => ({
      version: note.version,
      date: note.release_date,
      title: note.title,
      items: (itemsByNoteId.get(note.id) ?? [])
        .sort((left, right) => left.sort_order - right.sort_order)
        .map((item) => item.content),
    }))
    .sort((left, right) => compareVersions(right.version, left.version));
}

function compareVersions(left: string, right: string) {
  const leftParts = left.split(".").map(Number);
  const rightParts = right.split(".").map(Number);
  const length = Math.max(leftParts.length, rightParts.length);

  for (let index = 0; index < length; index += 1) {
    const leftPart = leftParts[index] ?? 0;
    const rightPart = rightParts[index] ?? 0;

    if (leftPart !== rightPart) {
      return leftPart - rightPart;
    }
  }

  return 0;
}
