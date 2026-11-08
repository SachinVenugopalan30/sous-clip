import type { QueueItem } from "./api.ts";

export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

interface RowInput {
  status: QueueItem["status"];
  completing: boolean;
  step?: string; // current pipeline step, if progress has arrived
  hasThumbnail: boolean;
  hasMeta: boolean;
}

export function rowState({ status, completing, step, hasThumbnail, hasMeta }: RowInput) {
  const isInProgress = status === "in_progress";
  // Meta is available once download finishes (step moves past "downloading")
  const downloading = isInProgress && (step === "downloading" || !step);
  return {
    isInProgress,
    isPending: status === "pending",
    isFailed: status === "failed",
    isCompleted: status === "completed" || completing,
    showMetaSkeleton: downloading && !hasMeta,
    showThumbnailSkeleton: downloading && !hasThumbnail,
  };
}

/** 1-based position among non-completing items; completing items get 0. */
export function serialNumbers(ids: string[], completingIds?: Set<string>): number[] {
  let n = 0;
  return ids.map((id) => (completingIds?.has(id) ? 0 : ++n));
}
