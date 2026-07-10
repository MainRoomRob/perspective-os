import type { ReactNode } from "react";
import { RefreshProvider } from "@/shell/RefreshProvider";

export default function SessionLayout({ children }: { children: ReactNode }) {
  return <RefreshProvider>{children}</RefreshProvider>;
}
