import Link from "next/link";
import type { SessionSummary } from "@perspective-os/web-server/session-data";

export function SessionCard({ session }: { session: SessionSummary }) {
  const stepLabel =
    session.currentStep > 0 ? `Step ${session.currentStep} of 4` : "Not started";

  return (
    <Link href={`/sessions/${session.id}`} className="card session-card">
      <h2 className="text-h4 session-card__title">{session.topic}</h2>
      <p className="text-caption session-card__meta">{session.role}</p>
      <p className="text-caption session-card__meta">
        {stepLabel} · {session.updatedAt.toLocaleDateString()}
      </p>
    </Link>
  );
}
