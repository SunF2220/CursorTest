import { writeFile, mkdir } from "fs/promises";
import path from "path";
import type { DigestItem, DigestPayload } from "../src/types/digest";
import {
  GITHUB_SEARCH_QUERY_BASE,
  X_USERNAMES,
} from "../src/lib/digest-config";

function utcDateString(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function pushedSinceParam(): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - 1);
  return utcDateString(d);
}

async function githubSearchRepos(): Promise<{ items: DigestItem[]; note?: string }> {
  const since = pushedSinceParam();
  const q = `${GITHUB_SEARCH_QUERY_BASE} pushed:>${since}`;
  const url = new URL("https://api.github.com/search/repositories");
  url.searchParams.set("q", q);
  url.searchParams.set("sort", "updated");
  url.searchParams.set("per_page", "30");

  const token = process.env.GITHUB_TOKEN;
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "ai-agent-digest/1.0",
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(url.toString(), { headers });
  if (!res.ok) {
    const text = await res.text();
    return {
      items: [],
      note: `GitHub API ${res.status}: ${text.slice(0, 200)}`,
    };
  }
  const data = (await res.json()) as {
    items?: Array<{
      id: number;
      full_name: string;
      html_url: string;
      description: string | null;
      stargazers_count: number;
      language: string | null;
      pushed_at: string | null;
      updated_at: string | null;
    }>;
  };

  const items: DigestItem[] = (data.items ?? []).map((r) => ({
    id: `gh-${r.id}`,
    title: r.full_name,
    url: r.html_url,
    source: "github" as const,
    description: r.description ?? undefined,
    stars: r.stargazers_count,
    language: r.language ?? undefined,
    publishedAt: r.pushed_at ?? r.updated_at ?? undefined,
  }));

  return { items };
}

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
): Promise<DigestItem[]> {
  const url = new URL(`https://api.twitter.com/2/users/${userId}/tweets`);
  url.searchParams.set("max_results", "10");
  url.searchParams.set(
    "tweet.fields",
    "created_at,text,author_id",
  );
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
    source: "x" as const,
    publishedAt: t.created_at,
  }));
}

async function fetchAllX(notes: string[]): Promise<DigestItem[]> {
  const bearer = process.env.TWITTER_BEARER_TOKEN;
  if (!bearer) {
    notes.push(
      "未配置 TWITTER_BEARER_TOKEN，已跳过 X。请在仓库 Secrets 中设置后重新运行。",
    );
    return [];
  }

  const start = new Date();
  start.setUTCDate(start.getUTCDate() - 1);
  const startTime = start.toISOString().replace(/\.\d{3}Z$/, "Z");

  const out: DigestItem[] = [];
  for (const { username, label } of X_USERNAMES) {
    const userId = await twitterUserId(bearer, username);
    if (!userId) {
      notes.push(`X: 无法解析用户 @${username} (${label})`);
      continue;
    }
    const tweets = await twitterUserTweets(bearer, userId, startTime);
    for (const t of tweets) {
      out.push({ ...t, author: label });
    }
  }
  return out;
}

async function main() {
  const notes: string[] = [];
  const [ghResult, xItems] = await Promise.all([
    githubSearchRepos(),
    fetchAllX(notes),
  ]);

  if (ghResult.note) notes.push(ghResult.note);

  const payload: DigestPayload = {
    date: utcDateString(new Date()),
    generatedAt: new Date().toISOString(),
    github: ghResult.items,
    x: xItems.sort((a, b) => {
      const ta = a.publishedAt ?? "";
      const tb = b.publishedAt ?? "";
      return tb.localeCompare(ta);
    }),
    notes,
  };

  const dir = path.join(process.cwd(), "public", "data");
  await mkdir(dir, { recursive: true });
  const file = path.join(dir, "digest.json");
  await writeFile(file, JSON.stringify(payload, null, 2), "utf-8");
  console.log(`Wrote ${file} (${payload.github.length} GitHub, ${payload.x.length} X)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
