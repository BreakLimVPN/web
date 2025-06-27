from dataclasses import dataclass
from uuid import UUID


@dataclass
class Session:
    id: int
    user_uuid: UUID
    session: str
    is_active: bool
    created_at: str
    expires_at: str | None
