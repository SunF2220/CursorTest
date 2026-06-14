import type { DigestItem } from "../../src/types/digest";

export function dedupeItems(items: DigestItem[]): DigestItem[] {
  const seen = new Set<string>();
  const out: DigestItem[] = [];
  for (const item of items) {
    const key = item.url || item.id;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}
