import type { FormEvent } from "react";
import { useState } from "react";
import { createMyCharacter } from "../../api/characterApi";
import { useDocumentTitle } from "../../shared/useDocumentTitle";
import { getCharacterNameValidationMessage, validateCharacterName } from "../../shared/validation";
import type { Character } from "../../types/character";

export function CharacterScreen({
  character,
  onCharacterChange,
}: {
  character: Character | null;
  onCharacterChange: (character: Character) => void;
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
            <Kv label="상태" value="대기 중" />
            <Kv label="다음 구현" value="캐릭터 성장" />
          </div>
        </article>
      </section>
    );
  }

  return <CharacterCreatePanel onCharacterChange={onCharacterChange} />;
}

function CharacterCreatePanel({ onCharacterChange }: { onCharacterChange: (character: Character) => void }) {
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"info" | "error">("info");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const validationMessage = name ? getCharacterNameValidationMessage(name) : "";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedName = name.trim();

    if (!validateCharacterName(trimmedName)) {
      setMessage(getCharacterNameValidationMessage(trimmedName));
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
            <small className={`field-hint ${validationMessage ? "is-error" : ""}`} aria-live="polite">{validationMessage}</small>
          </label>
          <button className="btn primary" type="submit" disabled={isSubmitting}>
            {isSubmitting ? "생성 중..." : "캐릭터 생성"}
          </button>
        </form>
        {message && <p className={`auth-message ${messageType === "error" ? "is-error" : ""}`} role="status">{message}</p>}
      </article>
    </section>
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
