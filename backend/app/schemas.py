from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class IncidentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    created_at: datetime
    status: str
    camera_id: str
    zone: str
    source_video: str
    job_id: str | None
    actor_track_id: int | None
    object_track_id: int
    waste_class: str
    event_time_seconds: float
    confidence: float
    confidence_components: dict
    timeline: list
    evidence: dict
    review_note: str | None
    reviewed_at: datetime | None


class VideoJobOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    created_at: datetime
    updated_at: datetime
    status: str
    progress: int
    original_filename: str
    camera_id: str
    zone: str
    result: dict | None
    error: str | None


class ReviewUpdate(BaseModel):
    decision: Literal["approved", "dismissed"]
    note: str | None = Field(default=None, max_length=4000)
