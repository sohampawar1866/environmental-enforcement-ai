import logging
from pathlib import Path
from typing import Any

import cv2
from fastapi import UploadFile

from app.config import settings

logger = logging.getLogger("civicclean.storage")


class StorageService:
    """Dual-mode storage adapter: Amazon S3 with local disk fallback."""

    def __init__(self):
        self.upload_root = settings.upload_dir.resolve()
        self.evidence_root = settings.evidence_dir.resolve()
        self.output_root = settings.output_dir.resolve()
        self.s3_bucket = settings.aws_s3_bucket
        self.s3_client: Any = None

        if self.s3_bucket:
            try:
                import boto3

                client_kwargs: dict[str, Any] = {"region_name": settings.aws_region}
                if settings.aws_access_key_id and settings.aws_secret_access_key:
                    client_kwargs["aws_access_key_id"] = settings.aws_access_key_id
                    client_kwargs["aws_secret_access_key"] = settings.aws_secret_access_key

                self.s3_client = boto3.client("s3", **client_kwargs)
                logger.info(
                    "[AWS S3] Initialized S3 storage vault with bucket '%s' (region: %s)",
                    self.s3_bucket,
                    settings.aws_region,
                )
            except Exception as e:
                logger.warning(
                    "[AWS S3] Could not initialize S3 client: %s. Defaulting to local disk.", e
                )
                self.s3_client = None

    @property
    def is_s3_enabled(self) -> bool:
        return bool(self.s3_client and self.s3_bucket)

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

            # If S3 is enabled, also mirror raw upload to S3 vault
            if self.is_s3_enabled:
                self.upload_to_s3(destination, f"uploads/{job_id}.mp4", content_type="video/mp4")

            return destination, total
        except Exception:
            temporary.unlink(missing_ok=True)
            destination.unlink(missing_ok=True)
            raise

    def upload_to_s3(self, local_path: Path, s3_key: str, content_type: str | None = None) -> bool:
        """Uploads a local file to Amazon S3."""
        if not self.is_s3_enabled:
            return False
        try:
            extra_args: dict[str, str] = {}
            if content_type:
                extra_args["ContentType"] = content_type
            elif local_path.suffix.lower() == ".mp4":
                extra_args["ContentType"] = "video/mp4"
            elif local_path.suffix.lower() in {".jpg", ".jpeg"}:
                extra_args["ContentType"] = "image/jpeg"
            elif local_path.suffix.lower() == ".png":
                extra_args["ContentType"] = "image/png"
            elif local_path.suffix.lower() == ".pdf":
                extra_args["ContentType"] = "application/pdf"

            self.s3_client.upload_file(
                str(local_path),
                self.s3_bucket,
                s3_key,
                ExtraArgs=extra_args if extra_args else None,
            )
            logger.info("[AWS S3] Uploaded s3://%s/%s (%d bytes)", self.s3_bucket, s3_key, local_path.stat().st_size)
            return True
        except Exception as e:
            logger.error("[AWS S3] Failed to upload %s to s3://%s/%s: %s", local_path, self.s3_bucket, s3_key, e)
            return False

    def get_presigned_evidence_url(
        self, incident_id: str, asset_name: str, expires_in: int | None = None
    ) -> str | None:
        """Generates a secure pre-signed GET URL for an evidence asset in S3."""
        if not self.is_s3_enabled:
            return None
        s3_key = f"evidence/{incident_id}/{asset_name}"
        expiry = expires_in or settings.aws_s3_presigned_expiry_seconds
        try:
            url = self.s3_client.generate_presigned_url(
                "get_object",
                Params={"Bucket": self.s3_bucket, "Key": s3_key},
                ExpiresIn=expiry,
            )
            return url
        except Exception as e:
            logger.warning("[AWS S3] Error generating presigned URL for %s: %s", s3_key, e)
            return None

    def sync_incident_evidence(self, incident_id: str, evidence: dict[str, str]) -> None:
        """Syncs all photographic and video evidence items for an incident to S3."""
        if not self.is_s3_enabled:
            return

        for key, filename in evidence.items():
            local_path: Path | None = None
            if key == "annotated_video":
                local_path = self.annotated_output(filename)
                if local_path is None or not local_path.is_file():
                    # Check in output root directly
                    candidate = self.output_root / filename
                    if candidate.is_file():
                        local_path = candidate
            else:
                local_path = self.evidence_file(incident_id, filename)

            if local_path and local_path.is_file():
                s3_key = f"evidence/{incident_id}/{filename}"
                self.upload_to_s3(local_path, s3_key)

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


# Backward-compatible singleton export
storage_service = StorageService()
local_storage = storage_service  # Alias for existing imports
