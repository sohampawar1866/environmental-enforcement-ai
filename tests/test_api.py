from datetime import datetime, timezone
import uuid

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.db import Base, get_db
from app.main import app
from app.models import Incident


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
