"use client";

import { useEffect } from "react";

interface Props {
  title?: string;
  description?: string;
  image?: string;
}

export default function MetaHead({ title, description, image }: Props) {
  useEffect(() => {
    if (title) {
      document.title = `${title} | 라이브Felix`;
      setMeta("og:title", title);
      setMeta("twitter:title", title);
    }
    if (description) {
      setMeta("description", description);
      setMeta("og:description", description);
      setMeta("twitter:description", description);
    }
    if (image) {
      setMeta("og:image", image);
      setMeta("twitter:image", image);
    }
  }, [title, description, image]);

  return null;
}

function setMeta(name: string, content: string) {
  const isOg = name.startsWith("og:") || name.startsWith("twitter:");
  const attr = isOg ? "property" : "name";
  let el = document.querySelector(`meta[${attr}="${name}"]`) as HTMLMetaElement;
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, name);
    document.head.appendChild(el);
  }
  el.content = content;
}
