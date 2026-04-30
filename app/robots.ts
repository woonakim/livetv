import { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";

export default async function robots(): Promise<MetadataRoute.Robots> {
  const settings = await prisma.siteSetting.findFirst().catch(() => null);
  const txt = settings?.seoRobotsTxt || "";

  // DB에 커스텀 robots.txt가 있으면 파싱
  if (txt) {
    const rules: MetadataRoute.Robots["rules"] = [];
    let currentAgent = "*";
    const allow: string[] = [];
    const disallow: string[] = [];
    let sitemapUrl = "https://livefelix.com/sitemap.xml";

    for (const line of txt.split("\n")) {
      const trimmed = line.trim();
      if (trimmed.toLowerCase().startsWith("user-agent:")) {
        currentAgent = trimmed.split(":").slice(1).join(":").trim();
      } else if (trimmed.toLowerCase().startsWith("allow:")) {
        allow.push(trimmed.split(":").slice(1).join(":").trim());
      } else if (trimmed.toLowerCase().startsWith("disallow:")) {
        disallow.push(trimmed.split(":").slice(1).join(":").trim());
      } else if (trimmed.toLowerCase().startsWith("sitemap:")) {
        sitemapUrl = trimmed.split(":").slice(1).join(":").trim();
      }
    }

    rules.push({
      userAgent: currentAgent,
      allow: allow.length ? allow : ["/"],
      disallow: disallow.length ? disallow : undefined,
    });

    return { rules, sitemap: sitemapUrl };
  }

  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: "https://livefelix.com/sitemap.xml",
  };
}
