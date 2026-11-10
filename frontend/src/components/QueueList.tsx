import { Fragment, useState } from "react";
import { toast } from "sonner";
import { RotateCcw, X, ArrowRight } from "lucide-react";
import { PipelineSteps } from "./PipelineSteps";
import { Link } from "@tanstack/react-router";
import { useCancelQueueItem, useRetryQueueItem } from "../hooks/useQueue";
import type { QueueItem, Recipe } from "../lib/api";
import { captionTail, cleanTitle, formatDuration, rowState, serialNumbers } from "../lib/queue";
import type { PipelineProgress, VideoMeta } from "../hooks/useProgress";

interface QueueListProps {
  items: QueueItem[];
  userId: string;
  progress: Map<string, PipelineProgress>;
  metaMap: Map<string, VideoMeta>;
  transcripts: Map<string, string>;
  recipes: Recipe[];
  completingIds?: Set<string>;
}

const STATION_LABEL: Record<PipelineProgress["step"], string> = {
  downloading: "Downloading the video",
  transcribing: "Transcribing the audio",
  extracting: "Writing up the recipe",
  saved: "Saving",
  mealie: "Sending to Mealie",
};

const hostOf = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
};

/** Falls back to the designed plate when the photo fails to load. */
function Thumb({ src, fallback }: { src: string; fallback: React.ReactNode }) {
  const [bad, setBad] = useState(false);
  return bad ? fallback : <img src={src} alt="" onError={() => setBad(true)} />;
}

const WAVE = Array.from({ length: 16 }, (_, n) => n * ((n % 3) + 1));

/** What the saved recipe really holds; fields that were not given are left out. */
function recipeFields(r: Recipe): string[] {
  return [
    r.title,
    r.ingredients.length ? `${r.ingredients.length} ingredients` : "",
    r.instructions.length ? `${r.instructions.length} steps` : "",
    r.prep_time_minutes != null ? `${r.prep_time_minutes} min prep` : "",
    r.cook_time_minutes != null ? `${r.cook_time_minutes} min cook` : "",
    r.servings != null ? `${r.servings} servings` : "",
    r.tags.join(" / "),
  ].filter(Boolean);
}

export function QueueList({ items, userId, progress, metaMap, transcripts, recipes, completingIds }: QueueListProps) {
  const cancelItem = useCancelQueueItem();
  const retryItem = useRetryQueueItem();
  const serials = serialNumbers(items.map((i) => i.id), completingIds);

  return (
    <ul>
      {items.map((item, index) => {
        const prog = progress.get(item.id);
        const meta = metaMap.get(item.id);
        const text = transcripts.get(item.id) ?? "";
        const s = rowState({
          status: item.status,
          completing: !!completingIds?.has(item.id),
          step: prog?.step,
          hasThumbnail: !!meta?.thumbnail,
          hasMeta: !!meta,
        });
        const step = prog?.step ?? "downloading";
        // The saved event carries no recipe; the recipe row records which queue item made it
        const recipe = s.isCompleted ? recipes.find((r) => r.queue_item_id === item.id) : undefined;
        const rawTitle = recipe?.title ?? meta?.title;
        const title = rawTitle && cleanTitle(rawTitle);
        const big = s.isInProgress || (s.isCompleted && !!meta?.thumbnail);
        const fetching = s.isInProgress && !meta;
        const fallback = <div className={`plate-fb${s.showThumbnailSkeleton ? " sk" : ""}`}>{title && <span>{title}</span>}</div>;
        // One line: number, channel, length, then the host as the link (the full URL is its name)
        // With no title the host is already the heading, so it becomes the link there and is not repeated
        const untitled = !title && !fetching;
        const link = (text: string) => (
          <a href={item.url} target="_blank" rel="noopener noreferrer" title={item.url} aria-label={`${hostOf(item.url)}, opens in a new tab`}>{text}</a>
        );
        const facts = [
          !s.isCompleted && `No. ${serials[index]}`,
          meta?.channel && <span key="c" className="jch">{meta.channel}</span>,
          meta?.duration != null && formatDuration(meta.duration),
          !untitled && <Fragment key="u">{link(hostOf(item.url))}</Fragment>,
        ].filter(Boolean);
        const percent = step === "downloading" ? prog?.percent : undefined;

        return (
          <li key={item.id} className={`job in${big ? "" : " sm"}`} style={{ "--i": Math.min(index, 6) } as React.CSSProperties}>
            <div className="plate">
              {meta?.thumbnail ? <Thumb key={meta.thumbnail} src={meta.thumbnail} fallback={fallback} /> : fallback}
            </div>
            {s.isInProgress && (step === "transcribing" || text) && (
              <div className="live">
                {step === "transcribing" && (
                  <div className="wave" aria-hidden="true">
                    {WAVE.map((n, i) => <b key={i} style={{ "--n": n } as React.CSSProperties} />)}
                  </div>
                )}
                <div className={`karaoke${text ? "" : " wait"}`}>
                  <p>{text ? captionTail(text) : "Waiting for the first words"}</p>
                </div>
              </div>
            )}

            <div className="jr">
              <div className="jh">
                <h3 className={untitled ? "jlink" : undefined}>{title || (fetching ? "Fetching video info" : link(hostOf(item.url)))}</h3>
                <p className="mono jmeta">
                  {facts.map((f, i) => <Fragment key={i}>{i > 0 && <i aria-hidden="true">/</i>}{f}</Fragment>)}
                </p>
              </div>

              <div className="jx">
                {s.isFailed ? (
                  <>
                    <p className="jfail" role="alert">{item.error || "Something went wrong during extraction"}</p>
                    <div className="jact">
                      <button type="button" className="jbtn press" onClick={() => retryItem.mutate({ userId, itemId: item.id }, { onError: (e) => toast.error(e.message || "Could not retry") })}>
                        <RotateCcw className="h-4 w-4" /> Try again
                      </button>
                    </div>
                  </>
                ) : s.isPending ? (
                  <div className="jact">
                    <span className="mono" style={{ alignSelf: "center" }}>Queued</span>
                    <button type="button" className="jbtn press" aria-label={`Cancel ${title ?? item.url}`} onClick={() => cancelItem.mutate({ userId, itemId: item.id }, { onError: (e) => toast.error(e.message || "Could not cancel") })}>
                      <X className="h-4 w-4" /> Cancel
                    </button>
                  </div>
                ) : (
                  <>
                    <PipelineSteps currentStep={step} isComplete={s.isCompleted} showMealie={step === "mealie"} />
                    {s.isInProgress && (
                      <div className="jstate mono">
                        <span aria-live="polite">{STATION_LABEL[step]}</span>
                        {percent != null && percent > 0 && <span aria-hidden="true">{Math.round(percent)}%</span>}
                      </div>
                    )}
                    {s.isCompleted && (
                      <>
                        <p className="jdone">Order up.</p>
                        {recipe && (
                          <>
                            <ul className="fields">
                              {recipeFields(recipe).map((f, i) => (
                                <li key={`${i}${f}`} className="in" style={{ "--i": i } as React.CSSProperties}>{f}</li>
                              ))}
                            </ul>
                            <div className="jact">
                              <Link to="/recipe/$recipeId" params={{ recipeId: String(recipe.id) }} className="jbtn jopen press">
                                Open recipe <ArrowRight className="h-4 w-4" />
                              </Link>
                            </div>
                          </>
                        )}
                      </>
                    )}
                  </>
                )}
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
