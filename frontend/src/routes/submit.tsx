import { useCallback, useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { ClipboardPaste, Send } from "lucide-react";
import { toast } from "sonner";
import { QueueList } from "../components/QueueList";
import { showCompletionToast } from "../components/CompletionToast";
import type { QueueItem } from "../lib/api";
import { useExtractRecipe } from "../hooks/useExtract";
import { useQueue } from "../hooks/useQueue";
import { useProgress } from "../hooks/useProgress";
import { useVisibilityTimer } from "../hooks/useVisibilityTimer";
import { useRecipes } from "../hooks/useRecipes";
import { useMealieConfigured } from "../hooks/useSettings";

export const Route = createFileRoute("/submit")({
  component: SubmitPage,
});

const sharedParam = () => {
  const params = new URLSearchParams(window.location.search);
  return params.get("url") || params.get("text");
};

function SubmitPage() {
  // A link shared from the PWA share sheet arrives as ?url= or ?text=
  const [url, setUrl] = useState(
    () => sharedParam()?.match(/https?:\/\/[^\s]+/)?.[0] ?? ""
  );
  const [forwardToMealie, setForwardToMealie] = useState(false);
  const [error, setError] = useState("");
  const userId = "default";
  const extract = useExtractRecipe();
  const { data: queueData } = useQueue(userId);
  const { data: library } = useRecipes();
  const mealieConfigured = useMealieConfigured();
  const queryClient = useQueryClient();

  const handleExpire = useCallback(
    (_itemId: string) => {
      queryClient.invalidateQueries({ queryKey: ["queue", userId] });
    },
    [queryClient, userId]
  );

  const { completingIds, startTimer } = useVisibilityTimer(5000, handleExpire);

  const handleComplete = useCallback(
    (itemId: string, title?: string) => {
      startTimer(itemId);
      queryClient.invalidateQueries({ queryKey: ["queue", userId] });
      queryClient.invalidateQueries({ queryKey: ["recipes"] });
      showCompletionToast(title ?? "New recipe");
    },
    [startTimer, queryClient, userId]
  );

  const { progress, metaMap, transcripts } = useProgress(userId, handleComplete);

  const submit = (link: string) =>
    extract.mutate(
      { url: link, userId, forwardToMealie },
      {
        onSuccess: () => {
          toast.success("Video queued for extraction");
          setUrl("");
        },
        onError: (err) => setError(err.message || "Failed to queue extraction"),
      }
    );

  // Submit a shared link once, then strip it from the URL (this also stops a StrictMode re-run)
  useEffect(() => {
    if (!sharedParam()) return;
    window.history.replaceState({}, "", "/submit");
    if (url) submit(url);
    // oxlint-disable-next-line react-hooks/exhaustive-deps -- mount-only: url is the initial shared link and submit is recreated every render
  }, []);

  // Clipboard reads need HTTPS or localhost; hide the button where the browser can't do it
  const canPaste = !!navigator.clipboard?.readText;
  const handlePaste = async () => {
    try {
      const link = (await navigator.clipboard.readText()).match(/https?:\/\/\S+/)?.[0];
      if (link) setUrl(link);
      else toast.error("No link found on the clipboard");
    } catch {
      toast.error("Clipboard access was blocked; paste the link instead");
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const link = url.trim();
    if (!/^https?:\/\/\S+$/i.test(link)) {
      setError("Paste a full video link that starts with http:// or https://");
      return;
    }
    setError("");
    submit(link);
  };

  // queue.complete() drops an item from GET /queue at once, so a finished row is kept here for its hold.
  // ponytail: an item that vanishes before its saved event lands is not kept; hold it in state if that matters.
  const shown = useRef<QueueItem[]>([]);
  const live = queueData?.items ?? [];
  const liveById = new Map(live.map((i) => [i.id, i]));
  const kept = shown.current
    .filter((i) => liveById.has(i.id) || completingIds.has(i.id))
    .map((i) => liveById.get(i.id) ?? { ...i, status: "completed" as const });
  const keptIds = new Set(kept.map((i) => i.id));
  const rows = [...kept, ...live.filter((i) => !keptIds.has(i.id))];
  useEffect(() => {
    shown.current = rows;
  });
  const cooking = rows.filter((i) => (i.status === "pending" || i.status === "in_progress") && !completingIds.has(i.id)).length;

  return (
    <div className="ord display">
      <h1 className="in">
        Order <em>in.</em>
      </h1>

      <form onSubmit={handleSubmit} noValidate className="ord-form in" style={{ "--i": 1 } as React.CSSProperties}>
        <div className="req">
          <div className="ord-in">
            <label htmlFor="video-url" className="sr-only">Video URL</label>
            <input
              id="video-url"
              placeholder="Paste a video link"
              value={url}
              onChange={(e) => {
                setUrl(e.target.value);
                setError("");
              }}
              inputMode="url"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              aria-invalid={!!error}
              aria-describedby="video-url-err"
            />
            {/* On phones the link is usually already copied from the video app */}
            {canPaste && !url && (
              <button type="button" onClick={handlePaste} className="ord-paste press">
                <ClipboardPaste className="h-4 w-4" /> Paste
              </button>
            )}
          </div>
          <button type="submit" disabled={extract.isPending} className="ord-go press">
            <Send className="h-4 w-4" /> Extract recipe
          </button>
        </div>
        <p id="video-url-err" className="ord-err" role="alert">{error}</p>

        {mealieConfigured && (
          <button type="button" role="switch" aria-checked={forwardToMealie} onClick={() => setForwardToMealie(!forwardToMealie)} className="ord-sw">
            <i /> Also send to Mealie
          </button>
        )}
      </form>

      {rows.length > 0 && (
        <>
          <div className="lineh">
            <h2>On the line</h2>
            {cooking > 0 && <span className="mono">{cooking} still cooking</span>}
          </div>
          <QueueList
            items={rows}
            userId={userId}
            progress={progress}
            metaMap={metaMap}
            transcripts={transcripts}
            recipes={library?.recipes ?? []}
            completingIds={completingIds}
          />
        </>
      )}
    </div>
  );
}
