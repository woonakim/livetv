"use client";

import { useState, useEffect } from "react";

interface Banner {
  id: number;
  name: string;
  imageUrl: string;
  linkUrl: string;
  position: string;
  isActive: boolean;
}

let bannerCache: { data: Banner[]; ts: number } | null = null;

export default function SidebarBanners({ position }: { position: string }) {
  const [banners, setBanners] = useState<Banner[]>(bannerCache?.data.filter(b => b.position === position) || []);

  useEffect(() => {
    const now = Date.now();
    if (bannerCache && now - bannerCache.ts < 60000) {
      setBanners(bannerCache.data.filter(b => b.position === position));
      return;
    }
    fetch("/api/banners")
      .then(r => r.json())
      .then(data => {
        const all = Array.isArray(data) ? data : [];
        bannerCache = { data: all, ts: Date.now() };
        setBanners(all.filter(b => b.position === position));
      })
      .catch(() => {});
  }, [position]);

  if (banners.length === 0) return null;

  return (
    <>
      {banners.map(b => (
        <a key={b.id} href={b.linkUrl || "#"} target={b.linkUrl ? "_blank" : undefined} rel="noopener noreferrer" className="block w-full rounded-lg overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={b.imageUrl} alt={b.name} className="w-full h-auto object-cover" />
        </a>
      ))}
    </>
  );
}
