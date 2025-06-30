from datetime import datetime
from uuid import UUID
from pydantic.dataclasses import dataclass
from pydantic import Field

@dataclass
class VpnServer:
    id: int
    name: str
    ipv4: str
    status: str
    provider: str
    image_url: str | None
    location: str = Field(alias="server_location") 
    bandwidth: int = Field(alias="networks_bandwidth")


@dataclass
class VpnServerClient:
    transferRx: int
    transferTx: int
    createdAt: str
    updatedAt: str
    enabled: bool
    latestHandshakeAt: str | None
    user_id: UUID
    name: str = 'Anonimus'