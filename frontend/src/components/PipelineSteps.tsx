import { Download, Mic, ChefHat, Check, Send } from "lucide-react";

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
  isComplete?: boolean;
  showMealie?: boolean;
}

/** Stations on the line. The rail only fills as whole stations finish; no in-between amount is implied. */
export function PipelineSteps({ currentStep, isComplete, showMealie }: PipelineStepsProps) {
  const steps = showMealie ? [...BASE_STEPS, MEALIE_STEP] : BASE_STEPS;
  const current = isComplete ? steps.length : steps.findIndex((s) => s.key === currentStep);
  const pos = Math.min(1, Math.max(0, current) / (steps.length - 1));

  return (
    <ol className="stn" style={{ "--n": steps.length, "--pos": pos } as React.CSSProperties}>
      {steps.map((step, i) => {
        const Icon = step.icon;
        const done = i < current;
        const active = i === current;
        return (
          <li key={step.key} data-state={done ? "done" : active ? "active" : "todo"} aria-current={active ? "step" : undefined}>
            <span>{done ? <Check className="h-4 w-4" strokeWidth={3} /> : <Icon className="h-4 w-4" />}</span>
            {step.label}
          </li>
        );
      })}
    </ol>
  );
}
