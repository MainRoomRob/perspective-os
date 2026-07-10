import { listSessions } from "@perspective-os/web-server/session-data";
import { getLlmStatusAction } from "@perspective-os/web-server/actions";
import { SessionsHubContent } from "@/components/SessionsHubContent";
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
          <span
            className="status-badge"
            data-status={llm.enabled ? "complete" : "draft"}
          >
            {llm.enabled ? `LLM: ${llm.provider}` : "Mock mode"}
          </span>
        </div>
      </section>

      <SessionsHubContent sessions={sessions} />
    </AppLayout>
  );
}
