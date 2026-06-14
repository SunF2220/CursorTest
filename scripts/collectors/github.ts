import {
  GitHubSourceConfigSchema,
  type SourceDefinition,
} from "../../src/lib/digest-config";
import type { DigestItem } from "../../src/types/digest";
import type { Collector, CollectorContext } from "./types";

function utcDateString(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function pushedSinceParam(): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - 1);
  return utcDateString(d);
}

async function searchQuery(
  query: string,
  minStars: number,
  perPage: number,
  since: string,
  source: SourceDefinition,
): Promise<{ items: DigestItem[]; note?: string }> {
  const q = `${query} stars:>${minStars} pushed:>${since}`;
  const url = new URL("https://api.github.com/search/repositories");
  url.searchParams.set("q", q);
  url.searchParams.set("sort", "updated");
  url.searchParams.set("per_page", String(perPage));

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
      note: `GitHub [${source.id}] ${res.status}: ${text.slice(0, 200)}`,
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
    sourceId: source.id,
    sourceType: source.type,
    sourceLabel: source.label,
    tags: [...source.tags],
    description: r.description ?? undefined,
    stars: r.stargazers_count,
    language: r.language ?? undefined,
    publishedAt: r.pushed_at ?? r.updated_at ?? undefined,
  }));

  return { items };
}

export const githubCollector: Collector = async ({ source, notes }) => {
  const config = GitHubSourceConfigSchema.parse(source.config);
  const since = pushedSinceParam();
  const allItems: DigestItem[] = [];

  for (const query of config.queries) {
    const result = await searchQuery(
      query,
      config.minStars,
      config.perPage,
      since,
      source,
    );
    if (result.note) notes.push(result.note);
    allItems.push(...result.items);
  }

  return { items: allItems };
};
