"use client";

import { Check } from "lucide-react";
import type { DatasetWizardStepId } from "@/types/datasetWizard";
import { cn } from "@/lib/utils";

interface WizardStepMeta {
  id: DatasetWizardStepId;
  label: string;
  description: string;
}

interface WizardStepperProps {
  steps: WizardStepMeta[];
  currentStep: DatasetWizardStepId;
  inProgressStep: DatasetWizardStepId;
  completedSteps: DatasetWizardStepId[];
  startedSteps: DatasetWizardStepId[];
  onStepClick: (id: DatasetWizardStepId) => void;
}

export function WizardStepper(props: WizardStepperProps) {
  const {
    steps,
    currentStep,
    inProgressStep,
    completedSteps,
    startedSteps,
    onStepClick,
  } = props;

  return (
    <ol className="flex flex-col gap-3 rounded-2xl border border-border/70 bg-card/80 p-3 text-xs shadow-sm backdrop-blur sm:flex-row sm:items-center sm:justify-between sm:gap-2">
      {steps.map((step, index) => {
        const isCompleted = completedSteps.includes(step.id);
        const isStarted = startedSteps.includes(step.id);
        const isInProgress = step.id === inProgressStep;
        const isVisibleCurrent = step.id === currentStep;

        const isClickable = isStarted;

        return (
          <li
            key={step.id}
            className={cn(
              "flex flex-1 items-center gap-2 rounded-xl px-2 py-1.5",
              isVisibleCurrent
                ? "bg-primary/10 ring-1 ring-primary/40"
                : isCompleted
                  ? "bg-muted/40"
                  : isStarted
                    ? "opacity-90"
                    : "opacity-60",
            )}
          >
            <button
              type="button"
              className={cn(
                "flex flex-1 items-center gap-2 text-left",
                isClickable ? "cursor-pointer" : "cursor-default",
              )}
              onClick={() => {
                if (isClickable) {
                  onStepClick(step.id);
                }
              }}
            >
              <div
                className={cn(
                  "flex h-6 w-6 items-center justify-center rounded-full text-[0.7rem] font-semibold",
                  isInProgress
                    ? "bg-primary text-primary-foreground"
                    : isCompleted
                      ? "bg-emerald-500 text-emerald-50"
                      : "bg-muted text-muted-foreground",
                )}
              >
                {isCompleted && !isInProgress ? (
                  <Check className="h-3 w-3" />
                ) : (
                  index + 1
                )}
              </div>
              <div className="flex flex-col">
                <span className="text-[0.8rem] font-medium">{step.label}</span>
                <span className="text-[0.7rem] text-muted-foreground">
                  {step.description}
                </span>
              </div>
            </button>
          </li>
        );
      })}
    </ol>
  );
}
