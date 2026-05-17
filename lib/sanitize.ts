import sanitizeHtml from "sanitize-html";

const ALLOWED_TAGS = [
  "p", "br", "hr",
  "b", "i", "u", "s", "strong", "em", "mark", "small", "sub", "sup",
  "h1", "h2", "h3", "h4", "h5", "h6",
  "ul", "ol", "li",
  "blockquote", "pre", "code",
  "a", "img",
  "table", "thead", "tbody", "tr", "th", "td",
  "div", "span",
  "iframe", // YouTube/X 임베드 허용
  "figure", "figcaption",
];

const ALLOWED_ATTRS: sanitizeHtml.IOptions["allowedAttributes"] = {
  a: ["href", "target", "rel"],
  img: ["src", "alt", "width", "height", "title"],
  iframe: ["src", "width", "height", "frameborder", "allow", "allowfullscreen", "title"],
  div: ["style", "class"],
  span: ["style", "class"],
  p: ["style", "class"],
  table: ["style", "class"],
  th: ["style", "class", "colspan", "rowspan"],
  td: ["style", "class", "colspan", "rowspan"],
  "*": ["style"],
};

// iframe src는 신뢰 도메인만 허용
const IFRAME_HOSTS = [
  "www.youtube.com", "youtube.com", "youtu.be",
  "www.youtube-nocookie.com",
  "platform.twitter.com", "x.com", "twitter.com",
];

export function sanitize(dirty: string): string {
  if (!dirty) return "";
  const cleaned = sanitizeHtml(dirty, {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: ALLOWED_ATTRS,
    allowedSchemes: ["http", "https", "mailto", "data"],
    allowedSchemesByTag: { img: ["http", "https", "data"] },
    allowedIframeHostnames: IFRAME_HOSTS,
    transformTags: {
      a: sanitizeHtml.simpleTransform("a", { rel: "noopener noreferrer", target: "_blank" }, true),
    },
    // style 속성에서 위험 값 제거
    allowedStyles: {
      "*": {
        color: [/^.+$/],
        "background-color": [/^.+$/],
        "font-size": [/^\d+(?:px|em|rem|%)$/],
        "font-weight": [/^.+$/],
        "text-align": [/^(left|right|center|justify)$/],
        "text-decoration": [/^.+$/],
      },
    },
  });
  // 빈 단락(엔터로 만든 빈 줄)이 sanitize 후 <p></p>로 남으면 시각적으로 줄바꿈이 사라짐 → <br/>을 채워 보존
  return cleaned.replace(/<p>\s*<\/p>/g, "<p><br/></p>");
}
