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
  const isInProgress = status === "in_progress" && !completing;
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

/** The latest words of a transcript, cut on a word boundary, so live captions stay bounded. */
export function captionTail(text: string, max = 130): string {
  if (text.length <= max) return text;
  const tail = text.slice(-max);
  const space = tail.indexOf(" ");
  return space < 0 ? tail : tail.slice(space + 1);
}

/** Display only: a video title without its trailing #hashtags, or the original if nothing else is left. */
export function cleanTitle(title: string): string {
  const words = title.trim().split(/\s+/);
  let end = words.length;
  // #2024 is a tag, #1 is part of the title
  while (end > 0 && /^#(?:\p{L}|\d+\p{L}|\d{4,})/u.test(words[end - 1])) end--;
  return words.slice(0, end).join(" ") || title;
}
