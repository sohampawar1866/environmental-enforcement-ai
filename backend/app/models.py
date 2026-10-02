from datetime import datetime, timezone

from sqlalchemy import DateTime, Float, Integer, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class Incident(Base):
    __tablename__ = "incidents"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, index=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)
    status: Mapped[str] = mapped_column(String(24), default="pending_review", index=True)
    camera_id: Mapped[str] = mapped_column(String(100), default="CAM-01")
    zone: Mapped[str] = mapped_column(String(200), default="Unspecified zone")
    source_video: Mapped[str] = mapped_column(Text)
    actor_track_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    object_track_id: Mapped[int] = mapped_column(Integer)
    waste_class: Mapped[str] = mapped_column(String(100), default="trash")
    event_time_seconds: Mapped[float] = mapped_column(Float)
    confidence: Mapped[float] = mapped_column(Float, default=0.0)
    confidence_components: Mapped[dict] = mapped_column(JSON, default=dict)
    timeline: Mapped[list] = mapped_column(JSON, default=list)
    evidence: Mapped[dict] = mapped_column(JSON, default=dict)
    review_note: Mapped[str | None] = mapped_column(Text, nullable=True)
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
