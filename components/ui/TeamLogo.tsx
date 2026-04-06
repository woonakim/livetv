"use client";

import { useState } from "react";

interface TeamLogoProps {
  logo?: string;
  name: string;
  fallbackEmoji: string;
  size?: number;
  enabled?: boolean;
}

export default function TeamLogo({ logo, name, fallbackEmoji, size = 28, enabled = true }: TeamLogoProps) {
  const [failed, setFailed] = useState(false);

  if (!enabled || !logo || failed) {
    return <span style={{ fontSize: size * 0.7 }}>{fallbackEmoji}</span>;
  }

  return (
    <img
      src={`${logo}?v=2`}
      alt={name}
      style={{ width: size, height: size, objectFit: "contain" }}
      onError={() => setFailed(true)}
    />
  );
}
