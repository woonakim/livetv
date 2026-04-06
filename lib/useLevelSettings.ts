"use client";

import { useState, useEffect } from "react";

interface LevelSetting {
  level: number;
  name: string;
  requiredExp: number;
  badge: string;
  color: string;
  bgColor: string;
}

// 모듈 레벨 캐시 (모든 컴포넌트에서 공유, API 1번만 호출)
let cachedSettings: LevelSetting[] | null = null;
let fetchPromise: Promise<LevelSetting[]> | null = null;

async function fetchLevelSettings(): Promise<LevelSetting[]> {
  if (cachedSettings) return cachedSettings;
  if (fetchPromise) return fetchPromise;

  fetchPromise = fetch("/api/levels")
    .then(r => r.json())
    .then(data => {
      cachedSettings = Array.isArray(data) ? data : [];
      return cachedSettings;
    })
    .catch(() => {
      cachedSettings = [];
      return [];
    })
    .finally(() => {
      fetchPromise = null;
    });

  return fetchPromise;
}

export function useLevelSettings() {
  const [settings, setSettings] = useState<LevelSetting[]>(cachedSettings || []);

  useEffect(() => {
    if (cachedSettings) {
      setSettings(cachedSettings);
      return;
    }
    fetchLevelSettings().then(setSettings);
  }, []);

  return { settings };
}
