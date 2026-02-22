from __future__ import annotations

from pathlib import Path
from pydantic_settings import BaseSettings
from pydantic import Field, field_validator


class Settings(BaseSettings):
    OPENAI_API_KEY: str | None = None
    MODEL_DEFAULT: str = "gpt-4o"
    
    # Vector Store Configuration
    DOC_VECTOR_STORE_ID: str | None = Field(
        default=None,
        description=(
            "Primary document vector store ID. "
            "Optional if vectorstore_id is provided per request."
        ),
    )
    
    # Knowledge Graph paths (GCS or local). Primary PUDA domain path is required.
    PUDA_ACTS_REGULATIONS_KG_PATH: str = Field(
        ...,
        description=(
            "Path to PUDA urban administration KG. "
            "Required. Use gs://... in production, local absolute path in development."
        ),
    )
    APF_KG_PATH: str | None = Field(
        default=None,
        description="Path to APF KG (optional).",
    )
    PRE_SALES_KG_PATH: str | None = Field(
        default=None,
        description="Path to pre-sales KG (optional).",
    )
    
    # Domain-specific vector store overrides (fall back to DOC_VECTOR_STORE_ID)
    PUDA_ACTS_REGULATIONS_VECTOR_STORE_ID: str | None = Field(
        default=None,
    )
    APF_VECTOR_STORE_ID: str | None = None
    PRE_SALES_VECTOR_STORE_ID: str | None = None
    
    CACHE_DIR: str = "/tmp/ekg_cache"
    LOG_LEVEL: str = "INFO"
    MAX_CACHE_SIZE: int = 1000
    CACHE_TTL: int = 3600
    SESSION_SECRET_KEY: str = Field(
        "change-me",
        description="Secret used to sign session cookies. Override in production.",
    )
    SESSION_COOKIE_NAME: str = "ekg_admin_session"
    SESSION_COOKIE_SECURE: bool = Field(
        default=True,
        description="Set to False for local development (HTTP). True for production (HTTPS)."
    )
    SESSION_COOKIE_SAMESITE: str = "lax"
    ADMIN_USERNAME: str = "admin"
    ADMIN_PASSWORD_HASH: str = (
        "$2b$12$4LnAjeX8ZBpBVyvrucwYcOGWvrEU6fCgtqlDJbw6yCmKjfir7k0AS"
    )  # Hash for 'ChangeMe123!'
    GOOGLE_SERVICE_ACCOUNT_FILE: str | None = None
    CORS_ORIGINS: str = Field(
        default="*",
        description="CORS allowed origins (comma-separated). Use '*' for all, or specific domains for production."
    )
    GOOGLE_ALLOWED_MIME_TYPES: list[str] = Field(
        default_factory=lambda: [
            "application/pdf",
            "text/plain",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "application/msword",
            "text/markdown",
            "text/csv",
            "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        ]
    )
    
    @field_validator(
        "DOC_VECTOR_STORE_ID",
        "PUDA_ACTS_REGULATIONS_VECTOR_STORE_ID",
        "APF_VECTOR_STORE_ID",
        "PRE_SALES_VECTOR_STORE_ID",
    )
    @classmethod
    def validate_vectorstore_id(cls, v: str | None) -> str | None:
        if v is None or v == "":
            return None
        if not v.startswith("vs_"):
            raise ValueError("Vector store IDs must start with 'vs_'")
        return v
    
    @field_validator(
        "PUDA_ACTS_REGULATIONS_KG_PATH",
        "APF_KG_PATH",
        "PRE_SALES_KG_PATH",
    )
    @classmethod
    def validate_gcs_or_local_path(cls, v: str | None) -> str | None:
        """
        Accept either:
        - GCS paths (gs://...) for production
        - Existing local file paths for local/dev usage
        """
        if v is None or v == "":
            return None
        if v.startswith("gs://"):
            return v
        p = Path(v)
        if p.exists() and p.is_file():
            return str(p.resolve())
        raise ValueError("KG paths must be gs://... or an existing local file path")

    @field_validator("LOG_LEVEL")
    @classmethod
    def validate_log_level(cls, v: str) -> str:
        valid_levels = ["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"]
        if v.upper() not in valid_levels:
            raise ValueError(f"Invalid log level. Must be one of: {valid_levels}")
        return v.upper()

    @field_validator("MAX_CACHE_SIZE")
    @classmethod
    def validate_cache_size(cls, v: int) -> int:
        if v < 10 or v > 10000:
            raise ValueError("MAX_CACHE_SIZE must be between 10 and 10000")
        return v

    @field_validator("CACHE_TTL")
    @classmethod
    def validate_cache_ttl(cls, v: int) -> int:
        if v < 60 or v > 86400:  # 1 minute to 24 hours
            raise ValueError("CACHE_TTL must be between 60 and 86400 seconds")
        return v

    @field_validator("SESSION_COOKIE_SAMESITE")
    @classmethod
    def validate_same_site(cls, v: str) -> str:
        allowed = {"lax", "strict", "none"}
        if v.lower() not in allowed:
            raise ValueError("SESSION_COOKIE_SAMESITE must be one of: lax, strict, none")
        return v.lower()

    model_config = {
        "env_file": ".env",
        "extra": "ignore",
    }


settings = Settings()
