"use client";

import { useState, useEffect } from "react";

interface SiteSettings {
  levelDisplayMode?: string;
  [key: string]: unknown;
}

let cached: SiteSettings | null = null;
let fetchPromise: Promise<SiteSettings> | null = null;

async function fetchSiteSettings(): Promise<SiteSettings> {
  if (cached) return cached;
  if (fetchPromise) return fetchPromise;
  fetchPromise = fetch("/api/site-settings")
    .then(r => r.json())
    .then(data => { cached = data || {}; return cached!; })
    .catch(() => { cached = {}; return cached!; })
    .finally(() => { fetchPromise = null; });
  return fetchPromise;
}

export function useSiteSettings() {
  const [settings, setSettings] = useState<SiteSettings>(cached || {});
  const [loaded, setLoaded] = useState<boolean>(cached !== null);
  useEffect(() => {
    if (cached) { setSettings(cached); setLoaded(true); return; }
    fetchSiteSettings().then(d => { setSettings(d); setLoaded(true); });
  }, []);
  return { settings, loaded };
}
