import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
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
    const manifest = await loadVersionManifest();

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

async function loadVersionManifest(): Promise<VersionManifest> {
  if (supabase) {
    const { data, error } = await supabase.rpc("get_app_version");

    if (!error && isVersionManifest(data)) {
      return data;
    }
  }

  const response = await fetch(`/version.json?t=${Date.now()}`, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("version_manifest_unavailable");
  }

  const manifest = await response.json() as unknown;
  if (!isVersionManifest(manifest)) {
    throw new Error("version_manifest_invalid");
  }

  return manifest;
}

function isVersionManifest(value: unknown): value is VersionManifest {
  if (!value || typeof value !== "object") return false;

  const manifest = value as Partial<VersionManifest>;
  return typeof manifest.latest === "string" && typeof manifest.minimum === "string";
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
