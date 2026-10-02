from contextlib import asynccontextmanager
from datetime import datetime, timezone
from pathlib import Path

from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import settings
from app.db import Base, engine, get_db
from app.models import Incident
from app.schemas import IncidentOut, ReviewUpdate


@asynccontextmanager
async def lifespan(_: FastAPI):
    Path("./data").mkdir(parents=True, exist_ok=True)
    settings.evidence_dir.mkdir(parents=True, exist_ok=True)
    Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(title="Environmental Enforcement Local API", version="0.1.0", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=[settings.frontend_origin],
                   allow_methods=["GET", "PATCH"], allow_headers=["*"])


@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.get("/api/incidents", response_model=list[IncidentOut])
def list_incidents(status: str | None = None, db: Session = Depends(get_db)):
    query = select(Incident).order_by(Incident.created_at.desc())
    if status:
        query = query.where(Incident.status == status)
    return list(db.scalars(query))


@app.get("/api/incidents/{incident_id}", response_model=IncidentOut)
def get_incident(incident_id: str, db: Session = Depends(get_db)):
    incident = db.get(Incident, incident_id)
    if incident is None:
        raise HTTPException(status_code=404, detail="Incident not found")
    return incident


@app.patch("/api/incidents/{incident_id}/review", response_model=IncidentOut)
def review_incident(incident_id: str, review: ReviewUpdate, db: Session = Depends(get_db)):
    incident = db.get(Incident, incident_id)
    if incident is None:
        raise HTTPException(status_code=404, detail="Incident not found")
    if incident.status not in {"pending_review", "approved", "dismissed"}:
        raise HTTPException(status_code=409, detail="Incident is not reviewable")
    incident.status = review.decision
    incident.review_note = review.note
    incident.reviewed_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(incident)
    return incident


@app.get("/api/evidence/{incident_id}/{asset_name}")
def get_evidence(incident_id: str, asset_name: str, db: Session = Depends(get_db)):
    incident = db.get(Incident, incident_id)
    if incident is None or asset_name not in incident.evidence.values():
        raise HTTPException(status_code=404, detail="Evidence asset not found")
    root = settings.evidence_dir.resolve()
    path = (root / incident_id / asset_name).resolve()
    if root not in path.parents or not path.is_file():
        raise HTTPException(status_code=404, detail="Evidence file not found")
    return FileResponse(path)
