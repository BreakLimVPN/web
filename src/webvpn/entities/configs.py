from uuid import UUID
from pydantic.dataclasses import dataclass
from datetime import datetime


@dataclass
class VpnConfig:
    id: int
    server_id: int
    config_uuid: UUID
    config_name: str
    config_enabled: bool
    user_uuid: UUID
    created_at: datetime
    updated_at: datetime