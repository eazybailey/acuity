"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

// Re-fetch server data when the app comes back to the foreground (e.g. after buying a
// package in Acuity's checkout), so "my minutes" reflects the API without a manual reload.
export function RefreshOnReturn() {
  const router = useRouter();
  useEffect(() => {
    const onShow = () => {
      if (document.visibilityState === "visible") router.refresh();
    };
    document.addEventListener("visibilitychange", onShow);
    window.addEventListener("pageshow", onShow);
    return () => {
      document.removeEventListener("visibilitychange", onShow);
      window.removeEventListener("pageshow", onShow);
    };
  }, [router]);
  return null;
}
