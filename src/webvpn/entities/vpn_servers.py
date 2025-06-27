from dataclasses import dataclass


@dataclass
class VpnServer:
    name: str
    ipv4: str
    location: str
    bandwidth: int
    status: str
