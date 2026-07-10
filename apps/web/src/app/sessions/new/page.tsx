import { AppLayout } from "@/shell/AppLayout";
import Link from "next/link";
import { NewSessionForm } from "@/components/NewSessionForm";

export default function NewSessionPage() {
  return (
    <AppLayout
      sidebar={
        <Link href="/" className="app-sidebar__back text-link">
          ← All sessions
        </Link>
      }
    >
      <div className="stack-gap-6 new-session-page">
        <header className="stack-gap-3">
          <p className="text-label">New session</p>
          <h1 className="text-h1">Start research</h1>
          <p className="text-body text-muted">
            Describe the topic, your role, the decision you need to inform, and
            choose five expert lenses — or let us suggest a roster.
          </p>
        </header>

        <NewSessionForm />
      </div>
    </AppLayout>
  );
}
