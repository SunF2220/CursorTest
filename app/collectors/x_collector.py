from datetime import datetime, timezone

import httpx
from sqlmodel import Session

from app.collectors.base import CollectedItem
from app.config import settings
from app.quota import can_consume, consume


def _to_datetime(v: str) -> datetime:
    return datetime.fromisoformat(v.replace("Z", "+00:00")).astimezone(timezone.utc).replace(tzinfo=None)


def _daily_period() -> str:
    return f"daily:{datetime.utcnow().strftime('%Y-%m-%d')}"


def _monthly_period() -> str:
    return f"monthly:{datetime.utcnow().strftime('%Y-%m')}"


def _can_call_x(session: Session) -> bool:
    day = _daily_period()
    month = _monthly_period()
    daily_ok = can_consume(session, "x_read", day, settings.free_x_daily_budget, amount=1)
    monthly_ok = can_consume(
        session,
        "x_read",
        month,
        settings.free_x_monthly_read_limit,
        amount=1,
    )
    return daily_ok and monthly_ok


def _consume_x(session: Session) -> None:
    day = _daily_period()
    month = _monthly_period()
    consume(session, "x_read", day, settings.free_x_daily_budget, amount=1)
    consume(session, "x_read", month, settings.free_x_monthly_read_limit, amount=1)


def collect_x_items(session: Session) -> list[CollectedItem]:
    if not settings.x_bearer_token or not settings.x_watch_accounts:
        return []

    headers = {"Authorization": f"Bearer {settings.x_bearer_token}"}
    items: list[CollectedItem] = []
    with httpx.Client(timeout=20.0, headers=headers) as client:
        for username in settings.x_watch_accounts:
            if not _can_call_x(session):
                break

            user_resp = client.get(
                "https://api.x.com/2/users/by",
                params={"usernames": username, "user.fields": "public_metrics"},
            )
            _consume_x(session)
            if user_resp.status_code != 200:
                continue
            users = user_resp.json().get("data", [])
            if not users:
                continue
            user = users[0]
            user_id = user["id"]
            followers = user.get("public_metrics", {}).get("followers_count", 0)

            if not _can_call_x(session):
                break

            tweets_resp = client.get(
                f"https://api.x.com/2/users/{user_id}/tweets",
                params={
                    "max_results": 5,
                    "tweet.fields": "public_metrics,created_at",
                    "exclude": "replies",
                },
            )
            _consume_x(session)
            if tweets_resp.status_code != 200:
                continue

            for tw in tweets_resp.json().get("data", []):
                metrics = tw.get("public_metrics", {})
                score = (
                    metrics.get("like_count", 0) * 0.5
                    + metrics.get("retweet_count", 0) * 0.3
                    + followers * 0.0005
                )
                items.append(
                    CollectedItem(
                        source="x",
                        source_id=tw["id"],
                        title=f"@{username} 发布新动态",
                        content=tw.get("text", ""),
                        url=f"https://x.com/{username}/status/{tw['id']}",
                        author=username,
                        published_at=_to_datetime(tw["created_at"]),
                        score=score,
                        tags=["x", "watchlist"],
                        metrics=metrics,
                    )
                )
    return items
