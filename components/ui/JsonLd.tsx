export function WebsiteJsonLd({ name, url, description }: { name: string; url: string; description: string }) {
  const data = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name,
    url,
    description,
    potentialAction: {
      "@type": "SearchAction",
      target: `${url}/analysis?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />;
}

export function ArticleJsonLd({ title, description, url, datePublished, author }: {
  title: string; description: string; url: string; datePublished: string; author: string;
}) {
  const data = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: title,
    description,
    url,
    datePublished,
    author: { "@type": "Person", name: author },
    publisher: { "@type": "Organization", name: "라이브Felix", url: "https://livetv-01.com" },
  };
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />;
}

export function EventJsonLd({ name, description, startDate, url }: {
  name: string; description: string; startDate: string; url: string;
}) {
  const data = {
    "@context": "https://schema.org",
    "@type": "Event",
    name,
    description,
    startDate,
    url,
    location: { "@type": "VirtualLocation", url },
    organizer: { "@type": "Organization", name: "라이브Felix" },
  };
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />;
}

export function BroadcastJsonLd({ name, description, url, isLive }: {
  name: string; description: string; url: string; isLive: boolean;
}) {
  const data = {
    "@context": "https://schema.org",
    "@type": "BroadcastEvent",
    name,
    description,
    url,
    isLiveBroadcast: isLive,
    broadcastOfEvent: { "@type": "SportsEvent", name },
  };
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />;
}
