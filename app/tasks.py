from sqlmodel import Session

from app.collectors.github_collector import collect_github_items
from app.collectors.x_collector import collect_x_items
from app.database import engine
from app.services import upsert_news_item


def run_collectors() -> dict[str, int]:
    github_count = 0
    x_count = 0
    with Session(engine) as session:
        for item in collect_github_items():
            upsert_news_item(session, item)
            github_count += 1
        for item in collect_x_items(session):
            upsert_news_item(session, item)
            x_count += 1
    return {"github": github_count, "x": x_count}
