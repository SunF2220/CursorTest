import { githubCollector } from "./github";
import { rssCollector } from "./rss";
import type { Collector } from "./types";
import { xCollector } from "./x";

export const collectors: Record<string, Collector> = {
  github: githubCollector,
  x: xCollector,
  rss: rssCollector,
};

export function getCollector(type: string): Collector | undefined {
  return collectors[type];
}
