import Link from "next/link";
import type { ResearchStep } from "@perspective-os/core";
import { STEP_LABELS } from "@perspective-os/core";
import type { StepOutputRow } from "@perspective-os/web-server/session-data";

const STEP_SHORT: Record<ResearchStep, string> = {
  1: "Scan",
  2: "Contradictions",
  3: "Synthesis",
  4: "Review",
};

export function SessionStepNav({
  sessionId,
  activeStep,
  steps,
}: {
  sessionId: string;
  activeStep: ResearchStep;
  steps: StepOutputRow[];
}) {
  const completedCount = steps.filter((s) => s.status === "complete").length;

  return (
    <nav className="nav session-step-nav" aria-label="Research steps">
      <div className="session-step-nav__header">
        <span className="text-label">Steps</span>
        <span className="text-caption text-muted">
          {completedCount}/4
        </span>
      </div>
      <hr className="rule nav__rule" />
      <ul className="nav__list">
        {([1, 2, 3, 4] as ResearchStep[]).map((step) => {
          const row = steps.find((s) => s.step === step);
          const complete = row?.status === "complete";
          const failed = row?.status === "failed";
          const active = step === activeStep;

          return (
            <li key={step}>
              <Link
                href={`/sessions/${sessionId}?step=${step}`}
                className={[
                  "nav__link",
                  "session-step-nav__link",
                  active ? "nav__link--active" : "",
                  complete ? "session-step-nav__link--done" : "",
                  failed ? "session-step-nav__link--failed" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                aria-current={active ? "page" : undefined}
                title={STEP_LABELS[step]}
              >
                <span className="session-step-nav__index">
                  {String(step).padStart(2, "0")}
                </span>
                <span className="session-step-nav__label">{STEP_SHORT[step]}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
