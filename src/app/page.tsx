import { readFile } from "fs/promises";
import path from "path";
import type { DigestItem, DigestPayload } from "@/types/digest";

async function loadDigest(): Promise<DigestPayload> {
  const file = path.join(process.cwd(), "public", "data", "digest.json");
  const raw = await readFile(file, "utf-8");
  return JSON.parse(raw) as DigestPayload;
}

const SOURCE_TYPE_LABELS: Record<string, string> = {
  github: "GitHub",
  x: "X",
  rss: "RSS",
  html: "网页",
};

function ItemCard({ item }: { item: DigestItem }) {
  return (
    <article className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 transition hover:border-[var(--accent-dim)]">
      <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-[var(--muted)]">
        <span className="rounded bg-[var(--border)] px-2 py-0.5 uppercase tracking-wide">
          {item.sourceLabel ?? SOURCE_TYPE_LABELS[item.sourceType] ?? item.sourceType}
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

function groupBySourceType(items: DigestItem[]): Map<string, DigestItem[]> {
  const groups = new Map<string, DigestItem[]>();
  for (const item of items) {
    const key = item.sourceType;
    const list = groups.get(key) ?? [];
    list.push(item);
    groups.set(key, list);
  }
  return groups;
}

export default async function Home() {
  const digest = await loadDigest();
  const groups = groupBySourceType(digest.items);
  const sourceOrder = ["github", "x", "rss", "html"];

  const orderedTypes = [
    ...sourceOrder.filter((t) => groups.has(t)),
    ...[...groups.keys()].filter((t) => !sourceOrder.includes(t)),
  ];

  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <header className="mb-10 border-b border-[var(--border)] pb-8">
        <h1 className="text-3xl font-semibold tracking-tight">
          AI Agent 每日摘要
        </h1>
        <p className="mt-2 text-[var(--muted)]">
          日期 {digest.date} · 生成于{" "}
          {new Date(digest.generatedAt).toLocaleString("zh-CN", {
            timeZone: "UTC",
          })}{" "}
          UTC
        </p>
        <p className="mt-4 text-sm text-[var(--muted)]">
          来源与关键词由{" "}
          <code className="rounded bg-[var(--surface)] px-1.5 py-0.5 text-xs">
            config/digest.sources.yaml
          </code>{" "}
          配置。GitHub stars &gt; 1000；X 需 Bearer Token，并按关键词过滤。
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

      {orderedTypes.length === 0 ? (
        <p className="text-[var(--muted)]">
          暂无条目（可运行 npm run digest 或等待定时任务）。
        </p>
      ) : (
        orderedTypes.map((sourceType) => {
          const items = groups.get(sourceType) ?? [];
          const label =
            items[0]?.sourceLabel ??
            SOURCE_TYPE_LABELS[sourceType] ??
            sourceType;
          return (
            <section key={sourceType} className="mb-12 last:mb-0">
              <h2 className="mb-4 text-xl font-semibold">{label}</h2>
              <ul className="space-y-3">
                {items.map((item) => (
                  <li key={item.id}>
                    <ItemCard item={item} />
                  </li>
                ))}
              </ul>
            </section>
          );
        })
      )}
    </main>
  );
}
