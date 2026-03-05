import {
  X,
  RotateCcw,
  Loader2,
  AlertCircle,
  User,
  Clock,
  ListOrdered,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Button } from "./ui/button";
import { PipelineSteps } from "./PipelineSteps";
import { useCancelQueueItem, useRetryQueueItem } from "../hooks/useQueue";
import type { QueueItem } from "../lib/api";
import type { PipelineProgress, VideoMeta } from "../hooks/useProgress";

interface QueueListProps {
  items: QueueItem[];
  userId: string;
  progress: Map<string, PipelineProgress>;
  metaMap: Map<string, VideoMeta>;
  completingIds?: Set<string>;
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/** Placeholder shown while fetching video info */
function MetaSkeleton({ url }: { url: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <p className="truncate text-sm font-medium text-muted-foreground">
        {url}
      </p>
      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground/60">
        <Loader2 className="h-3 w-3 animate-spin" />
        <span>Fetching video info…</span>
      </div>
    </div>
  );
}

/** Resolved video info display */
function MetaInfo({ meta }: { meta: VideoMeta }) {
  return (
    <motion.div
      className="flex flex-col gap-1"
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      <p className="text-sm font-medium leading-snug line-clamp-1">
        {meta.title}
      </p>
      <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
        {meta.channel && (
          <span className="flex items-center gap-1 truncate">
            <User className="h-3 w-3 shrink-0 opacity-60" />
            <span className="truncate">{meta.channel}</span>
          </span>
        )}
        {meta.duration != null && (
          <span className="flex items-center gap-1 tabular-nums whitespace-nowrap">
            <Clock className="h-3 w-3 shrink-0 opacity-60" />
            {formatDuration(meta.duration)}
          </span>
        )}
      </div>
    </motion.div>
  );
}

/** Thumbnail with rounded corners and loading state */
function Thumbnail({ src }: { src: string }) {
  return (
    <motion.div
      className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-border/30 sm:h-[72px] sm:w-[72px]"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.25 }}
    >
      <img
        src={src}
        alt=""
        className="h-full w-full object-cover"
        loading="lazy"
      />
    </motion.div>
  );
}

/** Thumbnail skeleton while loading */
function ThumbnailSkeleton() {
  return (
    <div className="h-16 w-16 shrink-0 animate-pulse rounded-lg bg-border/40 sm:h-[72px] sm:w-[72px]" />
  );
}

export function QueueList({
  items,
  userId,
  progress,
  metaMap,
  completingIds,
}: QueueListProps) {
  const cancelItem = useCancelQueueItem();
  const retryItem = useRetryQueueItem();

  if (items.length === 0) return null;

  // Count non-completing items for the summary
  const activeItems = items.filter((i) => !completingIds?.has(i.id));
  const completedCount = items.length - activeItems.length;

  return (
    <div>
      {/* Queue summary */}
      <div className="mb-4 flex items-center gap-2 text-xs text-muted-foreground">
        <ListOrdered className="h-3.5 w-3.5" />
        <motion.span
          key={`${activeItems.length}-${items.length}`}
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          {activeItems.length === 1
            ? "1 video remaining"
            : `${activeItems.length} videos remaining`}
          {completedCount > 0 && ` · ${completedCount} just finished`}
        </motion.span>
      </div>

      <AnimatePresence mode="popLayout">
        {items.map((item, index) => {
          const prog = progress.get(item.id);
          const meta = metaMap.get(item.id);
          const isCompleting = completingIds?.has(item.id);
          const isInProgress = item.status === "in_progress";
          const isPending = item.status === "pending";
          const isFailed = item.status === "failed";
          const isCompleted = item.status === "completed" || isCompleting;

          // Serial number: count only non-completing items up to this index
          const serialNumber = isCompleting
            ? 0
            : items
                .slice(0, index)
                .filter((i) => !completingIds?.has(i.id)).length + 1;

          // Meta is available once download finishes (step moves past "downloading")
          const hasMeta = !!meta;
          const showMetaSkeleton =
            isInProgress &&
            !hasMeta &&
            (prog?.step === "downloading" || !prog);
          const showThumbnailSkeleton =
            isInProgress && !meta?.thumbnail && (prog?.step === "downloading" || !prog);

          return (
            <motion.div
              key={item.id}
              layout
              initial={{ opacity: 0, y: 12, scale: 0.97 }}
              animate={{
                opacity: isCompleting ? 0.4 : 1,
                y: 0,
                scale: isCompleting ? 0.98 : 1,
              }}
              exit={{ opacity: 0, height: 0, marginBottom: 0, y: -8, scale: 0.95, transition: { duration: 0.5, ease: "easeInOut" } }}
              transition={{
                duration: isCompleting ? 1.5 : 0.3,
                ease: "easeOut",
                layout: { duration: 0.4, ease: "easeInOut" },
              }}
              style={{ marginTop: index > 0 ? 16 : 0 }}
              className={`group relative overflow-hidden rounded-xl border bg-surface transition-shadow ${
                isCompleting
                  ? "border-accent-alt/30"
                  : isFailed
                    ? "border-red-300"
                    : isInProgress
                      ? "border-accent/20 shadow-sm"
                      : "border-border"
              }`}
            >
              {/* Top accent bar */}
              {isInProgress && !isCompleting && (
                <motion.div
                  className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-accent/60 via-accent to-accent/60"
                  animate={{ backgroundPosition: ["0% 0%", "200% 0%"] }}
                  transition={{ repeat: Infinity, duration: 3, ease: "linear" }}
                  style={{ backgroundSize: "200% 100%" }}
                />
              )}

              {/* Completion countdown bar */}
              {isCompleting && (
                <motion.div
                  className="absolute inset-x-0 top-0 h-0.5 bg-accent-alt"
                  initial={{ scaleX: 1 }}
                  animate={{ scaleX: 0 }}
                  transition={{ duration: 5, ease: "linear" }}
                  style={{ transformOrigin: "right" }}
                />
              )}

              <div className="px-4 py-3 sm:px-5 sm:py-4">
                <div className="flex items-start gap-3">
                  {/* Serial number badge */}
                  {!isCompleting && (
                    <motion.div
                      layout
                      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-bg text-[11px] font-bold tabular-nums text-muted-foreground"
                    >
                      {serialNumber}
                    </motion.div>
                  )}

                  {/* Thumbnail */}
                  {meta?.thumbnail ? (
                    <Thumbnail src={meta.thumbnail} />
                  ) : showThumbnailSkeleton ? (
                    <ThumbnailSkeleton />
                  ) : null}

                  {/* Content area */}
                  <div className="min-w-0 flex-1">
                    {/* Top row: video info (left) + actions (right) */}
                    <div className="flex items-start justify-between gap-4">
                      {/* Left: video metadata or skeleton */}
                      <div className="min-w-0 flex-1">
                        {hasMeta ? (
                          <MetaInfo meta={meta} />
                        ) : showMetaSkeleton ? (
                          <MetaSkeleton url={item.url} />
                        ) : isPending ? (
                          <div className="flex items-center gap-2">
                            <p className="truncate text-sm font-medium text-muted-foreground">
                              {item.url}
                            </p>
                            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                              <Loader2 className="h-2.5 w-2.5 animate-spin" />
                              Queued
                            </span>
                          </div>
                        ) : (
                          <p className="truncate text-sm font-medium">{item.url}</p>
                        )}
                      </div>

                      {/* Right: actions */}
                      <div className="flex shrink-0 items-center gap-1">
                        {isCompleting && (
                          <motion.span
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="inline-flex items-center gap-1 rounded-full bg-accent-alt/10 px-2.5 py-1 text-[10px] font-semibold text-accent-alt"
                          >
                            Done
                          </motion.span>
                        )}
                        {isPending && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() =>
                              cancelItem.mutate({ userId, itemId: item.id })
                            }
                          >
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        {isFailed && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 gap-1.5 text-xs"
                            onClick={() =>
                              retryItem.mutate({ userId, itemId: item.id })
                            }
                          >
                            <RotateCcw className="h-3 w-3" />
                            Retry
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Source URL (small, beneath meta when meta is shown) */}
                    {hasMeta && (isInProgress || isCompleted) && (
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-1 block truncate text-[11px] text-muted-foreground/60 hover:text-accent transition-colors"
                      >
                        {item.url}
                      </a>
                    )}

                    {/* Pipeline visualization — centered at bottom */}
                    {isInProgress && !isCompleting && (
                      <motion.div
                        className="mt-3 flex justify-center sm:justify-start"
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                      >
                        <PipelineSteps
                          currentStep={prog?.step ?? "downloading"}
                          percent={prog?.percent}
                        />
                      </motion.div>
                    )}

                    {/* Completed pipeline — show all done */}
                    {isCompleted && !isInProgress && (
                      <motion.div
                        className="mt-3 flex justify-center sm:justify-start"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: isCompleting ? 0.5 : 0.7 }}
                      >
                        <PipelineSteps currentStep="saved" isComplete />
                      </motion.div>
                    )}

                    {/* Error state */}
                    {isFailed && (
                      <motion.div
                        className="mt-3 flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                      >
                        <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-500" />
                        <p className="text-xs leading-relaxed text-red-700">
                          {item.error || "Something went wrong during extraction"}
                        </p>
                      </motion.div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
