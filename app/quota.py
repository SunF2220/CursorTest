from datetime import datetime

from sqlmodel import Session, select

from app.models import QuotaUsage


def _upsert_quota(session: Session, provider: str, period: str, budget_limit: int) -> QuotaUsage:
    row = session.exec(
        select(QuotaUsage).where(QuotaUsage.provider == provider, QuotaUsage.period == period)
    ).first()
    if row:
        row.budget_limit = budget_limit
        row.updated_at = datetime.utcnow()
        session.add(row)
        session.commit()
        session.refresh(row)
        return row
    row = QuotaUsage(provider=provider, period=period, used_count=0, budget_limit=budget_limit)
    session.add(row)
    session.commit()
    session.refresh(row)
    return row


def can_consume(session: Session, provider: str, period: str, budget_limit: int, amount: int = 1) -> bool:
    row = _upsert_quota(session, provider, period, budget_limit)
    return row.used_count + amount <= row.budget_limit


def consume(session: Session, provider: str, period: str, budget_limit: int, amount: int = 1) -> QuotaUsage:
    row = _upsert_quota(session, provider, period, budget_limit)
    row.used_count += amount
    row.updated_at = datetime.utcnow()
    session.add(row)
    session.commit()
    session.refresh(row)
    return row
