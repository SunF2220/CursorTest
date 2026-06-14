import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { getCollector } from "./collectors/registry";
import { dedupeItems } from "./pipeline/dedupe";
import { applyFilters } from "./pipeline/filters";
import { shouldApplyIncludeFilter } from "./pipeline/source-filters";
import { loadDigestConfig } from "../src/lib/digest-config";
import type { DigestItem, DigestPayload } from "../src/types/digest";

function utcDateString(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function sortByDate(items: DigestItem[]): DigestItem[] {
  return [...items].sort((a, b) => {
    const ta = a.publishedAt ?? "";
    const tb = b.publishedAt ?? "";
    return tb.localeCompare(ta);
  });
}

async function main() {
  const config = loadDigestConfig();
  const notes: string[] = [];
  const allItems: DigestItem[] = [];

  for (const source of config.sources) {
    if (!source.enabled) continue;

    const collector = getCollector(source.type);
    if (!collector) {
      notes.push(`未知采集器类型: ${source.type} (${source.id})`);
      continue;
    }

    const { items } = await collector({ source, notes });
    const filtered = applyFilters(items, config.filters, {
      include: shouldApplyIncludeFilter(source),
    });
    allItems.push(...filtered);
  }

  const payload: DigestPayload = {
    date: utcDateString(new Date()),
    generatedAt: new Date().toISOString(),
    configVersion: config.version,
    items: sortByDate(dedupeItems(allItems)),
    notes,
  };

  const dir = path.join(process.cwd(), "public", "data");
  await mkdir(dir, { recursive: true });
  const file = path.join(dir, "digest.json");
  await writeFile(file, JSON.stringify(payload, null, 2), "utf-8");

  const counts = payload.items.reduce<Record<string, number>>((acc, item) => {
    acc[item.sourceType] = (acc[item.sourceType] ?? 0) + 1;
    return acc;
  }, {});
  const summary = Object.entries(counts)
    .map(([type, count]) => `${count} ${type}`)
    .join(", ");
  console.log(`Wrote ${file} (${summary || "0 items"})`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
