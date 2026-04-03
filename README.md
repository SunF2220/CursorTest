# AI Agent 资讯平台（Free 额度优先）

一个最小可运行的后端服务，聚合 GitHub 与 X（Twitter）资讯，并对 X 调用做免费额度守卫。

## 功能

- GitHub 抓取：基于 topic 抓取 AI Agent 相关仓库动态
- X 抓取：基于白名单账号抓取最新推文
- 免费额度守卫：按日/月限制 X 读取调用，超限自动停止抓取
- 统一资讯流 API：支持最新、热榜、标签、今日简报

## 快速开始

1. 安装依赖

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

2. 配置环境变量（可选）

```bash
export GITHUB_TOKEN="你的github token"
export X_BEARER_TOKEN="你的x bearer token"
export GITHUB_TOPICS="ai-agent,langgraph,autogen,crewai"
export X_WATCH_ACCOUNTS="OpenAI,LangChainAI,AnthropicAI,huggingface"
export FREE_X_DAILY_BUDGET="2"
export FREE_X_MONTHLY_READ_LIMIT="50"
```

3. 启动服务

```bash
uvicorn app.main:app --reload
```

## 核心接口

- `GET /health` 健康检查
- `POST /collect/run` 手动触发采集
- `GET /feed?source=github&tag=langgraph&limit=20` 资讯流
- `GET /trending?hours=72&limit=20` 热榜
- `GET /tags` 标签统计
- `GET /digest/today?limit=10` 今日简报
- `GET /quota/x` X 配额状态

## Free 模式建议

- X 数据源仅做白名单账号、低频抓取
- 默认定时任务每 12 小时运行一次
- 平台主内容建议由 GitHub 提供，X 作为补充信号
