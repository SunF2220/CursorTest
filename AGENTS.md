# AGENTS.md

## Cursor Cloud specific instructions

本仓库是一个 Next.js 15（App Router + 静态导出 `output: "export"`）站点 `ai-agent-digest`，名为「AI 资讯每日摘要」。它由两部分组成：

- 前端站点：`src/app/page.tsx` 在构建时读取 `public/data/digest.json` 并按来源分组展示。
- 采集脚本：`npm run digest`（`scripts/fetch-digest.ts`）根据 `config/digest.sources.yaml` 从 GitHub、RSS（Claude Code / Cursor changelog）、X 采集数据并写入 `public/data/digest.json`。

依赖安装由启动时的更新脚本（`npm ci`）完成，无需手动安装。常用命令见 `package.json` 的 `scripts`。

非显而易见的注意事项：

- 开发服务器：`npm run dev`（Turbopack，监听 `http://localhost:3000`）。这是开发模式入口，不要用 `npm run build` / `npm start` 来做日常开发验证。
- `npm run digest` 无需任何密钥即可运行，但缺少 `TWITTER_BEARER_TOKEN` 时会跳过 X 来源并在页面顶部生成一条提示（属正常现象，非错误）；缺少 `GITHUB_TOKEN` 时 GitHub 采集走未认证额度，可能受限速影响。需要完整数据时通过 Secrets 配置这两个环境变量。
- `public/data/digest.json` 是生成产物（CI 每日重建）。本地运行 `npm run digest` 会改写它；除非确有需要，不要把该文件的变更提交进无关 PR。
- 构建忽略 lint（`next.config.ts` 中 `eslint.ignoreDuringBuilds: true`），所以请单独运行 `npm run lint` 来检查代码。
- `gh-pages` 分支存放的是已构建的静态产物，源码在 `main` 分支。
