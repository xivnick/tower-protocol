import { useEffect, useState } from "react";
import { openCreditVault, resolveCreditVault } from "../../api/creditVaultApi";
import type { Character } from "../../types/character";
import type { ToastInput } from "../../types/toast";

const solvedMask = 511;

export function CreditVaultPanel({
  character,
  onCharacterChange,
  onToast,
}: {
  character: Character;
  onCharacterChange: (character: Character) => void;
  onToast: (toast: ToastInput) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mask, setMask] = useState<number | null>(null);
  const [moves, setMoves] = useState<number[]>([]);
  const [message, setMessage] = useState("");
  const [availableAt, setAvailableAt] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());
  const [isComplete, setIsComplete] = useState(false);
  const isCoolingDown = Boolean(availableAt && Date.parse(availableAt) > now);

  useEffect(() => {
    if (!isCoolingDown) return;

    const intervalId = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(intervalId);
  }, [isCoolingDown]);

  async function handleOpen() {
    setIsOpen(true);
    setIsLoading(true);
    setIsComplete(false);
    setMessage("금고 연결 중...");

    const result = await openCreditVault();

    setIsLoading(false);
    setAvailableAt(result.availableAt);

    if (!result.ok || !result.state) {
      setMask(null);
      setMoves([]);
      setMessage(result.message);
      return;
    }

    setMask(result.state.initialMask);
    setMoves([]);
    setMessage("");
  }

  async function handleRuneClick(cellIndex: number) {
    if (mask === null || isSubmitting || isComplete) return;

    const nextMask = toggleRune(mask, cellIndex);
    const nextMoves = [...moves, cellIndex];
    setMask(nextMask);
    setMoves(nextMoves);
    setMessage("");

    if (nextMask !== solvedMask) return;

    setIsSubmitting(true);
    const result = await resolveCreditVault(nextMoves);
    setIsSubmitting(false);

    if (!result.ok || !result.character) {
      setMessage(result.message);
      return;
    }

    setAvailableAt(result.availableAt);
    setIsComplete(true);
    setMessage(result.message);
    onCharacterChange(result.character);
    onToast({ message: result.message, tone: "epic" });
  }

  return (
    <article className="panel credit-vault-panel">
      <div className="panel-head">
        <span>VAULT</span>
        <h2>고대 금고</h2>
      </div>
      <div className="panel-action-body">
        <p className="panel-message">룬 회로를 모두 점등해 20 CR을 확보하세요.</p>
        <div className="button-row">
          <button className="btn primary" type="button" onClick={handleOpen} disabled={isCoolingDown}>
            {isCoolingDown ? `재가동 ${formatRemainingTime(availableAt, now)}` : "금고 해제"}
          </button>
          <small className="credit-vault-reward">보상 20 CR</small>
        </div>
      </div>

      {isOpen && (
        <div className="credit-vault-overlay" role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget && !isSubmitting) setIsOpen(false);
        }}>
          <section className="credit-vault-modal" role="dialog" aria-modal="true" aria-labelledby="creditVaultTitle">
            <div className="panel-head">
              <span>VAULT://03</span>
              <h2 id="creditVaultTitle">고대 금고 해제</h2>
            </div>
            {isLoading ? (
              <p className="panel-message">금고 연결 중...</p>
            ) : mask !== null ? (
              <>
                <p className="credit-vault-instruction">룬 하나를 조작하면 인접한 룬도 함께 반전됩니다.</p>
                <div className="rune-grid" aria-label="룬 회로">
                  {Array.from({ length: 9 }, (_, cellIndex) => (
                    <button
                      className={`rune-cell ${(mask & (1 << cellIndex)) !== 0 ? "is-lit" : ""}`}
                      type="button"
                      key={cellIndex}
                      onClick={() => void handleRuneClick(cellIndex)}
                      disabled={isSubmitting || isComplete}
                      aria-label={`${cellIndex + 1}번 룬 ${(mask & (1 << cellIndex)) !== 0 ? "점등" : "소등"}`}
                    >
                      {"◇"}
                    </button>
                  ))}
                </div>
              </>
            ) : null}
            {message && <p className={`auth-message ${isComplete ? "" : "is-error"}`} role="status">{message}</p>}
            <div className="button-row credit-vault-actions">
              <button className="btn ghost" type="button" onClick={() => setIsOpen(false)} disabled={isSubmitting}>
                {isComplete ? "닫기" : "나중에"}
              </button>
            </div>
          </section>
        </div>
      )}
    </article>
  );
}

function toggleRune(mask: number, cellIndex: number) {
  let toggleMask = 1 << cellIndex;

  if (cellIndex >= 3) toggleMask |= 1 << (cellIndex - 3);
  if (cellIndex < 6) toggleMask |= 1 << (cellIndex + 3);
  if (cellIndex % 3 !== 0) toggleMask |= 1 << (cellIndex - 1);
  if (cellIndex % 3 !== 2) toggleMask |= 1 << (cellIndex + 1);

  return mask ^ toggleMask;
}

function formatRemainingTime(availableAt: string | null, now: number) {
  if (!availableAt) return "";

  const seconds = Math.max(0, Math.ceil((Date.parse(availableAt) - now) / 1000));
  return `${seconds}초`;
}
