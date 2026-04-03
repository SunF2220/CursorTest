import { readFile } from "fs/promises";
import path from "path";
import type { DigestPayload } from "@/types/digest";

async function loadDigest(): Promise<DigestPayload> {
  const file = path.join(process.cwd(), "public", "data", "digest.json");
  const raw = await readFile(file, "utf-8");
  return JSON.parse(raw) as DigestPayload;
}

function ItemCard({
  item,
}: {
  item: {
    title: string;
    url: string;
    source: string;
    author?: string;
    description?: string;
    publishedAt?: string;
    stars?: number;
    language?: string;
  };
}) {
  return (
    <article
      className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 transition hover:border-[var(--accent-dim)]"
    >
      <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-[var(--muted)]">
        <span className="rounded bg-[var(--border)] px-2 py-0.5 uppercase tracking-wide">
          {item.source}
        </span>
        {item.author ? (
          <span>{item.author}</span>
        ) : null}
        {item.publishedAt ? (
          <time dateTime={item.publishedAt}>
            {item.publishedAt.slice(0, 10)}
          </time>
        ) : null}
        {item.stars != null ? (
          <span>★ {item.stars.toLocaleString()}</span>
        ) : null}
        {item.language ? <span>{item.language}</span> : null}
      </div>
      <a
        href={item.url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-lg font-medium text-[var(--text)] hover:text-[var(--accent)]"
      >
        {item.title}
      </a>
      {item.description ? (
        <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
          {item.description}
        </p>
      ) : null}
    </article>
  );
}

export default async function Home() {
  const digest = await loadDigest();

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
          GitHub：stars &gt; 100 且近期有推送，关键词含 agent / harness；X：Anthropic、OpenAI、Google、Microsoft
          与 @karpathy（需配置 Bearer Token）。
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

      <section className="mb-12">
        <h2 className="mb-4 text-xl font-semibold">GitHub</h2>
        {digest.github.length === 0 ? (
          <p className="text-[var(--muted)]">暂无条目（可运行抓取或等待定时任务）。</p>
        ) : (
          <ul className="space-y-3">
            {digest.github.map((item) => (
              <li key={item.id}>
                <ItemCard item={item} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-4 text-xl font-semibold">X</h2>
        {digest.x.length === 0 ? (
          <p className="text-[var(--muted)]">暂无条目。</p>
        ) : (
          <ul className="space-y-3">
            {digest.x.map((item) => (
              <li key={item.id}>
                <ItemCard item={item} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
