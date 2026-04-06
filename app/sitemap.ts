import { MetadataRoute } from "next";

const BASE_URL = "https://livefelix.com";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: BASE_URL, lastModified: new Date(), changeFrequency: "daily", priority: 1 },
    { url: `${BASE_URL}/broadcast`, lastModified: new Date(), changeFrequency: "always", priority: 0.9 },
    { url: `${BASE_URL}/analysis`, lastModified: new Date(), changeFrequency: "daily", priority: 0.8 },
    { url: `${BASE_URL}/analysis/premium`, lastModified: new Date(), changeFrequency: "daily", priority: 0.8 },
    { url: `${BASE_URL}/youtube/highlights`, lastModified: new Date(), changeFrequency: "daily", priority: 0.7 },
    { url: `${BASE_URL}/youtube/live`, lastModified: new Date(), changeFrequency: "always", priority: 0.7 },
    { url: `${BASE_URL}/sports-info`, lastModified: new Date(), changeFrequency: "daily", priority: 0.6 },
    { url: `${BASE_URL}/partners`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.5 },
    { url: `${BASE_URL}/events/attendance`, lastModified: new Date(), changeFrequency: "daily", priority: 0.6 },
    { url: `${BASE_URL}/points`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.5 },
    { url: `${BASE_URL}/notice`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.4 },
  ];
}
