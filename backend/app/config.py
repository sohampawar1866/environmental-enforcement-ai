from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    database_url: str = "sqlite:///./data/incidents.db"
    evidence_dir: Path = Path("./evidence")
    upload_dir: Path = Path("./data/uploads")
    output_dir: Path = Path("./outputs")
    model_path: Path = Path("./models/baraa-best.pt")
    frontend_origin: str = "http://localhost:5173"
    max_upload_bytes: int = 500 * 1024 * 1024

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()
