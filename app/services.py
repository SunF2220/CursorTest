import json
from sqlmodel import Session, select

from app.models import NewsItem
from app.collectors.base import CollectedItem


def upsert_news_item(session: Session, item: CollectedItem) -> NewsItem:
    exists = session.exec(
        select(NewsItem).where(NewsItem.source == item["source"], NewsItem.source_id == item["source_id"])
    ).first()
    if exists:
        merged_tags = set([x for x in exists.tags.split(",") if x])
        merged_tags.update(item["tags"])
        exists.title = item["title"]
        exists.content = item["content"]
        exists.url = item["url"]
        exists.author = item["author"]
        exists.published_at = item["published_at"]
        exists.score = item["score"]
        exists.tags = ",".join(sorted(merged_tags))
        exists.metrics_json = json.dumps(item["metrics"], ensure_ascii=False)
        session.add(exists)
        session.commit()
        session.refresh(exists)
        return exists

    row = NewsItem(
        source=item["source"],
        source_id=item["source_id"],
        title=item["title"],
        content=item["content"],
        url=item["url"],
        author=item["author"],
        published_at=item["published_at"],
        score=item["score"],
        tags=",".join(item["tags"]),
        metrics_json=json.dumps(item["metrics"], ensure_ascii=False),
    )
    session.add(row)
    session.commit()
    session.refresh(row)
    return row
