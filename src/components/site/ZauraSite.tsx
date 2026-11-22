"use client";

import { useState, useSyncExternalStore } from "react";
import dynamic from "next/dynamic";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import ZauraSitePage from "./ZauraSitePage";
import type { SiteData } from "@/types/site";

// The admin dashboard is code-split so it never ships to public visitors.
const AdminApp = dynamic(() => import("@/components/admin/AdminApp"), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" aria-label="Loading" />
    </div>
  ),
});

// Hash routing on the single route: #admin opens the management dashboard.
// useSyncExternalStore keeps SSR output ('site') and the client in sync
// without hydration mismatches.
function subscribeHash(onChange: () => void) {
  window.addEventListener("hashchange", onChange);
  return () => window.removeEventListener("hashchange", onChange);
}

function getHashView(): "site" | "admin" {
  return window.location.hash === "#admin" ? "admin" : "site";
}

export default function ZauraSite({ data }: { data: SiteData }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: { queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: false } },
      })
  );

  const view = useSyncExternalStore(subscribeHash, getHashView, () => "site" as const);

  const exitAdmin = () => {
    if (window.location.hash === "#admin") {
      history.replaceState(null, "", window.location.pathname);
      window.dispatchEvent(new HashChangeEvent("hashchange"));
    }
  };

  return (
    <QueryClientProvider client={queryClient}>
      {view === "admin" ? <AdminApp onExit={exitAdmin} /> : <ZauraSitePage data={data} />}
    </QueryClientProvider>
  );
}
