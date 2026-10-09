from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # Full URLs for frontend, backend, and CORS whitelist
    frontend_url: str = Field(default="http://localhost:5173", alias="FRONTEND_URL")
    backend_url: str = Field(default="http://localhost:8000", alias="BACKEND_URL")
    cors_allowed_origins: str = Field(
        default="http://localhost:5173,http://127.0.0.1:5173",
        alias="CORS_ALLOWED_ORIGINS",
    )

    # Legacy alias support for FRONTEND_ORIGIN
    frontend_origin: str = Field(default="http://localhost:5173", alias="FRONTEND_ORIGIN")

    # Storage & directories
    database_url: str = Field(default="sqlite:///./data/incidents.db", alias="DATABASE_URL")
    evidence_dir: Path = Field(default=Path("./evidence"), alias="EVIDENCE_DIR")
    upload_dir: Path = Field(default=Path("./data/uploads"), alias="UPLOAD_DIR")
    output_dir: Path = Field(default=Path("./outputs"), alias="OUTPUT_DIR")
    model_path: Path = Field(default=Path("./models/baraa-best.pt"), alias="MODEL_PATH")
    max_upload_bytes: int = Field(default=500 * 1024 * 1024, alias="MAX_UPLOAD_BYTES")

    # AWS S3 Storage (Optional - falls back to local storage if unset)
    aws_s3_bucket: str | None = Field(default=None, alias="AWS_S3_BUCKET_NAME")
    aws_region: str = Field(default="us-east-1", alias="AWS_DEFAULT_REGION")
    aws_access_key_id: str | None = Field(default=None, alias="AWS_ACCESS_KEY_ID")
    aws_secret_access_key: str | None = Field(default=None, alias="AWS_SECRET_ACCESS_KEY")
    aws_s3_presigned_expiry_seconds: int = Field(default=7200, alias="AWS_S3_PRESIGNED_EXPIRY_SECONDS")

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        populate_by_name=True,
    )

    @property
    def allowed_cors_origins(self) -> list[str]:
        """Aggregate all valid, unique CORS origin URLs from env variables."""
        origins: set[str] = set()

        if self.cors_allowed_origins:
            for item in self.cors_allowed_origins.split(","):
                clean = item.strip().rstrip("/")
                if clean:
                    origins.add(clean)

        if self.frontend_url:
            origins.add(self.frontend_url.strip().rstrip("/"))
        if self.frontend_origin:
            origins.add(self.frontend_origin.strip().rstrip("/"))

        return sorted(list(origins))


settings = Settings()

