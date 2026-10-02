from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from pathlib import Path

from sqlalchemy import select, update

from app.config import settings
from app.db import SessionLocal
from app.models import VideoJob
from app.vision.pipeline import run_video


def utcnow():
    return datetime.now(timezone.utc)


class VideoJobRunner:
    """Single-process, single-worker runner; replace this adapter with a cloud queue later."""

    def __init__(self):
        self.executor = ThreadPoolExecutor(max_workers=1, thread_name_prefix="video-analysis")

    def recover_interrupted(self):
        with SessionLocal() as db:
            db.execute(update(VideoJob).where(VideoJob.status.in_(["queued", "running"])).values(
                status="failed", error="Processing was interrupted when the local server stopped.",
                updated_at=utcnow()))
            db.commit()

    def enqueue(self, job_id: str):
        return self.executor.submit(self._process, job_id)

    def _set_progress(self, job_id: str, progress: int):
        with SessionLocal() as db:
            job = db.get(VideoJob, job_id)
            if job and job.status == "running":
                job.progress = max(job.progress, min(progress, 99))
                job.updated_at = utcnow()
                db.commit()

    def _process(self, job_id: str):
        with SessionLocal() as db:
            job = db.get(VideoJob, job_id)
            if job is None or job.status != "queued":
                return
            job.status, job.progress, job.updated_at = "running", 0, utcnow()
            db.commit()
            video_path = Path(job.input_path)
            camera_id, zone = job.camera_id, job.zone

        try:
            with SessionLocal() as db:
                summary = run_video(
                    video=video_path,
                    model_path=settings.model_path,
                    db=db,
                    camera_id=camera_id,
                    zone=zone,
                    output_dir=settings.output_dir,
                    job_id=job_id,
                    progress_callback=lambda value: self._set_progress(job_id, value),
                )
            with SessionLocal() as db:
                job = db.get(VideoJob, job_id)
                if job:
                    job.status, job.progress = "completed", 100
                    job.result, job.error, job.updated_at = summary, None, utcnow()
                    db.commit()
        except Exception as exc:
            with SessionLocal() as db:
                job = db.get(VideoJob, job_id)
                if job:
                    job.status = "failed"
                    job.error = str(exc)[:4000]
                    job.updated_at = utcnow()
                    db.commit()


video_job_runner = VideoJobRunner()
