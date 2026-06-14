import {
  XSourceConfigSchema,
  type SourceDefinition,
} from "../../src/lib/digest-config";
import type { DigestItem } from "../../src/types/digest";
import type { Collector } from "./types";

async function twitterUserId(
  bearer: string,
  username: string,
): Promise<string | null> {
  const url = `https://api.twitter.com/2/users/by/username/${encodeURIComponent(username)}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${bearer}` },
  });
  if (!res.ok) return null;
  const j = (await res.json()) as { data?: { id: string } };
  return j.data?.id ?? null;
}

async function twitterUserTweets(
  bearer: string,
  userId: string,
  startTime: string,
  maxResults: number,
  source: SourceDefinition,
  author: string,
): Promise<DigestItem[]> {
  const url = new URL(`https://api.twitter.com/2/users/${userId}/tweets`);
  url.searchParams.set("max_results", String(maxResults));
  url.searchParams.set("tweet.fields", "created_at,text,author_id");
  url.searchParams.set("start_time", startTime);
  url.searchParams.set("exclude", "retweets,replies");

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${bearer}` },
  });
  if (!res.ok) return [];

  const j = (await res.json()) as {
    data?: Array<{ id: string; text: string; created_at?: string }>;
  };

  return (j.data ?? []).map((t) => ({
    id: `x-${t.id}`,
    title: t.text.slice(0, 120) + (t.text.length > 120 ? "…" : ""),
    url: `https://x.com/i/web/status/${t.id}`,
    sourceId: source.id,
    sourceType: source.type,
    sourceLabel: source.label,
    tags: [...source.tags],
    author,
    description: t.text,
    publishedAt: t.created_at,
  }));
}

export const xCollector: Collector = async ({ source, notes }) => {
  const config = XSourceConfigSchema.parse(source.config);
  const bearer = process.env.TWITTER_BEARER_TOKEN;

  if (!bearer) {
    notes.push(
      "未配置 TWITTER_BEARER_TOKEN，已跳过 X。请在仓库 Secrets 中设置后重新运行。",
    );
    return { items: [] };
  }

  const start = new Date();
  start.setUTCDate(start.getUTCDate() - 1);
  const startTime = start.toISOString().replace(/\.\d{3}Z$/, "Z");

  const items: DigestItem[] = [];
  for (const { username, label } of config.accounts) {
    const userId = await twitterUserId(bearer, username);
    if (!userId) {
      notes.push(`X [${source.id}]: 无法解析用户 @${username} (${label})`);
      continue;
    }
    const tweets = await twitterUserTweets(
      bearer,
      userId,
      startTime,
      config.maxResults,
      source,
      label,
    );
    items.push(...tweets);
  }

  return { items };
};

export function xUsesIncludeFilter(source: SourceDefinition): boolean {
  const config = XSourceConfigSchema.parse(source.config);
  return config.keywordFilter;
}
