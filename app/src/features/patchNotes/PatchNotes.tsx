import { useEffect, useState } from "react";
import { loadPatchNotes } from "./loadPatchNotes";
import type { PatchNote } from "./patchNoteTypes";

type PatchNotesState =
  | { status: "loading"; notes: PatchNote[]; message: string }
  | { status: "ready"; notes: PatchNote[]; message: string }
  | { status: "error"; notes: PatchNote[]; message: string };

export function PatchNotesSummary({ onOpenAll }: { onOpenAll: () => void }) {
  const { status, notes, message } = usePatchNotes();
  const recentNotes = notes.slice(0, 3);

  return (
    <article className="panel patch-panel">
      <div className="panel-head compact action-head">
        <div>
          <span>PATCH NOTES</span>
          <h2>패치노트 터미널</h2>
        </div>
        <button className="text-button" type="button" onClick={onOpenAll}>
          전체 보기
        </button>
      </div>

      {status !== "ready" ? (
        <p className={`panel-message ${status === "error" ? "is-error" : ""}`}>{message}</p>
      ) : (
        <PatchNoteList notes={recentNotes} compact />
      )}
    </article>
  );
}

export function PatchNotesArchive() {
  const { status, notes, message } = usePatchNotes();

  return (
    <section className="archive-view">
      <div className="archive-head">
        <div>
          <span className="eyebrow">PATCH NOTES</span>
          <h1>패치노트 터미널</h1>
        </div>
      </div>

      {status !== "ready" ? (
        <p className={`panel-message ${status === "error" ? "is-error" : ""}`}>{message}</p>
      ) : (
        <PatchNoteList notes={notes} />
      )}
    </section>
  );
}

function PatchNoteList({ notes, compact = false }: { notes: PatchNote[]; compact?: boolean }) {
  return (
    <ol className={`patch-list ${compact ? "is-compact" : ""}`}>
      {notes.map((note) => (
        <li className="patch-note" key={note.version}>
          <header>
            <strong>v{note.version}</strong>
            <span>{note.date}</span>
          </header>
          <h3>{note.title}</h3>
          <ul>
            {note.items.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </li>
      ))}
    </ol>
  );
}

function usePatchNotes(): PatchNotesState {
  const [state, setState] = useState<PatchNotesState>({
    status: "loading",
    notes: [],
    message: "패치노트를 불러오는 중...",
  });

  useEffect(() => {
    let isActive = true;

    loadPatchNotes()
      .then((notes) => {
        if (!isActive) return;
        setState({ status: "ready", notes, message: "" });
      })
      .catch((error: unknown) => {
        if (!isActive) return;
        const message = error instanceof Error ? error.message : "패치노트를 불러오지 못했습니다.";
        setState({ status: "error", notes: [], message });
      });

    return () => {
      isActive = false;
    };
  }, []);

  return state;
}
