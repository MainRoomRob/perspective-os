const ARC_RADIUS = 80;
const ARC_LENGTH = Math.PI * ARC_RADIUS;
const ARC_CENTER = { x: 100, y: 100 };

function clampPercent(value: number) {
  return Math.min(100, Math.max(0, Math.round(value)));
}

function arcAngle(percent: number) {
  return Math.PI * (1 - percent / 100);
}

function arcPoint(percent: number, radius: number) {
  const theta = arcAngle(percent);
  return {
    x: ARC_CENTER.x + radius * Math.cos(theta),
    y: ARC_CENTER.y - radius * Math.sin(theta),
  };
}

export function GradeArcMeter({
  grade,
  confidencePercent,
  caption,
}: {
  grade: string;
  confidencePercent: number;
  caption?: string;
}) {
  const value = clampPercent(confidencePercent);
  const dashOffset = ARC_LENGTH * ((100 - value) / 100);
  const needleInner = arcPoint(value, ARC_RADIUS - 10);
  const needleOuter = arcPoint(value, ARC_RADIUS + 10);

  return (
    <div
      className="arc-meter arc-meter--compact pos-meter pos-meter--grade"
      aria-label={`Overall grade ${grade}, average confidence ${value} percent`}
    >
      <div className="arc-meter__inner">
        <p className="text-label">Overall grade</p>
        <div className="arc-meter__gauge">
          <svg className="arc-meter__svg" viewBox="0 0 200 110" aria-hidden="true">
            <path
              className="arc-meter__bg"
              d="M 20 100 A 80 80 0 0 1 180 100"
              fill="none"
              strokeWidth="8"
            />
            <path
              className="arc-meter__fill"
              d="M 20 100 A 80 80 0 0 1 180 100"
              fill="none"
              strokeWidth="8"
              strokeDasharray={ARC_LENGTH.toFixed(2)}
              strokeDashoffset={dashOffset.toFixed(2)}
            />
            <line
              className="arc-meter__needle"
              x1={needleInner.x.toFixed(1)}
              y1={needleInner.y.toFixed(1)}
              x2={needleOuter.x.toFixed(1)}
              y2={needleOuter.y.toFixed(1)}
            />
          </svg>
          <div className="arc-meter__value-row pos-meter__grade-row">
            <span className="arc-meter__value pos-meter__grade">{grade}</span>
          </div>
        </div>
        {caption ? (
          <p className="arc-meter__caption text-caption text-muted">{caption}</p>
        ) : null}
      </div>
    </div>
  );
}
