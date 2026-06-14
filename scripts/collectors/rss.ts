import { RssSourceConfigSchema } from "../../src/lib/digest-config";
import type { DigestItem } from "../../src/types/digest";
import type { Collector } from "./types";

type RssRawItem = {
  title: string;
  link: string;
  guid: string;
  pubDate?: string;
  description?: string;
};

function decodeEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x3C;/g, "<")
    .replace(/&#x3E;/g, ">");
}

function stripHtml(html: string): string {
  return decodeEntities(html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());
}

function extractTag(block: string, tag: string): string | undefined {
  const cdata = block.match(
    new RegExp(`<${tag}><!\\[CDATA\\[([\\s\\S]*?)\\]\\]></${tag}>`, "i"),
  );
  if (cdata?.[1]) return cdata[1].trim();

  const plain = block.match(
    new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`, "i"),
  );
  return plain?.[1]?.trim();
}

function parseRssItems(xml: string): RssRawItem[] {
  const items: RssRawItem[] = [];
  const blocks = xml.match(/<item[\s\S]*?<\/item>/gi) ?? [];

  for (const block of blocks) {
    const title = extractTag(block, "title");
    const link = extractTag(block, "link");
    if (!title || !link) continue;

    const guid =
      extractTag(block, "guid") ??
      link;
    const pubDate = extractTag(block, "pubDate");
    const description =
      extractTag(block, "content:encoded") ??
      extractTag(block, "description");

    items.push({ title, link, guid, pubDate, description });
  }

  return items;
}

function withinLookback(pubDate: string | undefined, lookbackHours: number): boolean {
  if (!pubDate) return true;
  const ts = Date.parse(pubDate);
  if (Number.isNaN(ts)) return true;
  const cutoff = Date.now() - lookbackHours * 60 * 60 * 1000;
  return ts >= cutoff;
}

export const rssCollector: Collector = async ({ source, notes }) => {
  const config = RssSourceConfigSchema.parse(source.config);

  const res = await fetch(config.url, {
    headers: { "User-Agent": "ai-agent-digest/1.0" },
  });
  if (!res.ok) {
    notes.push(`RSS [${source.id}] ${res.status}: ${config.url}`);
    return { items: [] };
  }

  const xml = await res.text();
  const parsed = parseRssItems(xml).filter((item) =>
    withinLookback(item.pubDate, config.lookbackHours),
  );

  const items: DigestItem[] = parsed.slice(0, config.maxItems).map((item) => {
    const plainDescription = item.description
      ? stripHtml(item.description)
      : undefined;
    return {
      id: `rss-${source.id}-${item.guid}`,
      title: decodeEntities(stripHtml(item.title)),
      url: item.link,
      sourceId: source.id,
      sourceType: source.type,
      sourceLabel: source.label,
      tags: [...source.tags],
      description: plainDescription
        ? plainDescription.slice(0, 280) +
          (plainDescription.length > 280 ? "…" : "")
        : undefined,
      publishedAt: item.pubDate
        ? new Date(item.pubDate).toISOString()
        : undefined,
    };
  });

  return { items };
};

export function rssUsesIncludeFilter(source: {
  config: Record<string, unknown>;
}): boolean {
  const config = RssSourceConfigSchema.parse(source.config);
  return config.keywordFilter;
}
