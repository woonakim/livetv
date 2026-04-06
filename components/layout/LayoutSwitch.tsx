"use client";

import { usePathname } from "next/navigation";
import MainLayout from "./MainLayout";

export default function LayoutSwitch({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // /admin 경로는 MainLayout 없이 독립 렌더링
  if (pathname.startsWith("/admin")) {
    return <>{children}</>;
  }

  return <MainLayout>{children}</MainLayout>;
}
