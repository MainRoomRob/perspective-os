import Link from "next/link";
import { listSessions } from "@perspective-os/web-server/session-data";
import { getLlmStatusAction } from "@perspective-os/web-server/actions";
import { SessionCard } from "@/components/SessionCard";
import { AppLayout } from "@/shell/AppLayout";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [sessions, llm] = await Promise.all([
    listSessions(),
    getLlmStatusAction(),
  ]);

  return (
    <AppLayout>
      <section className="cover">
        <p className="text-label">Research framework</p>
        <h1 className="text-display cover__title">Multi-perspective research</h1>
        <p className="text-body cover__lead">
          Run a topic through five expert lenses, map contradictions, synthesise
          a briefing, and peer-review the result.
        </p>
        <div className="cover__cta action-row">
          <Link href="/sessions/new" className="btn btn--primary">
            New research session
          </Link>
          <span
            className="status-badge"
            data-status={llm.enabled ? "complete" : "draft"}
          >
            {llm.enabled ? `LLM: ${llm.provider}` : "Mock mode"}
          </span>
        </div>
      </section>

      <section className="stack-gap-4">
        <div className="section-header">
          <h2 className="text-h3">Sessions</h2>
        </div>

        {sessions.length === 0 ? (
          <div className="card">
            <p className="text-body text-muted" style={{ margin: 0 }}>
              No sessions yet. Start your first research run.
            </p>
          </div>
        ) : (
          <div className="session-list">
            {sessions.map((session) => (
              <SessionCard key={session.id} session={session} />
            ))}
          </div>
        )}
      </section>
    </AppLayout>
  );
}
