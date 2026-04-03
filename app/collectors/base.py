from datetime import datetime
from typing import TypedDict


class CollectedItem(TypedDict):
    source: str
    source_id: str
    title: str
    content: str
    url: str
    author: str
    published_at: datetime
    score: float
    tags: list[str]
    metrics: dict
