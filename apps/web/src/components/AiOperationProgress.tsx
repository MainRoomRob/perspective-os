"use client";

import {
  resolveAiOperation,
  resolveStepMessage,
  type AiOperationContext,
  type AiOperationId,
} from "@/features/ai-operation-steps";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

/** Delay between ticking off each remaining step when the task finishes early. */
const FINISH_STEP_MS = 400;
/** Pause on the completed checklist before closing the overlay. */
const FINISH_HOLD_MS = 1_000;

/** Poll interval while waiting for page data to load before closing. */
const EXTEND_VISIBLE_POLL_MS = 150;

function formatElapsed(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
}

function delay(ms: number, signal: FinishSignal): Promise<void> {
  return new Promise((resolve) => {
    const timer = window.setTimeout(() => {
      if (!signal.cancelled) resolve();
    }, ms);
    signal.timers.push(timer);
  });
}

type FinishSignal = {
  cancelled: boolean;
  timers: number[];
};

function ProgressSpinner() {
  return (
    <span
      className="ai-progress__spinner"
      aria-hidden="true"
    />
  );
}

export function AiOperationProgress({
  operation,
  context = {},
  variant,
  isActive,
  title,
  extendVisible = false,
  extendMessage = "Loading results…",
  onTaskComplete,
}: {
  operation: AiOperationId;
  context?: AiOperationContext;
  variant: "inline" | "overlay";
  isActive: boolean;
  /** Overlay heading; defaults to operation config title. */
  title?: string;
  /** Keep the overlay open after the checklist finishes (e.g. while router.refresh runs). */
  extendVisible?: boolean;
  extendMessage?: string;
  /** Called when the server task ends and the overlay finish sequence begins. */
  onTaskComplete?: () => void;
}) {
  const config = resolveAiOperation(operation, context);
  const [stepIndex, setStepIndex] = useState(0);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [panelVisible, setPanelVisible] = useState(false);
  const [isFinishing, setIsFinishing] = useState(false);
  const stepIndexRef = useRef(0);
  const extendVisibleRef = useRef(extendVisible);
  const onTaskCompleteRef = useRef(onTaskComplete);

  stepIndexRef.current = stepIndex;
  extendVisibleRef.current = extendVisible;
  onTaskCompleteRef.current = onTaskComplete;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isActive) {
      setPanelVisible(true);
      setIsFinishing(false);
      setStepIndex(0);
      stepIndexRef.current = 0;
      setElapsedSec(0);

      const startedAt = Date.now();
      const tick = window.setInterval(() => {
        setElapsedSec(Math.floor((Date.now() - startedAt) / 1000));
      }, 1000);
      return () => window.clearInterval(tick);
    }

    if (variant === "inline") {
      setPanelVisible(false);
      setIsFinishing(false);
      setStepIndex(0);
      stepIndexRef.current = 0;
      setElapsedSec(0);
      return;
    }

    setPanelVisible((visible) => {
      if (visible) {
        onTaskCompleteRef.current?.();
        setIsFinishing(true);
      }
      return visible;
    });
  }, [isActive, operation, variant]);

  useEffect(() => {
    if (!isFinishing) return;

    const signal: FinishSignal = { cancelled: false, timers: [] };
    const target = config.steps.length;

    void (async () => {
      let current = stepIndexRef.current;

      while (current < target) {
        await delay(FINISH_STEP_MS, signal);
        if (signal.cancelled) return;
        current += 1;
        stepIndexRef.current = current;
        setStepIndex(current);
      }

      await delay(FINISH_HOLD_MS, signal);
      if (signal.cancelled) return;

      while (extendVisibleRef.current) {
        await delay(EXTEND_VISIBLE_POLL_MS, signal);
        if (signal.cancelled) return;
      }

      setIsFinishing(false);
      setPanelVisible(false);
      setStepIndex(0);
      stepIndexRef.current = 0;
      setElapsedSec(0);
    })();

    return () => {
      signal.cancelled = true;
      for (const timer of signal.timers) {
        window.clearTimeout(timer);
      }
    };
  }, [isFinishing, config.steps.length]);

  useEffect(() => {
    if (!isActive || isFinishing) return;
    if (stepIndex >= config.steps.length - 1) return;

    const timer = window.setTimeout(() => {
      setStepIndex((current) =>
        Math.min(current + 1, config.steps.length - 1),
      );
    }, config.advanceMs);

    return () => window.clearTimeout(timer);
  }, [isActive, isFinishing, stepIndex, config.advanceMs, config.steps.length]);

  const displayStepIndex = Math.min(stepIndex, config.steps.length - 1);
  const currentMessage = resolveStepMessage(
    config.steps[displayStepIndex]!,
    context,
  );
  const tip =
    config.tips?.[displayStepIndex % (config.tips.length || 1)] ??
    config.tips?.[0];
  const panelTitle = title ?? config.title;
  const allStepsComplete = stepIndex >= config.steps.length;
  const [popStepIndex, setPopStepIndex] = useState<number | null>(null);

  useEffect(() => {
    if (stepIndex <= 0) {
      setPopStepIndex(null);
      return;
    }
    const completedIndex = Math.min(stepIndex - 1, config.steps.length - 1);
    setPopStepIndex(completedIndex);
    const timer = window.setTimeout(() => setPopStepIndex(null), 320);
    return () => window.clearTimeout(timer);
  }, [stepIndex, config.steps.length]);

  if (variant === "inline") {
    if (!isActive) return null;

    return (
      <p className="form-status--success text-body ai-progress--inline" role="status" aria-live="polite">
        <ProgressSpinner />
        <span>{currentMessage}</span>
        <span className="text-caption text-muted ai-progress__step-count">
          {" "}
          Step {displayStepIndex + 1} of {config.steps.length}
        </span>
        {config.durationHint && displayStepIndex === 0 ? (
          <span className="text-caption text-muted ai-progress__duration-hint">
            {" "}
            {config.durationHint}
          </span>
        ) : null}
      </p>
    );
  }

  if (!panelVisible || !mounted) return null;

  return createPortal(
    <div className="ai-progress-overlay" aria-hidden={false}>
      <div
        className={[
          "ai-progress-panel card",
          allStepsComplete ? "ai-progress-panel--complete" : "",
        ]
          .filter(Boolean)
          .join(" ")}
        role="dialog"
        aria-modal="true"
        aria-labelledby="ai-progress-title"
        aria-busy={!allStepsComplete || extendVisible}
      >
        <header className="ai-progress-panel__header">
          <h2 id="ai-progress-title" className="text-h4">
            {panelTitle}
          </h2>
          {config.durationHint && !allStepsComplete ? (
            <p className="text-caption text-muted">{config.durationHint}</p>
          ) : null}
          {allStepsComplete ? (
            <div className="ai-progress-panel__complete-rule" aria-hidden="true" />
          ) : null}
        </header>

        <ol className="ai-progress-steps">
          {config.steps.map((step, index) => {
            const done = index < stepIndex;
            const current = !allStepsComplete && index === stepIndex;
            const label = resolveStepMessage(step, context);
            return (
              <li
                key={index}
                className={[
                  "ai-progress-steps__item",
                  done ? "ai-progress-steps__item--done" : "",
                  current ? "ai-progress-steps__item--current" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                aria-current={current ? "step" : undefined}
              >
                <span
                  className={[
                    "ai-progress-steps__marker",
                    popStepIndex === index ? "ai-progress-steps__marker--pop" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  aria-hidden="true"
                >
                  {done ? "✓" : current ? <ProgressSpinner /> : index + 1}
                </span>
                <span className="ai-progress-steps__label text-body">{label}</span>
              </li>
            );
          })}
        </ol>

        {tip && !allStepsComplete ? (
          <p className="text-caption text-muted ai-progress-panel__tip">{tip}</p>
        ) : null}

        {allStepsComplete && extendVisible ? (
          <p
            className="text-body ai-progress-panel__extend"
            role="status"
            aria-live="polite"
          >
            <ProgressSpinner />
            <span>{extendMessage}</span>
          </p>
        ) : null}

        <p className="text-caption text-muted ai-progress-panel__elapsed" aria-live="off">
          Elapsed: {formatElapsed(elapsedSec)}
        </p>
      </div>
    </div>,
    document.body,
  );
}
