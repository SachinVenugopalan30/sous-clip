import { useCallback, useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Send } from "lucide-react";
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

export const Route = createFileRoute("/submit")({
  component: SubmitPage,
});

function SubmitPage() {
  const [url, setUrl] = useState("");
  const userId = "default";
  const extract = useExtractRecipe();
  const { data: queueData } = useQueue(userId);
  const queryClient = useQueryClient();
  const hasHandledShare = useRef(false);

  const handleExpire = useCallback(
    (_itemId: string) => {
      queryClient.invalidateQueries({ queryKey: ["queue", userId] });
    },
    [queryClient, userId]
  );

  const { completingIds, startTimer } = useVisibilityTimer(5000, handleExpire);

  const metaMapRef = useRef<Map<string, { title: string }>>(new Map());

  const handleComplete = useCallback(
    (itemId: string) => {
      startTimer(itemId);
      queryClient.invalidateQueries({ queryKey: ["queue", userId] });
      queryClient.invalidateQueries({ queryKey: ["recipes"] });
      const meta = metaMapRef.current.get(itemId);
      showCompletionToast(meta?.title ?? "New recipe");
    },
    [startTimer, queryClient, userId]
  );

  const { progress, metaMap } = useProgress(userId, handleComplete);

  // Keep ref in sync so handleComplete can read latest meta
  useEffect(() => {
    metaMapRef.current = metaMap;
  }, [metaMap]);

  // Handle Share Target URL params (from PWA share sheet)
  useEffect(() => {
    if (hasHandledShare.current) return;
    hasHandledShare.current = true;

    const params = new URLSearchParams(window.location.search);
    const sharedUrl = params.get("url") || params.get("text") || "";
    if (sharedUrl) {
      const urlMatch = sharedUrl.match(/https?:\/\/[^\s]+/);
      if (urlMatch) {
        setUrl(urlMatch[0]);
        extract.mutate(
          { url: urlMatch[0], userId },
          {
            onSuccess: () => {
              toast.success("Video queued for extraction");
              setUrl("");
            },
            onError: (err) =>
              toast.error(err.message || "Failed to queue extraction"),
          }
        );
      }
      window.history.replaceState({}, "", "/submit");
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    extract.mutate(
      { url: url.trim(), userId },
      {
        onSuccess: () => {
          toast.success("Video queued for extraction");
          setUrl("");
        },
        onError: (err) => {
          toast.error(err.message || "Failed to queue extraction");
        },
      }
    );
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
        <Input
          placeholder="https://youtube.com/shorts/..."
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className="flex-1"
        />
        <Button
          type="submit"
          disabled={extract.isPending || !url.trim()}
          className="bg-accent text-white hover:bg-accent/90 active:scale-[0.97]"
        >
          <Send className="mr-2 h-4 w-4" />
          Extract
        </Button>
      </form>

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
