from datetime import datetime, timezone
import uuid

import cv2
import numpy as np
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.db import Base, get_db
from app.main import app
from app.models import Incident
from app.services.storage import local_storage


def test_incident_review_is_persisted(tmp_path):
    test_engine = create_engine(f"sqlite:///{tmp_path / 'test.db'}")
    Base.metadata.create_all(test_engine)
    test_sessions = sessionmaker(bind=test_engine, expire_on_commit=False)

    def override_get_db():
        with test_sessions() as db:
            yield db

    app.dependency_overrides[get_db] = override_get_db
    incident_id = str(uuid.uuid4())
    with test_sessions() as db:
        db.add(Incident(id=incident_id, created_at=datetime.now(timezone.utc), status="pending_review",
                        source_video="clip.mp4", object_track_id=12, event_time_seconds=2.5,
                        confidence=0.3, confidence_components={}, timeline=[], evidence={}))
        db.commit()
    try:
        with TestClient(app) as client:
            assert client.get("/api/health").json() == {"status": "ok"}
            assert client.get("/api/incidents").json()[0]["id"] == incident_id
            response = client.patch(f"/api/incidents/{incident_id}/review",
                                    json={"decision": "dismissed", "note": "Existing litter"})
            assert response.status_code == 200
            assert response.json()["status"] == "dismissed"
            assert client.get(f"/api/incidents/{incident_id}").json()["review_note"] == "Existing litter"
    finally:
        app.dependency_overrides.clear()
        test_engine.dispose()


def make_mp4(tmp_path):
    path = tmp_path / "clip.mp4"
    writer = cv2.VideoWriter(str(path), cv2.VideoWriter_fourcc(*"mp4v"), 5, (32, 24))
    for _ in range(3):
        writer.write(np.zeros((24, 32, 3), dtype=np.uint8))
    writer.release()
    return path.read_bytes()


def test_video_job_upload_validation_and_persistence(tmp_path, monkeypatch):
    test_engine = create_engine(f"sqlite:///{tmp_path / 'jobs.db'}")
    Base.metadata.create_all(test_engine)
    test_sessions = sessionmaker(bind=test_engine, expire_on_commit=False)

    def override_get_db():
        with test_sessions() as db:
            yield db

    monkeypatch.setattr(local_storage, "upload_root", tmp_path / "uploads")
    from app import main as main_module
    enqueue_calls = []
    monkeypatch.setattr(main_module.video_job_runner, "enqueue", enqueue_calls.append)
    app.dependency_overrides[get_db] = override_get_db
    try:
        with TestClient(app) as client:
            good = make_mp4(tmp_path)
            response = client.post("/api/video-jobs", data={"camera_id": "CAM-9", "zone": "North beach"},
                                   files={"file": ("staged.mp4", good, "video/mp4")})
            assert response.status_code == 202, response.text
            job = response.json()
            assert job["status"] == "queued"
            assert job["progress"] == 0
            assert job["camera_id"] == "CAM-9"
            assert enqueue_calls == [job["id"]]
            assert (tmp_path / "uploads" / f"{job['id']}.mp4").is_file()
            assert client.get(f"/api/video-jobs/{job['id']}").json()["id"] == job["id"]

            unsupported = client.post("/api/video-jobs", files={"file": ("clip.mov", good, "video/quicktime")})
            assert unsupported.status_code == 415
            monkeypatch.setattr(main_module.settings, "max_upload_bytes", 100)
            oversized = client.post("/api/video-jobs", files={"file": ("large.mp4", good, "video/mp4")})
            assert oversized.status_code == 413
            monkeypatch.setattr(main_module.settings, "max_upload_bytes", 500 * 1024 * 1024)
            corrupt = client.post("/api/video-jobs", files={"file": ("broken.mp4", b"not a video", "video/mp4")})
            assert corrupt.status_code == 422
            assert client.get("/api/video-jobs/missing").status_code == 404
    finally:
        app.dependency_overrides.clear()
        test_engine.dispose()


def test_job_runner_persists_progress_results_and_restart_failures(tmp_path, monkeypatch):
    from app.services import job_runner as runner_module
    from app.models import VideoJob

    test_engine = create_engine(f"sqlite:///{tmp_path / 'runner.db'}")
    Base.metadata.create_all(test_engine)
    test_sessions = sessionmaker(bind=test_engine, expire_on_commit=False)
    monkeypatch.setattr(runner_module, "SessionLocal", test_sessions)
    job_id = str(uuid.uuid4())
    with test_sessions() as db:
        db.add(VideoJob(id=job_id, status="queued", progress=0, input_path="clip.mp4",
                        original_filename="clip.mp4", camera_id="CAM-1", zone="Test"))
        db.commit()

    def fake_run_video(**kwargs):
        kwargs["progress_callback"](47)
        return {"frames": 120, "events_created": 1, "incident_ids": ["incident-1"]}

    monkeypatch.setattr(runner_module, "run_video", fake_run_video)
    runner = runner_module.VideoJobRunner()
    try:
        runner._process(job_id)
        with test_sessions() as db:
            completed = db.get(VideoJob, job_id)
            assert completed.status == "completed"
            assert completed.progress == 100
            assert completed.result["incident_ids"] == ["incident-1"]

            queued_id, running_id = str(uuid.uuid4()), str(uuid.uuid4())
            db.add_all([
                VideoJob(id=queued_id, status="queued", progress=0, input_path="a.mp4", original_filename="a.mp4"),
                VideoJob(id=running_id, status="running", progress=32, input_path="b.mp4", original_filename="b.mp4"),
            ])
            db.commit()
        runner.recover_interrupted()
        with test_sessions() as db:
            for interrupted_id in (queued_id, running_id):
                interrupted = db.get(VideoJob, interrupted_id)
                assert interrupted.status == "failed"
                assert "interrupted" in interrupted.error.lower()
    finally:
        runner.executor.shutdown(wait=True)
        test_engine.dispose()
