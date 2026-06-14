import { readFile } from "fs/promises";
import path from "path";
import type { DigestItem, DigestPayload } from "@/types/digest";

async function loadDigest(): Promise<DigestPayload> {
  const file = path.join(process.cwd(), "public", "data", "digest.json");
  const raw = await readFile(file, "utf-8");
  return JSON.parse(raw) as DigestPayload;
}

function ItemCard({ item }: { item: DigestItem }) {
  return (
    <article className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 transition hover:border-[var(--accent-dim)]">
      <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-[var(--muted)]">
        <span className="rounded bg-[var(--border)] px-2 py-0.5 uppercase tracking-wide">
          {item.sourceLabel ?? item.sourceType}
        </span>
        {item.author ? <span>{item.author}</span> : null}
        {item.publishedAt ? (
          <time dateTime={item.publishedAt}>
            {item.publishedAt.slice(0, 10)}
          </time>
        ) : null}
        {item.stars != null ? (
          <span>★ {item.stars.toLocaleString()}</span>
        ) : null}
        {item.language ? <span>{item.language}</span> : null}
        {item.tags.length > 0 ? (
          <span className="text-[var(--accent-dim)]">
            {item.tags.join(" · ")}
          </span>
        ) : null}
      </div>
      <a
        href={item.url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-lg font-medium text-[var(--text)] hover:text-[var(--accent)]"
      >
        {item.title}
      </a>
      {item.description && item.sourceType !== "x" ? (
        <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
          {item.description}
        </p>
      ) : null}
    </article>
  );
}

function groupBySource(
  items: DigestItem[],
): { sourceId: string; label: string; items: DigestItem[] }[] {
  const order: string[] = [];
  const map = new Map<string, { label: string; items: DigestItem[] }>();

  for (const item of items) {
    if (!map.has(item.sourceId)) {
      order.push(item.sourceId);
      map.set(item.sourceId, {
        label: item.sourceLabel ?? item.sourceType,
        items: [],
      });
    }
    map.get(item.sourceId)!.items.push(item);
  }

  return order.map((sourceId) => ({
    sourceId,
    label: map.get(sourceId)!.label,
    items: map.get(sourceId)!.items,
  }));
}

export default async function Home() {
  const digest = await loadDigest();
  const groups = groupBySource(digest.items);
  const total = digest.items.length;

  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <header className="mb-10 border-b border-[var(--border)] pb-8">
        <h1 className="text-3xl font-semibold tracking-tight">
          AI 资讯每日摘要
        </h1>
        <p className="mt-2 text-[var(--muted)]">
          日期 {digest.date} · 共 {total} 条 · 生成于{" "}
          {new Date(digest.generatedAt).toLocaleString("zh-CN", {
            timeZone: "Asia/Shanghai",
          })}{" "}
          (北京时间)
        </p>
        <p className="mt-4 text-sm text-[var(--muted)]">
          来源：GitHub（stars &gt; 1000）、Claude Code Changelog、Cursor
          Changelog、X 官方账号。配置见{" "}
          <code className="rounded bg-[var(--surface)] px-1.5 py-0.5 text-xs">
            config/digest.sources.yaml
          </code>
          。
        </p>
      </header>

      {digest.notes.length > 0 ? (
        <aside className="mb-8 rounded-lg border border-amber-900/50 bg-amber-950/30 p-4 text-sm text-amber-100/90">
          <p className="font-medium text-amber-200">提示</p>
          <ul className="mt-2 list-inside list-disc space-y-1">
            {digest.notes.map((n, i) => (
              <li key={i}>{n}</li>
            ))}
          </ul>
        </aside>
      ) : null}

      {groups.length === 0 ? (
        <p className="text-[var(--muted)]">
          暂无条目（可运行 npm run digest 或等待定时任务）。
        </p>
      ) : (
        groups.map((group) => (
          <section key={group.sourceId} className="mb-12 last:mb-0">
            <h2 className="mb-4 text-xl font-semibold">
              {group.label}
              <span className="ml-2 text-sm font-normal text-[var(--muted)]">
                {group.items.length} 条
              </span>
            </h2>
            <ul className="space-y-3">
              {group.items.map((item) => (
                <li key={item.id}>
                  <ItemCard item={item} />
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </main>
  );
}
