import type { PatchNote } from "./patchNoteTypes";

export async function loadPatchNotes(): Promise<PatchNote[]> {
  const response = await fetch("/patch-notes.json", { cache: "no-store" });

  if (!response.ok) {
    throw new Error("패치노트를 불러오지 못했습니다.");
  }

  return response.json();
}
