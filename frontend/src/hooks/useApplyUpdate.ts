import { useState } from "react";
import { toast } from "sonner";
import { api } from "../lib/api";

const UPDATE_TIMEOUT_MS = 5 * 60 * 1000;

// Polls /health until the app comes back on a different version; false after the timeout
async function waitForNewVersion(current: string): Promise<boolean> {
  const deadline = Date.now() + UPDATE_TIMEOUT_MS;
  while (Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 3000));
    try {
      const res = await fetch("/health", { cache: "no-store" });
      if (res.ok && (await res.json()).version !== current) return true;
    } catch {
      // app container is restarting
    }
  }
  return false;
}

async function reloadFresh() {
  // The PWA precache would otherwise serve the old bundle after the restart
  const registrations = (await navigator.serviceWorker?.getRegistrations()) ?? [];
  await Promise.all(registrations.map((r) => r.unregister()));
  location.reload();
}

/** Starts a Watchtower update and waits for the app to come back on a new version. */
export function useApplyUpdate(currentVersion: string | undefined) {
  const [phase, setPhase] = useState<"idle" | "updating" | "failed">("idle");

  const applyUpdate = async () => {
    if (!currentVersion) return;
    setPhase("updating");
    try {
      const result = await api.update.start();
      if (!result.ok) {
        toast.error(result.error || "Update failed to start");
        setPhase("idle");
        return;
      }
    } catch {
      // Connection dropped: Watchtower is most likely already replacing this container
    }
    if (await waitForNewVersion(currentVersion)) await reloadFresh();
    else setPhase("failed");
  };

  return { phase, applyUpdate };
}
