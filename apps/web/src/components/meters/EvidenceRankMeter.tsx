import type { EvidenceRanking } from "@perspective-os/core";

function perspectiveLabel(name: string) {
  return name.replace(/^The /, "");
}

export function EvidenceRankMeter({
  rankings,
}: {
  rankings: EvidenceRanking[];
}) {
  const ordered = [...rankings].sort((a, b) => a.rank - b.rank);

  return (
    <div
      className="touchpoint-meter touchpoint-meter--compact pos-meter"
      aria-label="Evidence strength by perspective"
    >
      <div className="touchpoint-meter__bars">
        {ordered.map((item) => {
          const strength = ((6 - item.rank) / 5) * 100;
          const isWeak = item.rank >= 4;

          return (
            <div key={item.perspective} className="touchpoint-bar">
              <div className="touchpoint-bar__track">
                <div
                  className={[
                    "touchpoint-bar__fill",
                    isWeak ? "touchpoint-bar__fill--low" : "",
                    item.rank === 1 ? "touchpoint-bar__fill--endpoint" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  style={{ height: `${strength}%` }}
                />
              </div>
              <span className="touchpoint-bar__label">
                {perspectiveLabel(item.perspective)}
              </span>
              <span className="touchpoint-bar__score">{item.rank}</span>
            </div>
          );
        })}
      </div>
      <p className="touchpoint-meter__caption text-caption text-muted">
        Rank 1 = strongest evidence base
      </p>
    </div>
  );
}
