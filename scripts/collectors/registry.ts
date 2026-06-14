import { githubCollector } from "./github";
import type { Collector } from "./types";
import { xCollector } from "./x";

export const collectors: Record<string, Collector> = {
  github: githubCollector,
  x: xCollector,
};

export function getCollector(type: string): Collector | undefined {
  return collectors[type];
}
