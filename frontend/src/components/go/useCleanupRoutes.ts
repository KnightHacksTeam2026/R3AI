"use client";

import { useEffect, useState } from "react";
import { parseRouteFeed, SAMPLE_ROUTES, type CleanupRoute } from "./cleanupRoutes";

const endpoint = process.env.NEXT_PUBLIC_GO_ROUTES_URL;

export default function useCleanupRoutes() {
  const [routes, setRoutes] = useState<CleanupRoute[]>(endpoint ? [] : SAMPLE_ROUTES);
  const [loading, setLoading] = useState(Boolean(endpoint));
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!endpoint) return;
    const controller = new AbortController();
    let disposed = false;
    const timeout = window.setTimeout(() => controller.abort(), 12000);
    async function load() {
      try {
        const response = await fetch(endpoint!, { signal: controller.signal, credentials: "omit", cache: "no-store", headers: { Accept: "application/json" } });
        if (!response.ok) throw new Error("Request failed");
        const body = await response.text();
        if (body.length > 5_000_000) throw new Error("Route feed too large");
        const next = parseRouteFeed(JSON.parse(body));
        if (!disposed) { setRoutes(next); setError(""); }
      } catch {
        if (!disposed) setError("Cleanup routes couldn’t be loaded. Check your connection and try again.");
      } finally {
        window.clearTimeout(timeout);
        if (!disposed) setLoading(false);
      }
    }
    void load();
    return () => { disposed = true; controller.abort(); window.clearTimeout(timeout); };
  }, [attempt]);

  return { routes, loading, error, samples: !endpoint, retry: () => { setLoading(true); setError(""); setAttempt(value => value + 1); } };
}
