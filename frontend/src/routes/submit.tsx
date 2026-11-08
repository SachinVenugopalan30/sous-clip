import { useCallback, useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { ClipboardPaste, Send } from "lucide-react";
import { motion } from "motion/react";
import { toast } from "sonner";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { QueueList } from "../components/QueueList";
import { showCompletionToast } from "../components/CompletionToast";
import { useExtractRecipe } from "../hooks/useExtract";
import { useQueue } from "../hooks/useQueue";
import { useProgress } from "../hooks/useProgress";
import { useVisibilityTimer } from "../hooks/useVisibilityTimer";
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
  const userId = "default";
  const extract = useExtractRecipe();
  const { data: queueData } = useQueue(userId);
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

  const { progress, metaMap } = useProgress(userId, handleComplete);

  const submit = (link: string) =>
    extract.mutate(
      { url: link, userId, forwardToMealie },
      {
        onSuccess: () => {
          toast.success("Video queued for extraction");
          setUrl("");
        },
        onError: (err) => toast.error(err.message || "Failed to queue extraction"),
      }
    );

  // Submit a shared link once, then strip it from the address bar (which also stops a StrictMode re-run)
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
    if (!url.trim()) return;

    submit(url.trim());
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
    >
      <h1 className="font-display text-2xl font-bold sm:text-3xl">
        Extract Recipe
      </h1>
      <p className="mt-2 text-sm text-muted-foreground sm:text-base">
        Paste a YouTube Short, Instagram Reel, or TikTok URL.
      </p>

      <form
        onSubmit={handleSubmit}
        className="mt-6 flex flex-col gap-3 sm:flex-row"
      >
        <div className="relative flex-1">
          <Input
            placeholder="https://youtube.com/shorts/..."
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            inputMode="url"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            aria-label="Video URL"
            className="h-11 pr-20 sm:h-9"
          />
          {/* On phones the link is usually already copied from the video app */}
          {canPaste && !url && (
            <Button type="button" variant="ghost" size="sm" onClick={handlePaste} className="absolute right-1 top-1/2 h-9 -translate-y-1/2 sm:h-7">
              <ClipboardPaste className="mr-1 h-4 w-4" />
              Paste
            </Button>
          )}
        </div>
        <Button
          type="submit"
          disabled={extract.isPending || !url.trim()}
          className="h-11 bg-accent text-white hover:bg-accent/90 active:scale-[0.97] sm:h-9"
        >
          <Send className="mr-2 h-4 w-4" />
          Extract
        </Button>
      </form>

      {mealieConfigured && (
        <button
          type="button"
          role="switch"
          aria-checked={forwardToMealie}
          onClick={() => setForwardToMealie(!forwardToMealie)}
          className="mt-3 flex min-h-11 items-center gap-2.5 cursor-pointer select-none group sm:min-h-0"
        >
          <span
            className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full border transition-colors duration-200 ${
              forwardToMealie
                ? "border-accent bg-accent"
                : "border-border bg-border/50"
            }`}
          >
            <span
              className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow-sm transition-transform duration-200 ${
                forwardToMealie ? "translate-x-4" : "translate-x-0.5"
              }`}
            />
          </span>
          <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">
            Also send to Mealie
          </span>
        </button>
      )}

      {queueData && queueData.items.length > 0 && (
        <div className="mt-8">
          <QueueList
            items={queueData.items}
            userId={userId}
            progress={progress}
            metaMap={metaMap}
            completingIds={completingIds}
          />
        </div>
      )}
    </motion.div>
  );
}
