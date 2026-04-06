import type { Metadata } from "next";
import "./globals.css";
import LayoutSwitch from "@/components/layout/LayoutSwitch";

const BASE_URL = "https://livefelix.com";

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: { default: "라이브Felix - 스포츠 중계 분석 커뮤니티", template: "%s | 라이브Felix" },
  description: "축구, 야구, 농구, 배구, UFC, LOL 무료 스포츠 중계 및 분석 플랫폼.",
  keywords: ["스포츠중계", "무료중계", "EPL", "NBA", "KBO", "UFC", "LOL"],
  icons: { icon: "/icon.svg" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#0ea5e9" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <link rel="apple-touch-icon" href="/real_logo/livetv_logo.png" />
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css"
        />
      </head>
      <body className="antialiased">
        <LayoutSwitch>{children}</LayoutSwitch>
      </body>
    </html>
  );
}
