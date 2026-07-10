import Link from "next/link";
import type { SessionSummary } from "@perspective-os/web-server/session-data";
import { SessionCard } from "@/components/SessionCard";

export function SessionsHubContent({
  sessions,
}: {
  sessions: SessionSummary[];
}) {
  return (
    <section className="layout-brief__section home-sessions">
      <div className="section-head">
        <h2 className="text-h3">Your sessions</h2>
        {sessions.length > 0 ? (
          <p className="section-head__count text-caption text-muted">
            {sessions.length} session{sessions.length === 1 ? "" : "s"}
          </p>
        ) : null}
      </div>

      <div className="projects-hub__grid">
        <Link
          href="/sessions/new"
          className="card projects-hub__card projects-hub__card--new"
        >
          <span className="text-label projects-hub__card--new-label">Start</span>
          <span className="text-h4">New research session</span>
        </Link>

        {sessions.map((session) => (
          <SessionCard key={session.id} session={session} />
        ))}
      </div>
    </section>
  );
}
