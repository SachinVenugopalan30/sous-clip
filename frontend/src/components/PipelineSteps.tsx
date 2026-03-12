import { Download, Mic, ChefHat, Check, Send } from "lucide-react";
import { motion } from "motion/react";

const BASE_STEPS = [
  { key: "downloading", label: "Download", icon: Download },
  { key: "transcribing", label: "Transcribe", icon: Mic },
  { key: "extracting", label: "Extract", icon: ChefHat },
  { key: "saved", label: "Saved", icon: Check },
] as const;

const MEALIE_STEP = { key: "mealie" as const, label: "Mealie", icon: Send };

export type StepKey = (typeof BASE_STEPS)[number]["key"] | "mealie";

interface PipelineStepsProps {
  currentStep: StepKey | null;
  error?: boolean;
  percent?: number;
  isComplete?: boolean;
  showMealie?: boolean;
}

export function PipelineSteps({
  currentStep,
  error,
  percent,
  isComplete,
  showMealie,
}: PipelineStepsProps) {
  const steps = showMealie ? [...BASE_STEPS, MEALIE_STEP] : [...BASE_STEPS];

  const currentIndex = currentStep
    ? steps.findIndex((s) => s.key === currentStep)
    : -1;

  // When fully complete, all steps are done
  const effectiveIndex = isComplete ? steps.length : currentIndex;

  return (
    <div className="flex items-center gap-0">
      {steps.map((step, i) => {
        const Icon = step.icon;
        const isDone = i < effectiveIndex;
        const isActive = i === effectiveIndex && !isComplete;
        const isLast = i === steps.length - 1;

        return (
          <div key={step.key} className="flex items-center">
            {/* Node */}
            <div className="relative flex flex-col items-center">
              <div className="relative">
                {/* Pulse ring for active node */}
                {isActive && !error && (
                  <motion.div
                    className="absolute -inset-1 rounded-full bg-accent/20"
                    animate={{ scale: [1, 1.4, 1], opacity: [0.5, 0, 0.5] }}
                    transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                  />
                )}

                {/* Node circle */}
                <motion.div
                  className={`relative z-10 flex h-8 w-8 items-center justify-center rounded-full border-2 transition-colors duration-300 ${
                    isDone
                      ? "border-accent-alt bg-accent-alt text-white"
                      : isActive
                        ? error
                          ? "border-red-500 bg-red-50 text-red-600"
                          : "border-accent bg-accent/10 text-accent"
                        : "border-border bg-surface text-muted-foreground/40"
                  }`}
                  initial={false}
                  animate={
                    isDone
                      ? { scale: [1, 1.15, 1] }
                      : {}
                  }
                  transition={{ duration: 0.3, ease: "easeOut" }}
                >
                  {isDone ? (
                    <Check className="h-3.5 w-3.5" strokeWidth={3} />
                  ) : (
                    <Icon className="h-3.5 w-3.5" />
                  )}
                </motion.div>
              </div>

              {/* Label beneath node */}
              <span
                className={`mt-1.5 text-[10px] font-medium leading-none whitespace-nowrap ${
                  isDone
                    ? "text-accent-alt"
                    : isActive
                      ? error
                        ? "text-red-600"
                        : "text-accent"
                      : "text-muted-foreground/40"
                }`}
              >
                {step.label}
                {isActive && percent != null && percent > 0 && (
                  <span className="ml-0.5 font-mono tabular-nums opacity-70">
                    {" "}{percent}%
                  </span>
                )}
              </span>
            </div>

            {/* Connector line */}
            {!isLast && (
              <div className="relative mx-1 h-0.5 w-6 sm:w-10 self-start mt-[15px]">
                {/* Background track */}
                <div className="absolute inset-0 rounded-full bg-border" />

                {/* Filled portion */}
                <motion.div
                  className="absolute inset-y-0 left-0 rounded-full bg-accent-alt"
                  initial={false}
                  animate={{
                    width: isDone
                      ? "100%"
                      : isActive && percent != null
                        ? `${Math.min(percent, 100)}%`
                        : "0%",
                  }}
                  transition={{ duration: 0.4, ease: "easeOut" }}
                />

                {/* Animated shimmer for active connector */}
                {isActive && (
                  <motion.div
                    className="absolute inset-y-0 left-0 w-3 rounded-full bg-gradient-to-r from-accent/40 to-transparent"
                    animate={{ x: [0, 24, 0] }}
                    transition={{
                      repeat: Infinity,
                      duration: 1.5,
                      ease: "easeInOut",
                    }}
                  />
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
