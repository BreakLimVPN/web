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
