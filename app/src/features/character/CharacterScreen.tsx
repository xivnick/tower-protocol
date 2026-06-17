import type { FormEvent } from "react";
import { useEffect, useRef, useState } from "react";
import { checkCharacterNameAvailability, createMyCharacter, deleteMyCharacter } from "../../api/characterApi";
import { useDocumentTitle } from "../../shared/useDocumentTitle";
import { formatCharacterExperience, formatCharacterLevel } from "../../shared/progression";
import { getCharacterNameValidationMessage, validateCharacterName } from "../../shared/validation";
import type { Character } from "../../types/character";

export function CharacterScreen({
  character,
  onCharacterChange,
  onToast,
}: {
  character: Character | null;
  onCharacterChange: (character: Character | null) => void;
  onToast: (message: string) => void;
}) {
  useDocumentTitle("TOWER://CHARACTER");

  if (character) {
    return (
      <section className="screen-panel">
        <article className="panel">
          <div className="panel-head">
            <span>CHARACTER</span>
            <h2>캐릭터 정보</h2>
          </div>
          <div className="kv-grid">
            <Kv label="이름" value={character.name} />
            <Kv label="레벨" value={formatCharacterLevel(character.level)} />
            <Kv label="경험치" value={formatCharacterExperience(character.level, character.experience)} />
            <Kv label="상태" value="대기 중" />
          </div>
        </article>

        <CharacterDeletePanel character={character} onCharacterChange={onCharacterChange} onToast={onToast} />
      </section>
    );
  }

  return <CharacterCreatePanel onCharacterChange={onCharacterChange} />;
}

function CharacterCreatePanel({ onCharacterChange }: { onCharacterChange: (character: Character) => void }) {
  const [name, setName] = useState("");
  const [hint, setHint] = useState("");
  const [hintType, setHintType] = useState<"is-ok" | "is-error" | "">("");
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"info" | "error">("info");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const requestIdRef = useRef(0);
  const trimmedName = name.trim();
  const nameValidationMessage = name ? getCharacterNameValidationMessage(name) : "";
  const canSubmit = !isSubmitting
    && trimmedName.length > 0
    && !nameValidationMessage
    && hintType !== "is-error";

  useEffect(() => {
    window.clearTimeout(requestIdRef.current);

    if (!name) {
      setHint("");
      setHintType("");
      return;
    }

    if (!validateCharacterName(name)) {
      setHint(getCharacterNameValidationMessage(name));
      setHintType("is-error");
      return;
    }

    const requestId = window.setTimeout(async () => {
      setHint("캐릭터 이름 확인 중...");
      setHintType("");
      const result = await checkCharacterNameAvailability(name);
      setHint(result.message);
      setHintType(result.ok && result.available ? "is-ok" : "is-error");
    }, 350);

    requestIdRef.current = requestId;
    return () => window.clearTimeout(requestId);
  }, [name]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!validateCharacterName(trimmedName)) {
      setMessage(getCharacterNameValidationMessage(trimmedName));
      setMessageType("error");
      return;
    }

    const availability = await checkCharacterNameAvailability(trimmedName);

    if (!availability.ok || !availability.available) {
      setMessage(availability.message);
      setMessageType("error");
      return;
    }

    setIsSubmitting(true);
    setMessage("캐릭터 생성 중...");
    setMessageType("info");

    const result = await createMyCharacter(trimmedName);

    setIsSubmitting(false);

    if (!result.ok || !result.character) {
      setMessage(result.message);
      setMessageType("error");
      return;
    }

    onCharacterChange(result.character);
  }

  return (
    <section className="screen-panel">
      <article className="panel">
        <div className="panel-head">
          <span>CHARACTER</span>
          <h2>캐릭터 생성</h2>
        </div>
        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          <label htmlFor="characterNameInput">
            <span>캐릭터 이름</span>
            <input
              id="characterNameInput"
              name="characterName"
              type="text"
              autoComplete="off"
              maxLength={16}
              placeholder="2-16자, 한글/영문/숫자/_"
              value={name}
              onChange={(event) => {
                setName(event.target.value);
                setMessage("");
              }}
              required
              disabled={isSubmitting}
            />
            <small className={`field-hint ${hintType}`} aria-live="polite">{hint}</small>
          </label>
          <button className="btn primary" type="submit" disabled={!canSubmit}>
            {isSubmitting ? "생성 중..." : "캐릭터 생성"}
          </button>
        </form>
        {message && <p className={`auth-message ${messageType === "error" ? "is-error" : ""}`} role="status">{message}</p>}
      </article>
    </section>
  );
}

function CharacterDeletePanel({
  character,
  onCharacterChange,
  onToast,
}: {
  character: Character;
  onCharacterChange: (character: Character | null) => void;
  onToast: (message: string) => void;
}) {
  const [confirmName, setConfirmName] = useState("");
  const [isConfirming, setIsConfirming] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const canDelete = confirmName.trim() === character.name && !isSubmitting;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canDelete) {
      setMessage("캐릭터 이름을 정확히 입력해주세요.");
      return;
    }

    setIsSubmitting(true);
    setMessage("캐릭터 삭제 중...");

    const result = await deleteMyCharacter(character.id);

    setIsSubmitting(false);

    if (!result.ok) {
      setMessage(result.message);
      return;
    }

    onCharacterChange(null);
    onToast("캐릭터를 삭제했습니다.");
  }

  return (
    <article className="panel danger-panel">
      <div className="panel-head">
        <span>DANGER</span>
        <h2>캐릭터 삭제</h2>
      </div>

      {isConfirming ? (
        <form className="auth-form danger-form" onSubmit={handleSubmit} noValidate>
          <label htmlFor="characterDeleteInput">
            <span>캐릭터 이름 확인</span>
            <input
              id="characterDeleteInput"
              name="characterDelete"
              type="text"
              autoComplete="off"
              placeholder={character.name}
              value={confirmName}
              onChange={(event) => {
                setConfirmName(event.target.value);
                setMessage("");
              }}
              disabled={isSubmitting}
            />
            <small className="field-hint">삭제하려면 캐릭터 이름을 입력해주세요.</small>
          </label>
          <div className="button-row">
            <button className="btn danger" type="submit" disabled={!canDelete}>
              {isSubmitting ? "삭제 중..." : "캐릭터 삭제"}
            </button>
            <button
              className="btn ghost"
              type="button"
              onClick={() => {
                setIsConfirming(false);
                setConfirmName("");
                setMessage("");
              }}
              disabled={isSubmitting}
            >
              취소
            </button>
          </div>
          {message && <p className="auth-message is-error" role="status">{message}</p>}
        </form>
      ) : (
        <div className="panel-action-body">
          <p className="panel-message">삭제 후 되돌릴 수 없습니다.</p>
          <button className="btn danger panel-primary-action" type="button" onClick={() => setIsConfirming(true)}>
            캐릭터 삭제
          </button>
        </div>
      )}
    </article>
  );
}

function Kv({ label, value }: { label: string; value: string }) {
  return (
    <div className="kv">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
