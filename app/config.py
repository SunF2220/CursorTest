import os
from pydantic import BaseModel


class Settings(BaseModel):
    app_name: str = "AI Agent News Platform"
    database_url: str = os.getenv("DATABASE_URL", "sqlite:///./app.db")
    github_token: str | None = os.getenv("GITHUB_TOKEN")
    x_bearer_token: str | None = os.getenv("X_BEARER_TOKEN")
    github_topics: list[str] = []
    x_watch_accounts: list[str] = []
    free_x_monthly_read_limit: int = int(os.getenv("FREE_X_MONTHLY_READ_LIMIT", "50"))
    free_x_daily_budget: int = int(os.getenv("FREE_X_DAILY_BUDGET", "2"))


def _env_list(name: str, default: list[str]) -> list[str]:
    value = os.getenv(name)
    if not value:
        return default
    return [x.strip() for x in value.split(",") if x.strip()]


settings = Settings(
    github_topics=_env_list(
        "GITHUB_TOPICS",
        ["ai-agent", "agents", "autonomous-agents", "langgraph", "autogen", "crewai"],
    ),
    x_watch_accounts=_env_list(
        "X_WATCH_ACCOUNTS",
        ["OpenAI", "LangChainAI", "AnthropicAI", "huggingface"],
    ),
)
