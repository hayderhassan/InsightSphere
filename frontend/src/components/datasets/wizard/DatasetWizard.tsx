"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type {
  DatasetWizardState,
  DatasetWizardStepId,
} from "@/types/datasetWizard";
import { DatasetWizardStepUpload } from "./DatasetWizardStepUpload";
import { DatasetWizardStepColumns } from "./DatasetWizardStepColumns";
import { DatasetWizardStepGoals } from "./DatasetWizardStepGoals";
import { DatasetWizardStepReview } from "./DatasetWizardStepReview";
import { DatasetWizardSummary } from "./DatasetWizardSummary";
import { WizardStepper } from "./WizardStepper";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { API_BASE_URL, getAccessToken, apiFetch } from "@/lib/api";

const steps: { id: DatasetWizardStepId; label: string; description: string }[] =
  [
    {
      id: "upload",
      label: "Upload CSV",
      description: "Upload and analyse your dataset.",
    },
    {
      id: "columns",
      label: "Columns & fields",
      description: "Review detected columns and types.",
    },
    {
      id: "goals",
      label: "Goals & usage",
      description: "Tell us what you care about.",
    },
    {
      id: "review",
      label: "Review & confirm",
      description: "One last check before creating.",
    },
  ];

const initialState: DatasetWizardState = {
  datasetId: null,
  datasetName: "",
  uploadFileName: null,
  uploadStatus: "idle",
  uploadError: null,
  summary: null,
  columnTypes: {},
  targetColumn: null,
  metricColumns: [],
  timeColumn: null,
  datasetShape: "tabular",
  analysisGoal: "describe",
  positiveClass: null,
  entityKey: null,
  timeGrain: "none",
  timeGrainCustom: null,
  anomalyDirection: "both",
  notes: "",
};

export function DatasetWizard() {
  const router = useRouter();

  const [state, setState] = useState<DatasetWizardState>(initialState);
  const [currentStep, setCurrentStep] = useState<DatasetWizardStepId>("upload");
  const [startedSteps, setStartedSteps] = useState<DatasetWizardStepId[]>([
    "upload",
  ]);
  const [completedSteps, setCompletedSteps] = useState<DatasetWizardStepId[]>(
    [],
  );
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const currentIndex = steps.findIndex((s) => s.id === currentStep);

  // The "in progress" step: last started that isn't completed
  const inProgressStep: DatasetWizardStepId = useMemo(() => {
    for (let i = startedSteps.length - 1; i >= 0; i -= 1) {
      const stepId = startedSteps[i];
      if (!completedSteps.includes(stepId)) return stepId;
    }
    return startedSteps[startedSteps.length - 1] ?? "upload";
  }, [startedSteps, completedSteps]);

  function markStepStarted(stepId: DatasetWizardStepId) {
    setStartedSteps((prev) =>
      prev.includes(stepId) ? prev : [...prev, stepId],
    );
  }

  function markStepComplete(stepId: DatasetWizardStepId) {
    setCompletedSteps((prev) =>
      prev.includes(stepId) ? prev : [...prev, stepId],
    );
  }

  function goToStep(stepId: DatasetWizardStepId) {
    // Can navigate to any step that has started
    if (!startedSteps.includes(stepId)) return;
    setCurrentStep(stepId);
  }

  function handleNext() {
    const nextStep = steps[currentIndex + 1];
    if (!nextStep) return;

    markStepComplete(currentStep);
    markStepStarted(nextStep.id);
    setCurrentStep(nextStep.id);
  }

  function handleBack() {
    const prevStep = steps[currentIndex - 1];
    if (!prevStep) return;
    setCurrentStep(prevStep.id);
  }

  function handleReset() {
    setState(initialState);
    setCurrentStep("upload");
    setStartedSteps(["upload"]);
    setCompletedSteps([]);
  }

  async function handleCancelConfirmed() {
    setCancelDialogOpen(false);
    try {
      const token = getAccessToken();
      if (token && state.datasetId != null) {
        await fetch(`${API_BASE_URL}/datasets/${state.datasetId}/`, {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
      }
    } catch (error) {
      console.error("Failed to delete draft dataset on cancel:", error);
    } finally {
      setState(initialState);
      setCurrentStep("upload");
      setStartedSteps(["upload"]);
      setCompletedSteps([]);
      router.replace("/dashboard");
    }
  }

  async function handleFinish() {
    if (!state.datasetId || !state.summary) return;

    const token = getAccessToken();
    if (!token) {
      router.replace("/login");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        target_column: state.targetColumn,
        metric_columns: state.metricColumns,
        time_column: state.timeColumn,
        column_types: state.columnTypes,
        dataset_shape: state.datasetShape,
        analysis_goal: state.analysisGoal,
        positive_class: state.positiveClass,
        entity_key: state.entityKey,
        time_grain: state.timeGrain,
        time_grain_custom: state.timeGrainCustom,
        anomaly_direction: state.anomalyDirection,
        notes: state.notes,
        activate: true,
      };

      await fetch(
        `${API_BASE_URL}/datasets/${state.datasetId}/semantic-config/`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        },
      );

      await apiFetch(`/datasets/${state.datasetId}/`);

      router.push(`/datasets/${state.datasetId}`);
    } catch (error) {
      console.error(
        "Failed to save semantic config and activate dataset:",
        error,
      );
      setSubmitting(false);
    }
  }

  const canGoNext =
    currentStep === "upload"
      ? state.uploadStatus === "ready" && !!state.datasetId && !!state.summary
      : currentStep === "columns" || currentStep === "goals"
        ? true
        : false;

  const isOnLastStep = currentStep === "review";

  const showSemanticsSummary =
    startedSteps.includes("columns") || completedSteps.includes("columns");
  const showGoalsSummary =
    startedSteps.includes("goals") || completedSteps.includes("goals");

  return (
    <>
      <div className="flex flex-col gap-6 md:grid md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="space-y-4">
          <WizardStepper
            steps={steps}
            currentStep={currentStep}
            inProgressStep={inProgressStep}
            completedSteps={completedSteps}
            startedSteps={startedSteps}
            onStepClick={goToStep}
          />
          <div className="rounded-2xl border border-border/70 bg-card/80 p-4 shadow-sm backdrop-blur">
            {currentStep === "upload" && (
              <DatasetWizardStepUpload
                state={state}
                onStateChange={setState}
                onUploadReady={() => markStepComplete("upload")}
              />
            )}
            {currentStep === "columns" && (
              <DatasetWizardStepColumns
                state={state}
                onStateChange={setState}
              />
            )}
            {currentStep === "goals" && (
              <DatasetWizardStepGoals state={state} onStateChange={setState} />
            )}
            {currentStep === "review" && (
              <DatasetWizardStepReview state={state} />
            )}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="cursor-pointer"
                onClick={() => setCancelDialogOpen(true)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="cursor-pointer"
                onClick={handleReset}
              >
                Reset to defaults
              </Button>
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="cursor-pointer"
                hidden={currentStep === "upload"}
                disabled={currentStep === "upload"}
                onClick={handleBack}
              >
                Back
              </Button>
              {!isOnLastStep && (
                <Button
                  type="button"
                  size="sm"
                  className="cursor-pointer"
                  hidden={!canGoNext}
                  disabled={!canGoNext}
                  onClick={handleNext}
                >
                  Next
                </Button>
              )}
              {isOnLastStep && (
                <Button
                  type="button"
                  size="sm"
                  className="cursor-pointer"
                  disabled={submitting}
                  onClick={handleFinish}
                >
                  {submitting ? "Creating dataset..." : "Create dataset"}
                </Button>
              )}
            </div>
          </div>
        </div>

        <DatasetWizardSummary
          state={state}
          showSemantics={showSemanticsSummary}
          showGoals={showGoalsSummary}
        />
      </div>

      <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel dataset setup?</AlertDialogTitle>
            <AlertDialogDescription>
              This will discard this setup and the uploaded file. The dataset
              will not appear on your dashboard.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="cursor-pointer">
              Keep editing
            </AlertDialogCancel>
            <AlertDialogAction
              className="cursor-pointer"
              onClick={handleCancelConfirmed}
            >
              Discard and return to dashboard
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
