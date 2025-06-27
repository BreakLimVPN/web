from dataclasses import dataclass
from typing import Generic, TypeVar

ContentType = TypeVar("ContentType")


@dataclass
class ApplicationResponse(Generic[ContentType]):
    content: ContentType
    ok: bool = True


@dataclass
class HealthResponse:
    server_ok: bool = True
    database_ok: bool = True


@dataclass
class PongResponse:
    text: str = "ping-pong"


@dataclass
class ChechCodeResponse:
    accepted: bool = True
