import type { ConfidenceScore, KeyFinding } from "@perspective-os/core";
import { resolveConfidenceFindingTitle } from "@perspective-os/core";

export function ConfidenceBarsMeter({
  scores,
  keyFindings = [],
}: {
  scores: ConfidenceScore[];
  keyFindings?: KeyFinding[];
}) {
  return (
    <div
      className="touchpoint-meter touchpoint-meter--compact pos-meter"
      aria-label="Confidence scores by finding"
    >
      <div className="touchpoint-meter__bars">
        {scores.map((item, index) => {
          const percent = (item.score / 10) * 100;
          const isLow = item.score <= 4;
          const findingNumber =
            item.findingIndex != null ? item.findingIndex + 1 : index + 1;
          const findingLabel = resolveConfidenceFindingTitle(item, keyFindings);

          return (
            <div
              key={`${findingNumber}-${index}`}
              className="touchpoint-bar"
              aria-label={`Finding ${findingNumber}: ${findingLabel}, score ${item.score} out of 10`}
            >
              <div className="touchpoint-bar__track">
                <div
                  className={[
                    "touchpoint-bar__fill",
                    isLow ? "touchpoint-bar__fill--low" : "",
                    item.score >= 8 ? "touchpoint-bar__fill--endpoint" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  style={{ height: `${percent}%` }}
                />
              </div>
              <span className="touchpoint-bar__label">{findingNumber}</span>
              <span className="touchpoint-bar__score">{item.score}</span>
            </div>
          );
        })}
      </div>
      <p className="touchpoint-meter__caption text-caption text-muted">
        Confidence out of 10 — numbered findings match the list below
      </p>
    </div>
  );
}
