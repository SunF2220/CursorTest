import { readFileSync } from "fs";
import path from "path";
import { parse } from "yaml";
import { z } from "zod";

const FiltersSchema = z.object({
  include: z.array(z.string()).default([]),
  exclude: z.array(z.string()).default([]),
});

const SourceSchema = z.object({
  id: z.string(),
  type: z.enum(["github", "x", "rss", "html"]),
  enabled: z.boolean().default(true),
  label: z.string().optional(),
  tags: z.array(z.string()).default([]),
  config: z.record(z.string(), z.unknown()),
});

const DigestConfigSchema = z.object({
  version: z.number(),
  filters: FiltersSchema,
  sources: z.array(SourceSchema),
});

export type DigestFilters = z.infer<typeof FiltersSchema>;
export type SourceDefinition = z.infer<typeof SourceSchema>;
export type DigestConfig = z.infer<typeof DigestConfigSchema>;

export const GitHubSourceConfigSchema = z.object({
  minStars: z.number().default(1000),
  perPage: z.number().default(30),
  queries: z.array(z.string()).min(1),
});

export const XAccountSchema = z.object({
  username: z.string(),
  label: z.string(),
});

export const XSourceConfigSchema = z.object({
  accounts: z.array(XAccountSchema).min(1),
  keywordFilter: z.boolean().default(true),
  maxResults: z.number().default(10),
});

export const RssSourceConfigSchema = z.object({
  url: z.string().url(),
  maxItems: z.number().default(10),
  lookbackHours: z.number().default(24),
  keywordFilter: z.boolean().default(false),
});

export type GitHubSourceConfig = z.infer<typeof GitHubSourceConfigSchema>;
export type XSourceConfig = z.infer<typeof XSourceConfigSchema>;
export type RssSourceConfig = z.infer<typeof RssSourceConfigSchema>;

const CONFIG_PATH = path.join(process.cwd(), "config", "digest.sources.yaml");

function applyEnvOverrides(config: DigestConfig): DigestConfig {
  const minStars = process.env.DIGEST_MIN_STARS;
  if (minStars) {
    const parsed = Number.parseInt(minStars, 10);
    if (!Number.isNaN(parsed)) {
      for (const source of config.sources) {
        if (source.type === "github") {
          source.config.minStars = parsed;
        }
      }
    }
  }

  const extraExclude = process.env.DIGEST_EXCLUDE;
  if (extraExclude) {
    const parts = extraExclude
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    config.filters.exclude = [...config.filters.exclude, ...parts];
  }

  return config;
}

export function loadDigestConfig(): DigestConfig {
  const raw = readFileSync(CONFIG_PATH, "utf-8");
  const parsed = parse(raw) as unknown;
  const config = DigestConfigSchema.parse(parsed);
  return applyEnvOverrides(config);
}
