export function TunerScoreMeter({
  value,
  max = 10,
  label,
  caption,
  compact = false,
}: {
  value: number;
  max?: number;
  label?: string;
  caption?: string;
  compact?: boolean;
}) {
  const clamped = Math.min(max, Math.max(0, value));
  const percent = (clamped / max) * 100;
  const low = percent < 50;

  return (
    <div
      className={[
        "tuner-meter",
        compact ? "tuner-meter--compact" : "",
        low ? "tuner-meter--low" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      aria-label={label ?? `Score: ${clamped} out of ${max}`}
    >
      {label ? <p className="text-label tuner-meter__label">{label}</p> : null}
      <div className="tuner-meter__score">
        <div className="tuner-meter__value-row">
          <span className="tuner-meter__value">{clamped}</span>
          <span className="tuner-meter__value-unit">/{max}</span>
        </div>
        {caption ? (
          <p className="tuner-meter__caption text-caption text-muted">{caption}</p>
        ) : null}
      </div>
      <div className="tuner-meter__track">
        <div className="tuner-meter__fill" style={{ width: `${percent}%` }} />
        <div className="tuner-meter__needle" style={{ left: `${percent}%` }} />
      </div>
      <div className="tuner-meter__ticks" aria-hidden="true">
        <span>0</span>
        <span>{Math.round(max / 2)}</span>
        <span>{max}</span>
      </div>
    </div>
  );
}
