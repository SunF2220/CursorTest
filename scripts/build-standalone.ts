import { readFile, mkdir, writeFile } from "fs/promises";
import path from "path";
import type { DigestItem, DigestPayload } from "../src/types/digest";

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
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

function renderItem(item: DigestItem): string {
  const meta: string[] = [];
  if (item.author) meta.push(`<span>${escapeHtml(item.author)}</span>`);
  if (item.publishedAt) {
    meta.push(
      `<time datetime="${escapeHtml(item.publishedAt)}">${escapeHtml(item.publishedAt.slice(0, 10))}</time>`,
    );
  }
  if (item.stars != null) {
    meta.push(`<span>★ ${item.stars.toLocaleString()}</span>`);
  }
  if (item.language) meta.push(`<span>${escapeHtml(item.language)}</span>`);
  if (item.tags.length > 0) {
    meta.push(
      `<span class="tags">${escapeHtml(item.tags.join(" · "))}</span>`,
    );
  }

  const description =
    item.description && item.sourceType !== "x"
      ? `<p class="desc">${escapeHtml(item.description)}</p>`
      : "";

  return `<article class="card">
    <div class="meta">
      <span class="badge">${escapeHtml(item.sourceLabel ?? item.sourceType)}</span>
      ${meta.join("")}
    </div>
    <a class="title" href="${escapeHtml(item.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(item.title)}</a>
    ${description}
  </article>`;
}

function renderPage(digest: DigestPayload): string {
  const groups = groupBySource(digest.items);
  const generatedAt = new Date(digest.generatedAt).toLocaleString("zh-CN", {
    timeZone: "Asia/Shanghai",
  });

  const notes =
    digest.notes.length > 0
      ? `<aside class="notes">
      <p class="notes-title">提示</p>
      <ul>${digest.notes.map((n) => `<li>${escapeHtml(n)}</li>`).join("")}</ul>
    </aside>`
      : "";

  const sections =
    groups.length === 0
      ? `<p class="empty">暂无条目</p>`
      : groups
          .map(
            (g) => `<section class="section">
        <h2>${escapeHtml(g.label)} <span class="count">${g.items.length} 条</span></h2>
        ${g.items.map(renderItem).join("")}
      </section>`,
          )
          .join("");

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>AI 资讯每日摘要</title>
  <meta name="description" content="AI Agent、Claude Code、Codex、Cursor、skills 相关资讯每日摘要"/>
  <style>
    :root {
      --bg: #0a0a0b;
      --surface: #141416;
      --border: #2a2a2e;
      --text: #ececf1;
      --muted: #8e8e98;
      --accent: #10a37f;
      --accent-dim: #0d8f6e;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      background: var(--bg);
      color: var(--text);
      line-height: 1.5;
    }
    main { max-width: 48rem; margin: 0 auto; padding: 3rem 1rem; }
    header { border-bottom: 1px solid var(--border); padding-bottom: 2rem; margin-bottom: 2.5rem; }
    h1 { margin: 0; font-size: 1.875rem; font-weight: 600; }
    .sub { margin-top: .5rem; color: var(--muted); }
    .hint { margin-top: 1rem; font-size: .875rem; color: var(--muted); }
    .mirror a { color: var(--accent); }
    code { background: var(--surface); padding: .125rem .375rem; border-radius: .25rem; font-size: .75rem; }
    .notes {
      margin-bottom: 2rem;
      padding: 1rem;
      border-radius: .5rem;
      border: 1px solid rgba(180, 83, 9, .5);
      background: rgba(120, 53, 15, .3);
      color: #fef3c7;
      font-size: .875rem;
    }
    .notes-title { font-weight: 600; color: #fde68a; margin: 0 0 .5rem; }
    .notes ul { margin: 0; padding-left: 1.25rem; }
    .section { margin-bottom: 3rem; }
    h2 { font-size: 1.25rem; margin: 0 0 1rem; }
    .count { font-size: .875rem; font-weight: 400; color: var(--muted); }
    .card {
      border: 1px solid var(--border);
      background: var(--surface);
      border-radius: .75rem;
      padding: 1rem;
      margin-bottom: .75rem;
      transition: border-color .15s;
    }
    .card:hover { border-color: var(--accent-dim); }
    .meta { display: flex; flex-wrap: wrap; gap: .5rem; align-items: center; font-size: .75rem; color: var(--muted); margin-bottom: .5rem; }
    .badge { background: var(--border); padding: .125rem .5rem; border-radius: .25rem; text-transform: uppercase; letter-spacing: .05em; }
    .tags { color: var(--accent-dim); }
    .title { color: var(--text); text-decoration: none; font-size: 1.125rem; font-weight: 500; }
    .title:hover { color: var(--accent); }
    .desc { margin: .5rem 0 0; font-size: .875rem; color: var(--muted); }
    .empty { color: var(--muted); }
  </style>
</head>
<body>
  <main>
    <header>
      <h1>AI 资讯每日摘要</h1>
      <p class="sub">日期 ${escapeHtml(digest.date)} · 共 ${digest.items.length} 条 · 生成于 ${escapeHtml(generatedAt)} (北京时间)</p>
      <p class="hint">来源：GitHub（stars &gt; 1000）、Claude Code Changelog、Cursor Changelog、X 官方账号。配置见 <code>config/digest.sources.yaml</code>。</p>
      <p class="hint mirror">镜像访问：<a href="https://cdn.jsdelivr.net/gh/SunF2220/CursorTest@gh-pages/index.html" target="_blank" rel="noopener noreferrer">cdn.jsdelivr.net 在线预览</a> · 正式地址：<a href="https://sunf2220.github.io/CursorTest/" target="_blank" rel="noopener noreferrer">GitHub Pages</a>（需在仓库 Settings → Pages 启用）</p>
    </header>
    ${notes}
    ${sections}
  </main>
</body>
</html>`;
}

async function main() {
  const digestPath = path.join(process.cwd(), "public", "data", "digest.json");
  const raw = await readFile(digestPath, "utf-8");
  const digest = JSON.parse(raw) as DigestPayload;
  const html = renderPage(digest);

  const outDir = path.join(process.cwd(), "out");
  await mkdir(outDir, { recursive: true });
  await writeFile(path.join(outDir, "index.html"), html, "utf-8");
  await writeFile(path.join(outDir, ".nojekyll"), "", "utf-8");
  await mkdir(path.join(outDir, "data"), { recursive: true });
  await writeFile(path.join(outDir, "data", "digest.json"), raw, "utf-8");

  console.log(`Built standalone site at out/index.html (${digest.items.length} items)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
