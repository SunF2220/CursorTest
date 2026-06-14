import type { SourceDefinition } from "../../src/lib/digest-config";
import { rssUsesIncludeFilter } from "../collectors/rss";
import { xUsesIncludeFilter } from "../collectors/x";

export function shouldApplyIncludeFilter(source: SourceDefinition): boolean {
  if (source.type === "x") return xUsesIncludeFilter(source);
  if (source.type === "rss") return rssUsesIncludeFilter(source);
  return false;
}
