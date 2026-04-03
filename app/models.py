from datetime import datetime
from typing import Optional

from sqlmodel import Field, SQLModel


class NewsItem(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    source: str = Field(index=True)
    source_id: str = Field(index=True)
    title: str
    content: str
    url: str
    author: str
    published_at: datetime = Field(index=True)
    score: float = Field(default=0.0, index=True)
    tags: str = ""
    metrics_json: str = "{}"
    created_at: datetime = Field(default_factory=datetime.utcnow, index=True)


class QuotaUsage(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    provider: str = Field(index=True)
    period: str = Field(index=True)
    used_count: int = 0
    budget_limit: int = 0
    updated_at: datetime = Field(default_factory=datetime.utcnow)
