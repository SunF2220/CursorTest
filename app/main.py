import json
from datetime import datetime, timedelta

from apscheduler.schedulers.background import BackgroundScheduler
from fastapi import Depends, FastAPI
from sqlmodel import Session, select

from app.config import settings
from app.database import get_session, init_db
from app.models import NewsItem, QuotaUsage
from app.tasks import run_collectors

app = FastAPI(title=settings.app_name)
scheduler = BackgroundScheduler()


def _periods() -> tuple[str, str]:
    day = f"daily:{datetime.utcnow().strftime('%Y-%m-%d')}"
    month = f"monthly:{datetime.utcnow().strftime('%Y-%m')}"
    return day, month


@app.on_event("startup")
def on_startup() -> None:
    init_db()
    scheduler.add_job(run_collectors, "interval", minutes=720, id="collect_news", replace_existing=True)
    scheduler.start()


@app.on_event("shutdown")
def on_shutdown() -> None:
    if scheduler.running:
        scheduler.shutdown(wait=False)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/collect/run")
def trigger_collect() -> dict[str, int]:
    return run_collectors()


@app.get("/feed")
def feed(
    source: str | None = None,
    tag: str | None = None,
    limit: int = 20,
    session: Session = Depends(get_session),
):
    stmt = select(NewsItem)
    if source:
        stmt = stmt.where(NewsItem.source == source)
    if tag:
        stmt = stmt.where(NewsItem.tags.contains(tag))
    stmt = stmt.order_by(NewsItem.published_at.desc()).limit(limit)
    rows = session.exec(stmt).all()
    return [
        {
            "id": row.id,
            "source": row.source,
            "title": row.title,
            "content": row.content,
            "url": row.url,
            "author": row.author,
            "published_at": row.published_at,
            "score": row.score,
            "tags": [x for x in row.tags.split(",") if x],
            "metrics": json.loads(row.metrics_json),
        }
        for row in rows
    ]


@app.get("/trending")
def trending(hours: int = 72, limit: int = 20, session: Session = Depends(get_session)):
    since = datetime.utcnow() - timedelta(hours=hours)
    stmt = (
        select(NewsItem)
        .where(NewsItem.published_at >= since)
        .order_by(NewsItem.score.desc(), NewsItem.published_at.desc())
        .limit(limit)
    )
    rows = session.exec(stmt).all()
    return [
        {
            "id": row.id,
            "source": row.source,
            "title": row.title,
            "url": row.url,
            "author": row.author,
            "score": row.score,
            "published_at": row.published_at,
        }
        for row in rows
    ]


@app.get("/tags")
def tags(session: Session = Depends(get_session)):
    rows = session.exec(select(NewsItem.tags)).all()
    counter: dict[str, int] = {}
    for value in rows:
        for tag in [x for x in value.split(",") if x]:
            counter[tag] = counter.get(tag, 0) + 1
    return sorted([{"tag": k, "count": v} for k, v in counter.items()], key=lambda x: x["count"], reverse=True)


@app.get("/digest/today")
def digest_today(limit: int = 10, session: Session = Depends(get_session)):
    start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    stmt = (
        select(NewsItem)
        .where(NewsItem.published_at >= start)
        .order_by(NewsItem.score.desc(), NewsItem.published_at.desc())
        .limit(limit)
    )
    rows = session.exec(stmt).all()
    return [
        {
            "title": row.title,
            "summary": row.content[:180],
            "url": row.url,
            "source": row.source,
            "published_at": row.published_at,
        }
        for row in rows
    ]


@app.get("/quota/x")
def quota_x(session: Session = Depends(get_session)):
    day, month = _periods()
    day_row = session.exec(select(QuotaUsage).where(QuotaUsage.provider == "x_read", QuotaUsage.period == day)).first()
    month_row = session.exec(
        select(QuotaUsage).where(QuotaUsage.provider == "x_read", QuotaUsage.period == month)
    ).first()
    return {
        "daily": {
            "period": day,
            "used": day_row.used_count if day_row else 0,
            "limit": settings.free_x_daily_budget,
        },
        "monthly": {
            "period": month,
            "used": month_row.used_count if month_row else 0,
            "limit": settings.free_x_monthly_read_limit,
        },
        "x_mode": "free",
    }
