import { useEffect, useState } from "react";
import { CLIENT_VERSION } from "../../version";

type VersionManifest = {
  latest: string;
  minimum: string;
};

type UpdateState = {
  status: "current" | "available" | "required" | "unknown";
  latest: string;
  minimum: string;
};

const CHECK_INTERVAL_MS = 60_000;

export function useUpdateCheck() {
  const [state, setState] = useState<UpdateState>({
    status: "current",
    latest: CLIENT_VERSION,
    minimum: CLIENT_VERSION,
  });

  useEffect(() => {
    let cancelled = false;

    async function checkVersion() {
      const nextState = await getUpdateState();

      if (!cancelled) {
        setState(nextState);
      }
    }

    void checkVersion();
    const intervalId = window.setInterval(checkVersion, CHECK_INTERVAL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, []);

  return state;
}

async function getUpdateState(): Promise<UpdateState> {
  try {
    const response = await fetch(`/version.json?t=${Date.now()}`, {
      cache: "no-store",
    });

    if (!response.ok) {
      return {
        status: "unknown",
        latest: CLIENT_VERSION,
        minimum: CLIENT_VERSION,
      };
    }

    const manifest = await response.json() as VersionManifest;

    if (compareVersions(CLIENT_VERSION, manifest.minimum) < 0) {
      return {
        status: "required",
        latest: manifest.latest,
        minimum: manifest.minimum,
      };
    }

    if (compareVersions(CLIENT_VERSION, manifest.latest) < 0) {
      return {
        status: "available",
        latest: manifest.latest,
        minimum: manifest.minimum,
      };
    }

    return {
      status: "current",
      latest: manifest.latest,
      minimum: manifest.minimum,
    };
  } catch {
    return {
      status: "unknown",
      latest: CLIENT_VERSION,
      minimum: CLIENT_VERSION,
    };
  }
}

function compareVersions(left: string, right: string) {
  const leftParts = parseVersion(left);
  const rightParts = parseVersion(right);

  for (let index = 0; index < 3; index += 1) {
    if (leftParts[index] > rightParts[index]) return 1;
    if (leftParts[index] < rightParts[index]) return -1;
  }

  return 0;
}

function parseVersion(version: string) {
  return version
    .split(".")
    .slice(0, 3)
    .map((part) => Number.parseInt(part, 10))
    .map((part) => Number.isFinite(part) ? part : 0)
    .concat([0, 0, 0])
    .slice(0, 3);
}
