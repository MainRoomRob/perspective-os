import Link from "next/link";
import { notFound } from "next/navigation";
import type { ResearchStep } from "@perspective-os/core";
import { resolvePerspectiveConfig } from "@perspective-os/core";
import { getSessionDetail } from "@perspective-os/web-server/session-data";
import { PerspectiveRosterTags } from "@/components/PerspectiveRosterTags";
import { SessionActions } from "@/components/SessionActions";
import { SessionStepNav } from "@/components/SessionStepNav";
import { SessionWorkspace } from "@/components/SessionWorkspace";
import { AppLayout } from "@/shell/AppLayout";

export const dynamic = "force-dynamic";

export default async function SessionPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ step?: string }>;
}) {
  const { id } = await params;
  const { step: stepParam } = await searchParams;
  const detail = await getSessionDetail(id);
  if (!detail) notFound();

  const activeStep = Math.min(
    4,
    Math.max(1, Number(stepParam ?? (detail.currentStep || 1))),
  ) as ResearchStep;

  const roster = resolvePerspectiveConfig(detail.perspectiveConfig);

  return (
    <AppLayout
      sidebar={
        <div className="stack-gap-5">
          <Link href="/" className="app-sidebar__back text-link">
            ← All sessions
          </Link>
          <SessionStepNav
            sessionId={detail.id}
            activeStep={activeStep}
            steps={detail.steps}
          />
        </div>
      }
      toolbar={
        <div className="session-toolbar">
          <div className="session-toolbar__context">
            <h1 className="text-h2">{detail.topic}</h1>
            <p className="text-caption session-toolbar__role">{detail.role}</p>
            <PerspectiveRosterTags slots={roster} />
          </div>
          <SessionActions sessionId={detail.id} />
        </div>
      }
    >
      <SessionWorkspace
        sessionId={detail.id}
        steps={detail.steps}
        activeStep={activeStep}
        sessionExtras={detail.sessionExtras}
        perspectiveConfig={detail.perspectiveConfig}
      />
    </AppLayout>
  );
}
