from pathlib import Path

import cv2
from fastapi import UploadFile

from app.config import settings


class LocalFileStorage:
    """Local adapter for upload, evidence, and annotated-video files."""

    def __init__(self):
        self.upload_root = settings.upload_dir.resolve()
        self.evidence_root = settings.evidence_dir.resolve()
        self.output_root = settings.output_dir.resolve()

    async def save_video_upload(self, upload: UploadFile, job_id: str) -> tuple[Path, int]:
        self.upload_root.mkdir(parents=True, exist_ok=True)
        destination = self.upload_root / f"{job_id}.mp4"
        temporary = destination.with_suffix(".mp4.part")
        total = 0
        try:
            with temporary.open("wb") as stream:
                while chunk := await upload.read(1024 * 1024):
                    total += len(chunk)
                    if total > settings.max_upload_bytes:
                        limit_mb = settings.max_upload_bytes // (1024 * 1024)
                        raise ValueError(f"Video exceeds the {limit_mb} MB upload limit")
                    stream.write(chunk)
            if total == 0:
                raise ValueError("The uploaded video is empty")
            temporary.replace(destination)
            return destination, total
        except Exception:
            temporary.unlink(missing_ok=True)
            destination.unlink(missing_ok=True)
            raise

    @staticmethod
    def is_readable_video(path: Path) -> bool:
        capture = cv2.VideoCapture(str(path))
        try:
            if not capture.isOpened():
                return False
            ok, frame = capture.read()
            return bool(ok and frame is not None and frame.size > 0)
        finally:
            capture.release()

    def evidence_file(self, incident_id: str, asset_name: str) -> Path | None:
        root = self.evidence_root
        candidate = (root / incident_id / asset_name).resolve()
        return candidate if root in candidate.parents and candidate.is_file() else None

    def annotated_output(self, raw_path: str | None) -> Path | None:
        if not raw_path:
            return None
        root = self.output_root
        candidate = Path(raw_path).resolve()
        return candidate if root in candidate.parents and candidate.is_file() else None


local_storage = LocalFileStorage()
