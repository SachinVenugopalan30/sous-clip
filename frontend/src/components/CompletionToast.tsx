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
    <div role="status" className="toast-row">
      <Check className="h-4 w-4 shrink-0" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <p className="font-display text-base">Order up.</p>
        <p className="mono truncate">{title}</p>
      </div>
      <span className="mono shrink-0">{seconds}s</span>

      {/* Countdown bar */}
      <motion.div
        className="toast-bar"
        initial={{ scaleX: 1 }}
        animate={{ scaleX: 0 }}
        transition={{ duration: duration / 1000, ease: "linear" }}
      />
    </div>
  );
}

export function showCompletionToast(title: string) {
  toast.custom(
    (id) => <CompletionToast id={id} title={title} />,
    { duration: Infinity, classNames: { toast: "toast-ok" } }
  );
}
