import type { ReactNode } from "react";
import type {
  EvidencePoint,
  FindingAudit,
  FindingDerivedFrom,
  FindingVerdict,
  KeyFinding,
  PerspectiveSource,
  ReliabilityAdjustment,
  ReliabilityLevel,
} from "@perspective-os/core";
import type { PerspectiveSlot } from "@perspective-os/core";
import {
  perspectiveLabelForId,
  resolveFindingAuditLabel,
} from "@perspective-os/core";
import { formatSourceMeta, formatSourceRecency } from "@/lib/format-source-recency";
import { TunerScoreMeter } from "../meters/TunerScoreMeter";

export type OutputTier = "critical" | "action" | "primary" | "secondary" | "muted";

const RELIABILITY_SCORE: Record<ReliabilityLevel, number> = {
  high: 9,
  medium: 6,
  low: 3,
};

export function OutputLead({
  label,
  children,
  tier = "primary",
}: {
  label?: string;
  children: ReactNode;
  tier?: OutputTier;
}) {
  return (
    <section className={`output-lead output-lead--${tier}`}>
      {label ? <p className="text-label output-lead__label">{label}</p> : null}
      <div className="output-lead__body text-body-lg">{children}</div>
    </section>
  );
}

export function OutputSection({
  title,
  lead,
  children,
  tier = "primary",
  className,
}: {
  title: string;
  lead?: string;
  children: ReactNode;
  tier?: OutputTier;
  className?: string;
}) {
  const blockClass = ["output-block", `output-block--${tier}`, className]
    .filter(Boolean)
    .join(" ");

  return (
    <section className={blockClass}>
      <header className="output-block__head">
        <h3 className="text-h4">{title}</h3>
        {lead ? <p className="text-caption text-muted">{lead}</p> : null}
      </header>
      <div className="output-block__body">{children}</div>
    </section>
  );
}

export function OutputField({
  label,
  children,
  highlight = false,
}: {
  label: string;
  children: ReactNode;
  highlight?: boolean;
}) {
  return (
    <div className={`output-field${highlight ? " output-field--highlight" : ""}`}>
      <p className="text-label output-field__label">{label}</p>
      <p className="text-body output-field__value">{children}</p>
    </div>
  );
}

export function ReliabilityMeter({ level }: { level: ReliabilityLevel }) {
  return (
    <TunerScoreMeter
      value={RELIABILITY_SCORE[level]}
      max={10}
      compact
      caption={level}
    />
  );
}

export function PerspectiveTags({ names }: { names: string[] }) {
  return (
    <div className="layout-brief__tags" aria-label="Perspectives">
      {names.map((name) => (
        <span key={name} className="layout-brief__tag">
          {name.replace(/^The /, "")}
        </span>
      ))}
    </div>
  );
}

export function FindingProvenance({
  derivedFrom,
  perspectiveConfig,
}: {
  derivedFrom?: FindingDerivedFrom;
  perspectiveConfig?: PerspectiveSlot[] | null;
}) {
  if (!derivedFrom) return null;

  const chips: string[] = [];
  derivedFrom.contradictionIndices?.forEach((index) => {
    chips.push(`Clash ${index + 1}`);
  });
  derivedFrom.perspectiveIds?.forEach((id) => {
    const label = perspectiveLabelForId(id, perspectiveConfig);
    chips.push(label.replace(/^The /, ""));
  });

  if (chips.length === 0) return null;

  return (
    <div className="layout-brief__tags finding-provenance" aria-label="Derived from">
      {chips.map((chip) => (
        <span key={chip} className="layout-brief__tag finding-provenance__chip">
          {chip}
        </span>
      ))}
    </div>
  );
}

export function SourceRefTags({
  refs,
  perspectiveConfig,
}: {
  refs: Array<{ perspectiveId: string; evidenceIndex: number }>;
  perspectiveConfig?: PerspectiveSlot[] | null;
}) {
  if (refs.length === 0) return null;

  return (
    <div className="layout-brief__tags" aria-label="Evidence references">
      {refs.map((ref) => (
        <span
          key={`${ref.perspectiveId}-${ref.evidenceIndex}`}
          className="layout-brief__tag"
        >
          {perspectiveLabelForId(ref.perspectiveId, perspectiveConfig).replace(
            /^The /,
            "",
          )}{" "}
          · E{ref.evidenceIndex + 1}
        </span>
      ))}
    </div>
  );
}

const VERDICT_LABELS: Record<FindingVerdict, string> = {
  holds: "Holds",
  conditional: "Conditional",
  unsupported: "Unsupported",
};

const ADJUSTMENT_LABELS: Record<ReliabilityAdjustment, string> = {
  confirmed: "Confirmed",
  downgrade: "Downgrade vs Briefing",
  upgrade: "Upgrade vs Briefing",
};

export function FindingAuditList({
  audits,
  keyFindings = [],
}: {
  audits: FindingAudit[];
  keyFindings?: KeyFinding[];
}) {
  const sorted = [...audits].sort((a, b) => a.findingIndex - b.findingIndex);

  return (
    <div className="stack-gap-4 finding-audit-list">
      {sorted.map((audit) => {
        const title = resolveFindingAuditLabel(audit, keyFindings);
        const showTitle =
          keyFindings.length > 0 &&
          title !== `Finding ${audit.findingIndex + 1}`;

        return (
          <article
            key={audit.findingIndex}
            className={`finding-audit finding-audit--${audit.verdict}`}
          >
            <header className="finding-audit__head">
              <span className="text-label finding-audit__index">
                Finding {audit.findingIndex + 1}
              </span>
              <span
                className={`verdict-badge verdict-badge--${audit.verdict}`}
              >
                {VERDICT_LABELS[audit.verdict]}
              </span>
              {audit.reliabilityAdjustment &&
              audit.reliabilityAdjustment !== "confirmed" ? (
                <span className="layout-brief__tag finding-audit__adjustment">
                  {ADJUSTMENT_LABELS[audit.reliabilityAdjustment]}
                </span>
              ) : null}
            </header>
            {showTitle ? (
              <p className="text-body finding-audit__title">{title}</p>
            ) : null}
            <p className="text-caption text-muted finding-audit__chain">
              {audit.chainCheck}
            </p>
            <p className="text-body finding-audit__gap">{audit.primaryGap}</p>
            {audit.evidenceToVerify ? (
              <p className="text-caption finding-audit__verify">
                Verify: {audit.evidenceToVerify}
              </p>
            ) : null}
          </article>
        );
      })}
    </div>
  );
}

export function RankedItem({
  rank,
  title,
  detail,
  meta,
  tier = "primary",
}: {
  rank?: number;
  title: string;
  detail?: string;
  meta?: ReactNode;
  tier?: OutputTier;
}) {
  return (
    <article className={`ranked-item ranked-item--${tier}`}>
      <div className="ranked-item__head">
        {rank !== undefined ? (
          <span className="ranked-item__rank text-label">{rank}</span>
        ) : null}
        <div className="ranked-item__main">
          <p className="text-body ranked-item__title">{title}</p>
          {meta ? <div className="ranked-item__meta">{meta}</div> : null}
          {detail ? (
            <p className="text-caption text-muted ranked-item__detail">{detail}</p>
          ) : null}
        </div>
      </div>
    </article>
  );
}

export function ConsensusList({ items }: { items: string[] }) {
  return (
    <ul className="consensus-list">
      {items.map((item) => (
        <li key={item} className="consensus-list__item text-body">
          {item}
        </li>
      ))}
    </ul>
  );
}

function SourceCitation({
  source,
  compact = false,
  showExternalIcon = true,
}: {
  source: PerspectiveSource;
  compact?: boolean;
  showExternalIcon?: boolean;
}) {
  const label = source.title;

  if (source.url) {
    return (
      <a
        href={source.url}
        className={compact ? "source-link source-link--compact text-link" : "source-link text-link"}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`${label} (opens in new tab)`}
      >
        {label}
        {showExternalIcon ? (
          <span className="source-link__external" aria-hidden="true">
            ↗
          </span>
        ) : null}
      </a>
    );
  }

  return (
    <span className={compact ? "source-link source-link--compact source-link--text" : "source-link source-link--text"}>
      {label}
    </span>
  );
}

export function SourceLinkList({ sources }: { sources: PerspectiveSource[] }) {
  return (
    <ol className="source-list">
      {sources.map((source, index) => (
        <li key={`${source.title}-${index}`} className="source-list__item">
          <SourceCitation source={source} showExternalIcon={Boolean(source.url)} />
          <span className="text-caption text-muted source-list__meta">
            {formatSourceMeta(source)}
          </span>
        </li>
      ))}
    </ol>
  );
}

export function EvidenceList({
  evidencePoints,
  sources,
}: {
  evidencePoints: EvidencePoint[];
  sources: PerspectiveSource[];
}) {
  return (
    <ul className="evidence-list">
      {evidencePoints.map((point, index) => {
        const source = sources[point.sourceIndex];
        const recency = source ? formatSourceRecency(source) : null;
        return (
          <li key={`${point.claim}-${index}`} className="evidence-list__item text-body">
            <span className="evidence-list__claim">{point.claim}</span>
            {source ? (
              <span className="text-caption text-muted evidence-list__source">
                {" "}
                —{" "}
                <SourceCitation source={source} compact showExternalIcon={Boolean(source.url)} />
                {recency ? ` · ${recency}` : null}
              </span>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
