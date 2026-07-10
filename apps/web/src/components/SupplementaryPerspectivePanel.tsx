import type { SupplementaryExpertPerspective } from "@perspective-os/core";
import {
  EvidenceList,
  OutputField,
  SourceLinkList,
} from "./output/OutputPrimitives";

export function SupplementaryPerspectivePanel({
  perspective,
}: {
  perspective: SupplementaryExpertPerspective;
}) {
  const hasGrounded =
    perspective.evidencePoints != null &&
    perspective.sources != null &&
    perspective.evidencePoints.length > 0;

  return (
    <article className="expert-panel expert-panel--supplementary">
      <header className="expert-panel__head">
        <h3 className="text-h4">{perspective.name}</h3>
        <p className="text-caption text-muted">Supplementary lens</p>
      </header>
      <div className="expert-panel__body stack-gap-4">
        <OutputField label="Core position">{perspective.corePosition}</OutputField>
        {hasGrounded ? (
          <>
            <div className="output-field">
              <p className="text-label output-field__label">Evidence</p>
              <EvidenceList
                evidencePoints={perspective.evidencePoints!}
                sources={perspective.sources!}
              />
            </div>
            <div className="output-field">
              <p className="text-label output-field__label">Sources</p>
              <SourceLinkList sources={perspective.sources!} />
            </div>
          </>
        ) : null}
        <OutputField label="Only they would say" highlight>
          {perspective.uniqueInsight}
        </OutputField>
      </div>
    </article>
  );
}
