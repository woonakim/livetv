import type { Metadata, Viewport } from "next";
import "./globals.css";

// 모바일 키보드가 layout viewport를 변경하도록 — iOS/Android 모두 적용
// 키보드 닫혔을 때 화면 복귀가 정상적으로 작동
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  interactiveWidget: "resizes-content",
};
import LayoutSwitch from "@/components/layout/LayoutSwitch";
import { prisma } from "@/lib/prisma";
import Script from "next/script";
import { WebsiteJsonLd } from "@/components/ui/JsonLd";

const BASE_URL = "https://livefelix.com";

export async function generateMetadata(): Promise<Metadata> {
  const s = await prisma.siteSetting.findFirst().catch(() => null);
  return {
    metadataBase: new URL(BASE_URL),
    title: { default: s?.seoTitle || "라이브Felix - 스포츠 중계 분석 커뮤니티", template: "%s | 라이브Felix" },
    description: s?.seoDescription || "축구, 야구, 농구, 배구, UFC, LOL 무료 스포츠 중계 및 분석 플랫폼.",
    keywords: (s?.seoKeywords || "스포츠중계,무료중계,EPL,NBA,KBO,UFC,LOL").split(",").map(k => k.trim()),
    icons: { icon: s?.seoFavicon || "/icon.svg" },
    openGraph: {
      title: s?.seoTitle || "라이브Felix",
      description: s?.seoDescription || "축구, 야구, 농구, 배구, UFC, LOL 무료 스포츠 중계 및 분석 플랫폼.",
      url: BASE_URL,
      siteName: "라이브Felix",
      images: s?.seoOgImage ? [{ url: s.seoOgImage, width: 1200, height: 630 }] : [],
      type: "website",
      locale: "ko_KR",
    },
    twitter: {
      card: "summary_large_image",
      title: s?.seoTitle || "라이브Felix",
      description: s?.seoDescription || "",
      images: s?.seoOgImage ? [s.seoOgImage] : [],
    },
    verification: {
      google: s?.seoGoogleVerification || undefined,
      other: s?.seoNaverVerification ? { "naver-site-verification": s.seoNaverVerification } : undefined,
    },
  };
}

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const s = await prisma.siteSetting.findFirst().catch(() => null);
  const gaId = s?.seoGaId || "";

  return (
    <html lang="ko">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#0ea5e9" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <link rel="apple-touch-icon" href="/logo/logo_background_transparency.png" />
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" />
      </head>
      <body className="antialiased">
        <WebsiteJsonLd
          name={s?.seoTitle || "라이브Felix"}
          url={BASE_URL}
          description={s?.seoDescription || "축구, 야구, 농구, 배구, UFC, LOL 무료 스포츠 중계 및 분석 플랫폼."}
        />
        <LayoutSwitch>{children}</LayoutSwitch>
        {gaId && (
          <>
            <Script src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`} strategy="afterInteractive" />
            <Script id="ga4" strategy="afterInteractive">{`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${gaId}');`}</Script>
          </>
        )}
      </body>
    </html>
  );
}
