from datetime import datetime, timezone

import httpx

from app.collectors.base import CollectedItem
from app.config import settings


def _to_datetime(v: str) -> datetime:
    return datetime.fromisoformat(v.replace("Z", "+00:00")).astimezone(timezone.utc).replace(tzinfo=None)


def collect_github_items() -> list[CollectedItem]:
    headers = {"Accept": "application/vnd.github+json"}
    if settings.github_token:
        headers["Authorization"] = f"Bearer {settings.github_token}"
    items: list[CollectedItem] = []
    with httpx.Client(timeout=20.0, headers=headers) as client:
        for topic in settings.github_topics:
            resp = client.get(
                "https://api.github.com/search/repositories",
                params={"q": f"topic:{topic}", "sort": "updated", "order": "desc", "per_page": 10},
            )
            if resp.status_code != 200:
                continue
            payload = resp.json()
            for repo in payload.get("items", []):
                stars = repo.get("stargazers_count", 0)
                forks = repo.get("forks_count", 0)
                score = stars * 0.7 + forks * 0.3
                items.append(
                    CollectedItem(
                        source="github",
                        source_id=str(repo["id"]),
                        title=repo["full_name"],
                        content=repo.get("description") or "",
                        url=repo["html_url"],
                        author=repo["owner"]["login"],
                        published_at=_to_datetime(repo["updated_at"]),
                        score=score,
                        tags=[topic],
                        metrics={"stars": stars, "forks": forks},
                    )
                )
    return items
