"use client";

import { useTransition } from "react";
import { deleteSession, exportSessionMarkdown } from "@perspective-os/web-server/actions";

export function SessionActions({ sessionId }: { sessionId: string }) {
  const [pending, startTransition] = useTransition();

  const exportMd = () => {
    startTransition(async () => {
      const markdown = await exportSessionMarkdown(sessionId);
      const blob = new Blob([markdown], { type: "text/markdown" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `research-${sessionId.slice(0, 8)}.md`;
      a.click();
      URL.revokeObjectURL(url);
    });
  };

  const remove = () => {
    if (!confirm("Delete this session?")) return;
    startTransition(async () => {
      await deleteSession(sessionId);
    });
  };

  return (
    <div className="action-row">
      <button
        type="button"
        className="btn btn--secondary"
        disabled={pending}
        onClick={exportMd}
      >
        Export Markdown
      </button>
      <button
        type="button"
        className="btn btn--text"
        disabled={pending}
        onClick={remove}
      >
        Delete
      </button>
    </div>
  );
}
