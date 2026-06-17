type AppEnvironment = "local" | "preview";

export function EnvironmentBanner() {
  const environment = getVisibleEnvironment();

  if (!environment) {
    return null;
  }

  return (
    <div className={`environment-banner is-${environment}`} role="status">
      {environment === "local" ? "LOCAL BUILD" : "PREVIEW BUILD"}
    </div>
  );
}

export function hasEnvironmentBanner() {
  return getVisibleEnvironment() !== null;
}

function getVisibleEnvironment(): AppEnvironment | null {
  const rawEnvironment = (__APP_ENV__ || (import.meta.env.DEV ? "local" : "")).toLowerCase();

  if (rawEnvironment === "local" || rawEnvironment === "development") {
    return "local";
  }

  if (rawEnvironment === "preview") {
    return "preview";
  }

  return null;
}
