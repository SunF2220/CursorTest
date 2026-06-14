import type { DigestFilters } from "../../src/lib/digest-config";
import type { DigestItem } from "../../src/types/digest";

function itemText(item: DigestItem): string {
  return `${item.title} ${item.description ?? ""}`.toLowerCase();
}

export function applyExcludeFilter(
  items: DigestItem[],
  exclude: string[],
): DigestItem[] {
  if (exclude.length === 0) return items;
  return items.filter((item) => {
    const text = itemText(item);
    return !exclude.some((keyword) => text.includes(keyword.toLowerCase()));
  });
}

export function applyIncludeFilter(
  items: DigestItem[],
  include: string[],
): DigestItem[] {
  if (include.length === 0) return items;
  return items.filter((item) => {
    const text = itemText(item);
    return include.some((keyword) => text.includes(keyword.toLowerCase()));
  });
}

export function applyFilters(
  items: DigestItem[],
  filters: DigestFilters,
  options: { include?: boolean } = {},
): DigestItem[] {
  let result = applyExcludeFilter(items, filters.exclude);
  if (options.include) {
    result = applyIncludeFilter(result, filters.include);
  }
  return result;
}
