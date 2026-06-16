import { CLIENT_VERSION } from "../../version";
import { useUpdateCheck } from "./useUpdateCheck";

export function UpdateBanner() {
  const update = useUpdateCheck();

  if (update.status === "current" || update.status === "unknown") {
    return null;
  }

  const isRequired = update.status === "required";

  return (
    <div className={`update-banner ${isRequired ? "is-required" : ""}`} role="status">
      <div>
        <span>{isRequired ? "CLIENT_VERSION_EXPIRED" : "CLIENT_UPDATE_AVAILABLE"}</span>
        <strong>{CLIENT_VERSION} → {update.latest}</strong>
      </div>
      <button className="btn primary" type="button" onClick={() => window.location.reload()}>
        RECONNECT
      </button>
    </div>
  );
}
