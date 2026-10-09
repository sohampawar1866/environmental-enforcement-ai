from collections import deque
from collections.abc import Callable
import hashlib
from pathlib import Path
import shutil
import subprocess
import time
import uuid

import cv2
from sqlalchemy.orm import Session
from ultralytics import YOLO

from app.config import settings
from app.models import Incident
from app.vision.events import EventTracker, StartupCalibration


EXPECTED_MODEL_SHA256 = "03f3b009da8d8f2570f95dbd0cca2496a0f0fb2ff2c6d2f4efa549999b5ffc2f"
EXPECTED_MODEL_SIZE = 40_498_732


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def verify_model(path: Path) -> None:
    if not path.is_file():
        raise FileNotFoundError(f"Model checkpoint not found: {path}. Run scripts/download_model.py")
    if path.stat().st_size != EXPECTED_MODEL_SIZE or sha256_file(path) != EXPECTED_MODEL_SHA256:
        raise ValueError("Checkpoint size or SHA-256 does not match the audited Baraa v1.0.0 asset")


def run_video(video: Path, model_path: Path, db: Session, camera_id="CAM-01",
              zone="Unspecified zone", output_dir: Path = Path("./outputs"),
              job_id: str | None = None,
              progress_callback: Callable[[int], None] | None = None) -> dict:
    if not video.is_file():
        raise FileNotFoundError(f"Input video not found: {video}")
    verify_model(model_path)
    output_dir.mkdir(parents=True, exist_ok=True)
    run_id = uuid.uuid4().hex[:12]
    annotated_path = output_dir / f"{video.stem}-{run_id}-annotated.mp4"

    model = YOLO(str(model_path))
    names = model.names
    person_ids = {int(k) for k, v in names.items() if str(v).lower() == "person"}
    trash_ids = {int(k) for k, v in names.items() if str(v).lower() in {"trash", "waste", "litter"}}
    if not person_ids or not trash_ids:
        raise ValueError(f"Checkpoint must contain person and trash classes; found {names}")

    cap = cv2.VideoCapture(str(video))
    if not cap.isOpened():
        raise ValueError(f"Could not open video file: {video}")
    fps = cap.get(cv2.CAP_PROP_FPS) or 25.0
    total_frames = max(0, int(cap.get(cv2.CAP_PROP_FRAME_COUNT)))
    width, height = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH)), int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    if width <= 0 or height <= 0:
        cap.release()
        raise ValueError("Video has invalid frame dimensions")
    writer = cv2.VideoWriter(str(annotated_path), cv2.VideoWriter_fourcc(*"mp4v"), fps, (width, height))
    if not writer.isOpened():
        cap.release()
        raise OSError(f"Could not create annotated output: {annotated_path}")

    event_tracker = EventTracker(stationary_frames=max(3, round(fps * 0.2)))
    history = deque(maxlen=max(1, round(fps * 6)))
    captured: dict[int, dict] = {}
    calibration = StartupCalibration(max(1, round(fps * 2)))
    frame_index, detections_count, track_ids = 0, 0, set()
    start = time.perf_counter()
    try:
        while True:
            ok, frame = cap.read()
            if not ok:
                break
            timestamp = frame_index / fps
            result = model.track(frame, persist=True, tracker="bytetrack.yaml", verbose=False)[0]
            people, trash = [], []
            if result.boxes is not None:
                for box in result.boxes:
                    cls_id = int(box.cls.item())
                    if cls_id not in person_ids | trash_ids:
                        continue
                    coords = tuple(float(v) for v in box.xyxy[0].tolist())
                    track_id = int(box.id.item()) if box.id is not None else None
                    conf = float(box.conf.item())
                    if track_id is not None:
                        track_ids.add(track_id)
                    w = coords[2] - coords[0]
                    h = coords[3] - coords[1]
                    # Morphology filter: ground-level small objects cannot be standing pedestrians in CCTV
                    if cls_id in person_ids and (h < 130 or (w * h < 18000 and h < 180)):
                        cls_id = next(iter(trash_ids))
                    record = {"track_id": track_id, "box": coords, "confidence": conf}
                    (people if cls_id in person_ids else trash).append(record)
                    detections_count += 1
            eligible_trash = calibration.eligible(frame_index, trash)
            for event in event_tracker.update(frame_index, timestamp, eligible_trash, people):
                sep_f = event_tracker.tracks[event["object_track_id"]].separation_frame or frame_index
                target_before = max(0, sep_f - round(fps * 2.5))
                target_drop = max(0, sep_f - round(fps * 0.5))
                before_f = next((f for idx, f in reversed(history) if idx <= target_before), None)
                drop_f = next((f for idx, f in reversed(history) if idx <= target_drop), None)
                event["before_frame"] = before_f.copy() if before_f is not None else frame.copy()
                event["drop_frame"] = drop_f.copy() if drop_f is not None else frame.copy()
                event["created_frame"] = frame_index
                captured[len(captured)] = event

            annotated = result.plot()
            cv2.putText(annotated, "SIMULATED CCTV | REVIEW REQUIRED", (18, 32),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.7, (30, 220, 255), 2)
            writer.write(annotated)
            history.append((frame_index, frame.copy()))
            for event_index, event in captured.items():
                if event.get("after_frame") is None and (frame_index >= event["created_frame"] + round(fps * 1.5) or frame_index >= total_frames - 2):
                    event["after_frame"] = frame.copy()
            if progress_callback and (frame_index % max(1, total_frames // 100 or 1) == 0):
                progress_callback(min(99, int((frame_index + 1) / total_frames * 100))
                                  if total_frames else 0)
            frame_index += 1
    finally:
        cap.release()
        writer.release()
    if frame_index == 0:
        annotated_path.unlink(missing_ok=True)
        raise ValueError("Video contains no readable frames")
    if not annotated_path.is_file() or annotated_path.stat().st_size == 0:
        raise OSError("Video processing did not produce an annotated output")

    # Transcode to web-standard H.264 (avc1) for smooth HTML5 video player playback
    if shutil.which("ffmpeg"):
        h264_tmp = annotated_path.with_name(f"{annotated_path.stem}_web.mp4")
        try:
            subprocess.run(
                [
                    "ffmpeg", "-y", "-i", str(annotated_path),
                    "-c:v", "libx264", "-pix_fmt", "yuv420p", "-movflags", "+faststart",
                    str(h264_tmp)
                ],
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
                check=True,
            )
            if h264_tmp.is_file() and h264_tmp.stat().st_size > 0:
                h264_tmp.replace(annotated_path)
        except Exception:
            h264_tmp.unlink(missing_ok=True)

    captured = {key: event for key, event in captured.items()
                if not event_tracker.tracks[event["object_track_id"]].cancelled}
    for event in captured.values():
        if event.get("after_frame") is None and history:
            event["after_frame"] = history[-1][1].copy()
    created = []
    for event in captured.values():
        incident_id = str(uuid.uuid4())
        incident_dir = settings.evidence_dir / incident_id
        incident_dir.mkdir(parents=True, exist_ok=True)
        assets = {}
        for key, label in (("before_frame", "before.jpg"), ("drop_frame", "separation.jpg"),
                           ("after_frame", "after.jpg")):
            image = event.get(key)
            if image is not None:
                target = incident_dir / label
                if cv2.imwrite(str(target), image):
                    assets[key.removesuffix("_frame")] = label
                    if key == "drop_frame":
                        assets["separation"] = label
        clip_name = "annotated.mp4"
        shutil.copy2(annotated_path, incident_dir / clip_name)
        assets["annotated_video"] = clip_name
        confidence = 0.0 if event["actor_track_id"] is None else min(
            0.5, event["object_confidence"] * 0.5)
        record = Incident(
            id=incident_id, status="pending_review", camera_id=camera_id, zone=zone,
            source_video=str(video.resolve()), job_id=job_id, actor_track_id=event["actor_track_id"],
            object_track_id=event["object_track_id"], waste_class="trash",
            event_time_seconds=event["event_time_seconds"], confidence=confidence,
            confidence_components={"object_detection": event["object_confidence"],
                                   "person_association": event["association"],
                                   "event_logic": "stationarity_after_separation"},
            timeline=event["timeline"], evidence=assets,
        )
        db.add(record)
        created.append(incident_id)
    db.commit()
    duration = time.perf_counter() - start
    return {"video": str(video), "annotated_video": str(annotated_path), "frames": frame_index,
            "detections": detections_count, "unique_track_ids": len(track_ids),
            "preexisting_trash_tracks": len(calibration.preexisting_track_ids),
            "events_created": len(created), "incident_ids": created,
            "elapsed_seconds": round(duration, 3), "fps_processed": round(frame_index / duration, 2)}
