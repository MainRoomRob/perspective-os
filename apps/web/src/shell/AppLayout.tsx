import Link from "next/link";
import type { ReactNode } from "react";
import { ColorModeToggle } from "@/ui/ColorModeToggle";

export function AppLayout({
  sidebar,
  toolbar,
  children,
}: {
  sidebar?: ReactNode;
  toolbar?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="app-layout">
      <aside className="app-sidebar">
        <div>
          <Link href="/" className="wordmark">
            Perspective OS
          </Link>
        </div>
        {sidebar}
        <div className="app-sidebar__footer">
          <ColorModeToggle />
        </div>
      </aside>
      <div className="app-main">
        {toolbar ? <header className="app-toolbar">{toolbar}</header> : null}
        <main className="app-content">{children}</main>
      </div>
    </div>
  );
}
