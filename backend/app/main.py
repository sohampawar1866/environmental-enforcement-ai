from contextlib import asynccontextmanager
from datetime import datetime, timezone
from pathlib import Path
import uuid

from fastapi import Depends, FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from sqlalchemy import inspect, select, text
from sqlalchemy.orm import Session

from app.config import settings
from app.db import Base, engine, get_db
from app.models import Incident, VideoJob
from app.schemas import IncidentOut, ReviewUpdate, VideoJobOut
from app.services.job_runner import video_job_runner
from app.services.storage import local_storage


@asynccontextmanager
async def lifespan(_: FastAPI):
    Path("./data").mkdir(parents=True, exist_ok=True)
    settings.evidence_dir.mkdir(parents=True, exist_ok=True)
    settings.upload_dir.mkdir(parents=True, exist_ok=True)
    settings.output_dir.mkdir(parents=True, exist_ok=True)
    Base.metadata.create_all(bind=engine)
    if engine.dialect.name == "sqlite" and "job_id" not in {
        column["name"] for column in inspect(engine).get_columns("incidents")
    }:
        with engine.begin() as connection:
            connection.execute(text("ALTER TABLE incidents ADD COLUMN job_id VARCHAR(36)"))
            connection.execute(text("CREATE INDEX IF NOT EXISTS ix_incidents_job_id ON incidents (job_id)"))
    video_job_runner.recover_interrupted()
    yield


app = FastAPI(title="Environmental Enforcement Local API", version="0.1.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.get("/api/incidents", response_model=list[IncidentOut])
def list_incidents(status: str | None = None, db: Session = Depends(get_db)):
    query = select(Incident).order_by(Incident.created_at.desc())
    if status:
        query = query.where(Incident.status == status)
    return list(db.scalars(query))


@app.post("/api/video-jobs", response_model=VideoJobOut, status_code=202)
async def create_video_job(
    file: UploadFile = File(...),
    camera_id: str = Form(default="CAM-01", max_length=100),
    zone: str = Form(default="Unspecified zone", max_length=200),
    db: Session = Depends(get_db),
):
    filename = Path(file.filename or "video.mp4").name
    if Path(filename).suffix.lower() != ".mp4":
        raise HTTPException(status_code=415, detail="Only .mp4 video files are supported")
    if file.size is not None and file.size > settings.max_upload_bytes:
        limit_mb = settings.max_upload_bytes // (1024 * 1024)
        raise HTTPException(status_code=413, detail=f"Video exceeds the {limit_mb} MB upload limit")

    job_id = str(uuid.uuid4())
    try:
        input_path, _size = await local_storage.save_video_upload(file, job_id)
    except ValueError as exc:
        raise HTTPException(status_code=413, detail=str(exc)) from exc
    except OSError as exc:
        raise HTTPException(status_code=500, detail=f"Could not store the uploaded video: {exc}") from exc
    finally:
        await file.close()
    if not local_storage.is_readable_video(input_path):
        input_path.unlink(missing_ok=True)
        raise HTTPException(status_code=422, detail="The uploaded MP4 could not be decoded")

    job = VideoJob(id=job_id, status="queued", progress=0, input_path=str(input_path),
                   original_filename=filename[:255], camera_id=camera_id.strip() or "CAM-01",
                   zone=zone.strip() or "Unspecified zone")
    db.add(job)
    db.commit()
    db.refresh(job)
    video_job_runner.enqueue(job_id)
    return job


@app.get("/api/video-jobs/{job_id}", response_model=VideoJobOut)
def get_video_job(job_id: str, db: Session = Depends(get_db)):
    job = db.get(VideoJob, job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="Video job not found")
    return job


@app.get("/api/video-jobs/{job_id}/output")
def get_video_job_output(job_id: str, db: Session = Depends(get_db)):
    job = db.get(VideoJob, job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="Video job not found")
    output_path = local_storage.annotated_output((job.result or {}).get("annotated_video"))
    if output_path is None:
        raise HTTPException(status_code=404, detail="Annotated output is not available")
    return FileResponse(output_path, media_type="video/mp4", filename=output_path.name)


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
    path = local_storage.evidence_file(incident_id, asset_name)
    if path is None:
        raise HTTPException(status_code=404, detail="Evidence file not found")
    return FileResponse(path)
