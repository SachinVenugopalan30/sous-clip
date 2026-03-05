import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import { motion } from "motion/react";
import { toast } from "sonner";

interface CompletionToastProps {
  id: string | number;
  title: string;
  duration?: number;
}

export function CompletionToast({
  id,
  title,
  duration = 5000,
}: CompletionToastProps) {
  const [remaining, setRemaining] = useState(duration);

  useEffect(() => {
    const interval = setInterval(() => {
      setRemaining((prev) => {
        const next = prev - 100;
        if (next <= 0) {
          clearInterval(interval);
          toast.dismiss(id);
          return 0;
        }
        return next;
      });
    }, 100);
    return () => clearInterval(interval);
  }, [id, duration]);

  const seconds = Math.ceil(remaining / 1000);

  return (
    <motion.div
      initial={{ opacity: 0, y: -8, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8, scale: 0.96 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="w-[356px] overflow-hidden rounded-xl border border-accent-alt/30 bg-surface shadow-lg"
    >
      <div className="flex items-start gap-3 px-4 py-3">
        <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent-alt/15">
          <Check className="h-3.5 w-3.5 text-accent-alt" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">Recipe extracted!</p>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            {title}
          </p>
        </div>
        <span className="shrink-0 tabular-nums text-xs text-muted-foreground/60">
          {seconds}s
        </span>
      </div>

      {/* Countdown bar */}
      <div className="h-1 w-full bg-accent-alt/10">
        <motion.div
          className="h-full bg-accent-alt"
          initial={{ scaleX: 1 }}
          animate={{ scaleX: 0 }}
          transition={{ duration: duration / 1000, ease: "linear" }}
          style={{ transformOrigin: "left" }}
        />
      </div>
    </motion.div>
  );
}

export function showCompletionToast(title: string) {
  toast.custom(
    (id) => <CompletionToast id={id} title={title} />,
    { duration: Infinity, unstyled: true }
  );
}
