import { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";

const BASE_URL = "https://livefelix.com";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  // 정적 페이지
  const staticPages: MetadataRoute.Sitemap = [
    { url: BASE_URL, lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: `${BASE_URL}/broadcast`, lastModified: now, changeFrequency: "always", priority: 0.9 },
    { url: `${BASE_URL}/live`, lastModified: now, changeFrequency: "always", priority: 0.9 },
    { url: `${BASE_URL}/analysis`, lastModified: now, changeFrequency: "daily", priority: 0.8 },
    { url: `${BASE_URL}/analysis/premium`, lastModified: now, changeFrequency: "daily", priority: 0.8 },
    { url: `${BASE_URL}/youtube/highlights`, lastModified: now, changeFrequency: "daily", priority: 0.7 },
    { url: `${BASE_URL}/youtube/live`, lastModified: now, changeFrequency: "always", priority: 0.7 },
    { url: `${BASE_URL}/sports-info`, lastModified: now, changeFrequency: "daily", priority: 0.6 },
    { url: `${BASE_URL}/sports-info/standings`, lastModified: now, changeFrequency: "daily", priority: 0.6 },
    { url: `${BASE_URL}/events`, lastModified: now, changeFrequency: "daily", priority: 0.6 },
    { url: `${BASE_URL}/events/board`, lastModified: now, changeFrequency: "daily", priority: 0.6 },
    { url: `${BASE_URL}/events/attendance`, lastModified: now, changeFrequency: "daily", priority: 0.6 },
    { url: `${BASE_URL}/partners`, lastModified: now, changeFrequency: "weekly", priority: 0.5 },
    { url: `${BASE_URL}/points`, lastModified: now, changeFrequency: "weekly", priority: 0.5 },
    { url: `${BASE_URL}/notice`, lastModified: now, changeFrequency: "weekly", priority: 0.4 },
  ];

  // 동적 페이지: 분석글
  const posts = await prisma.analysisPost.findMany({
    where: {},
    select: { id: true, updatedAt: true },
    orderBy: { id: "desc" },
    take: 200,
  }).catch(() => []);
  const postPages: MetadataRoute.Sitemap = posts.map(p => ({
    url: `${BASE_URL}/analysis/${p.id}`,
    lastModified: p.updatedAt,
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  // 동적 페이지: 이벤트
  const events = await prisma.event.findMany({
    where: { isActive: true },
    select: { id: true, updatedAt: true },
    orderBy: { id: "desc" },
    take: 50,
  }).catch(() => []);
  const eventPages: MetadataRoute.Sitemap = events.map(e => ({
    url: `${BASE_URL}/events/${e.id}`,
    lastModified: e.updatedAt,
    changeFrequency: "daily",
    priority: 0.6,
  }));

  // 동적 페이지: 공지사항
  const notices = await prisma.notice.findMany({
    where: { isActive: true },
    select: { id: true, updatedAt: true },
    orderBy: { id: "desc" },
    take: 50,
  }).catch(() => []);
  const noticePages: MetadataRoute.Sitemap = notices.map(n => ({
    url: `${BASE_URL}/notice/${n.id}`,
    lastModified: n.updatedAt,
    changeFrequency: "monthly",
    priority: 0.4,
  }));

  return [...staticPages, ...postPages, ...eventPages, ...noticePages];
}
