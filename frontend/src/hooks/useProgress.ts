import { useEffect, useEffectEvent, useRef, useState } from "react";
import { useAuthStore } from "../stores/auth";

export interface VideoMeta {
  title: string;
  channel?: string;
  duration?: number; // seconds
  thumbnail?: string; // URL
}

export interface PipelineProgress {
  item_id: string;
  step: "downloading" | "transcribing" | "extracting" | "saved" | "mealie";
  status: "pending" | "active" | "complete" | "error";
  percent?: number;
  meta?: VideoMeta;
  text?: string; // one transcript segment, while transcribing
}

export function useProgress(
  userId: string,
  onComplete?: (itemId: string, title?: string) => void
) {
  const [progress, setProgress] = useState<Map<string, PipelineProgress>>(
    new Map()
  );
  const [metaMap, setMetaMap] = useState<Map<string, VideoMeta>>(new Map());
  const [transcripts, setTranscripts] = useState<Map<string, string>>(new Map());
  const token = useAuthStore((s) => s.token);
  const titles = useRef(new Map<string, string>()); // latest title per item, for onComplete
  const complete = useEffectEvent((itemId: string, title?: string) => onComplete?.(itemId, title));

  useEffect(() => {
    const eventSource = new EventSource(
      `/api/progress/${userId}?token=${token}`
    );

    eventSource.addEventListener("progress", (event) => {
      const data: PipelineProgress = JSON.parse(event.data);
      setProgress((prev) => new Map(prev).set(data.item_id, data));

      if (data.meta) {
        titles.current.set(data.item_id, data.meta.title);
        setMetaMap((prev) => new Map(prev).set(data.item_id, data.meta!));
      }

      // A new attempt (retry) re-emits every segment, so start the transcript over
      if (data.step === "transcribing" && data.status === "active" && !data.text) {
        setTranscripts((prev) => {
          const next = new Map(prev);
          next.delete(data.item_id);
          return next;
        });
      }

      if (data.text) {
        const text = data.text;
        setTranscripts((prev) =>
          new Map(prev).set(data.item_id, `${prev.get(data.item_id) ?? ""} ${text}`.trim())
        );
      }

      if (data.step === "saved" && data.status === "complete") {
        complete(data.item_id, titles.current.get(data.item_id));
      }
    });

    eventSource.onerror = () => {
      eventSource.close();
    };

    return () => eventSource.close();
  }, [userId, token]);

  return { progress, metaMap, transcripts };
}
