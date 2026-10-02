import argparse
import json
from pathlib import Path

from app.config import settings
from app.db import Base, SessionLocal, engine
from app.vision.pipeline import run_video


def main():
    parser = argparse.ArgumentParser(description="Run local person/trash tracking on a video file")
    parser.add_argument("video", type=Path)
    parser.add_argument("--model", type=Path, default=settings.model_path)
    parser.add_argument("--camera-id", default="CAM-01")
    parser.add_argument("--zone", default="Unspecified zone")
    parser.add_argument("--output-dir", type=Path, default=Path("./outputs"))
    args = parser.parse_args()
    Path("./data").mkdir(parents=True, exist_ok=True)
    settings.evidence_dir.mkdir(parents=True, exist_ok=True)
    Base.metadata.create_all(bind=engine)
    with SessionLocal() as db:
        summary = run_video(args.video, args.model, db, args.camera_id, args.zone, args.output_dir)
    print(json.dumps(summary, indent=2))


if __name__ == "__main__":
    main()
