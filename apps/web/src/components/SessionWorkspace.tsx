"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ResearchStep, SynthesisOutput } from "@perspective-os/core";
import type { PerspectiveSlot } from "@perspective-os/core";
import { STEP_LABELS, resolvePerspectiveConfig } from "@perspective-os/core";
import {
  rerunStepAction,
  runAllRemainingAction,
  runStepAction,
} from "@perspective-os/web-server/actions";
import type { StepOutputRow } from "@perspective-os/web-server/session-data";
import {
  researchStepOperationId,
  type AiOperationContext,
  type AiOperationId,
} from "@/features/ai-operation-steps";
import { useRefreshRouter } from "@/shell/RefreshProvider";
import { AiOperationProgress } from "./AiOperationProgress";
import { MarkdownView } from "./MarkdownView";
import { StepOutputStructured } from "./StepOutputStructured";

const STEP_INTENT: Record<ResearchStep, string> = {
  1: "Simulate five expert perspectives on your topic.",
  2: "Map agreements, contradictions, and what remains uncertain.",
  3: "Synthesise a briefing with role-specific recommendations.",
  4: "Critically review the quality of the synthesis.",
};

type PendingOp =
  | { kind: "step"; step: ResearchStep }
  | { kind: "rerun"; step: ResearchStep }
  | { kind: "run-all" }
  | null;

function resolveOperation(pendingOp: PendingOp): AiOperationId {
  if (!pendingOp || pendingOp.kind === "run-all") {
    return pendingOp?.kind === "run-all" ? "research-run-all" : "research-step-1";
  }
  return researchStepOperationId(pendingOp.step);
}

export function SessionWorkspace({
  sessionId,
  steps,
  activeStep,
  sessionExtras,
  perspectiveConfig,
}: {
  sessionId: string;
  steps: StepOutputRow[];
  activeStep: ResearchStep;
  sessionExtras?: import("@perspective-os/core").SessionExtras | null;
  perspectiveConfig?: PerspectiveSlot[] | null;
}) {
  const { refresh, isRefreshing } = useRefreshRouter();
  const refreshQueuedRef = useRef(false);
  const [awaitingContent, setAwaitingContent] = useState(false);
  const [pendingOp, setPendingOp] = useState<PendingOp>(null);

  const current = steps.find((s) => s.step === activeStep)!;
  const synthesisStep = steps.find((s) => s.step === 3);
  const synthesisOutput: SynthesisOutput | undefined =
    synthesisStep?.status === "complete" && synthesisStep.output
      ? (synthesisStep.output as SynthesisOutput)
      : undefined;
  const priorComplete =
    activeStep === 1 ||
    steps.some((s) => s.step === activeStep - 1 && s.status === "complete");
  const isPending = pendingOp !== null;
  const canRun = priorComplete && current.status !== "running" && !isPending;
  const hasRemaining = steps.some((s) => s.status !== "complete");
  const isComplete = current.status === "complete";
  const isRunning = current.status === "running" || isPending;

  const progressContext: AiOperationContext = {
    lensNames: resolvePerspectiveConfig(perspectiveConfig).map((slot) => slot.name),
  };

  const handleTaskComplete = useCallback(() => {
    if (!refreshQueuedRef.current) return;
    refreshQueuedRef.current = false;
    setAwaitingContent(true);
    refresh({ overlay: false });
  }, [refresh]);

  useEffect(() => {
    if (awaitingContent && !isRefreshing) {
      setAwaitingContent(false);
    }
  }, [awaitingContent, isRefreshing]);

  const runStep = async () => {
    setPendingOp({ kind: "step", step: activeStep });
    setAwaitingContent(false);
    refreshQueuedRef.current = false;
    try {
      await runStepAction(sessionId, activeStep);
      refreshQueuedRef.current = true;
    } finally {
      setPendingOp(null);
    }
  };

  const runAll = async () => {
    setPendingOp({ kind: "run-all" });
    setAwaitingContent(false);
    refreshQueuedRef.current = false;
    try {
      await runAllRemainingAction(sessionId);
      refreshQueuedRef.current = true;
    } finally {
      setPendingOp(null);
    }
  };

  const rerun = async () => {
    if (
      !confirm(
        `Re-run step ${activeStep}? This will clear this step and all later steps.`,
      )
    ) {
      return;
    }
    setPendingOp({ kind: "rerun", step: activeStep });
    setAwaitingContent(false);
    refreshQueuedRef.current = false;
    try {
      await rerunStepAction(sessionId, activeStep);
      refreshQueuedRef.current = true;
    } finally {
      setPendingOp(null);
    }
  };

  return (
    <section className="workspace-panel">
      <AiOperationProgress
        operation={resolveOperation(pendingOp)}
        context={progressContext}
        variant="overlay"
        isActive={isPending}
        extendVisible={awaitingContent}
        extendMessage="Loading results…"
        onTaskComplete={handleTaskComplete}
      />

      <header className="workspace-masthead">
        <div className="workspace-masthead__copy">
          <p className="text-label">Step {activeStep}</p>
          <h2 className="text-h3">{STEP_LABELS[activeStep]}</h2>
          <p className="text-caption text-muted">{STEP_INTENT[activeStep]}</p>
        </div>

        <div className="workspace-masthead__actions action-row">
          {!isComplete && !isRunning ? (
            <button
              type="button"
              className="btn btn--primary"
              disabled={!canRun}
              onClick={runStep}
            >
              Run step
            </button>
          ) : null}
          {isComplete ? (
            <button
              type="button"
              className="btn btn--text"
              disabled={isPending}
              onClick={rerun}
            >
              Re-run
            </button>
          ) : null}
          {hasRemaining && !isRunning ? (
            <button
              type="button"
              className="btn btn--secondary"
              disabled={isPending}
              onClick={runAll}
            >
              Run all remaining
            </button>
          ) : null}
        </div>
      </header>

      {current.error ? <p className="form-status--error">{current.error}</p> : null}

      {isComplete && current.output ? (
        <div className="workspace-reading">
          <StepOutputStructured
            step={activeStep}
            output={current.output}
            synthesisOutput={
              activeStep === 4 ? synthesisOutput : undefined
            }
            sessionId={sessionId}
            sessionExtras={sessionExtras}
            perspectiveConfig={perspectiveConfig}
          />
          {current.rawMarkdown ? (
            <details className="markdown-panel">
              <summary className="text-caption text-muted">View raw markdown</summary>
              <MarkdownView content={current.rawMarkdown} />
            </details>
          ) : null}
        </div>
      ) : !isRunning ? (
        <div className="workspace-panel__empty">
          <p className="text-body">
            {priorComplete
              ? "Ready when you are."
              : `Finish step ${activeStep - 1} before running this one.`}
          </p>
        </div>
      ) : null}
    </section>
  );
}
