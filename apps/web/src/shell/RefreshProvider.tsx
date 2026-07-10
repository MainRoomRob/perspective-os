"use client";

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useTransition,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";

export type RefreshOptions = {
  /** When false, router.refresh runs without the fullscreen overlay. Default true. */
  overlay?: boolean;
};

type RefreshContextValue = {
  refresh: (options?: RefreshOptions) => void;
  isRefreshing: boolean;
};

const RefreshContext = createContext<RefreshContextValue | null>(null);

export function RefreshProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [isRefreshing, startTransition] = useTransition();
  const showOverlayRef = useRef(true);

  const refresh = useCallback(
    (options?: RefreshOptions) => {
      showOverlayRef.current = options?.overlay !== false;
      startTransition(() => {
        router.refresh();
      });
    },
    [router],
  );

  return (
    <RefreshContext.Provider value={{ refresh, isRefreshing }}>
      <div style={{ position: "relative", minHeight: "100%" }}>
        {children}
        {isRefreshing && showOverlayRef.current ? (
          <div
            className="refresh-overlay"
            aria-busy="true"
            aria-label="Updating page"
          />
        ) : null}
      </div>
    </RefreshContext.Provider>
  );
}

export function useRefreshRouter(): RefreshContextValue {
  const ctx = useContext(RefreshContext);
  const router = useRouter();
  const [isRefreshing, startTransition] = useTransition();
  const showOverlayRef = useRef(true);

  const refresh = useCallback(
    (options?: RefreshOptions) => {
      if (ctx) {
        ctx.refresh(options);
        return;
      }
      showOverlayRef.current = options?.overlay !== false;
      startTransition(() => {
        router.refresh();
      });
    },
    [ctx, router],
  );

  return {
    refresh,
    isRefreshing: ctx?.isRefreshing ?? isRefreshing,
  };
}
