import Link from "next/link";
import type { SessionSummary } from "@perspective-os/web-server/session-data";

export function SessionCard({ session }: { session: SessionSummary }) {
  const stepLabel =
    session.currentStep > 0 ? `Step ${session.currentStep} of 4` : "Not started";

  return (
    <article className="card projects-hub__card">
      <Link href={`/sessions/${session.id}`} className="projects-hub__card-link">
        <div className="projects-hub__card-head">
          <h3 className="text-h4">{session.topic}</h3>
          <span className="projects-hub__card-head-spacer" aria-hidden />
        </div>
        <p className="text-caption text-muted">{session.role}</p>
        <p className="text-caption text-muted">
          {stepLabel} · {session.updatedAt.toLocaleDateString()}
        </p>
      </Link>
    </article>
  );
}
