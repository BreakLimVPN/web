
from dataclasses import dataclass
from fastapi import APIRouter

from webvpn.entities.application import ApplicationResponse
from webvpn.utils import response


vpn_servers_rt = APIRouter(tags=['VpnServer'])

@dataclass
class VpnServer:
    id: int
    name: str
    location: str
    status: str
    provider: str

@dataclass
class VpnServersList:
    vpn_servers: list[VpnServer]

@vpn_servers_rt.get(
    '/servers/',
    response_model=ApplicationResponse[VpnServersList]
)
async def get_all_servers():
    return response(
        VpnServersList(
            [
                VpnServer(id=1, name='Server KZ', location='Kazahstan', status='Online', provider='TimeWeb'),
                VpnServer(id=2, name='Server EU', location='Frankfurt', status='Online', provider='TimeWeb'),
                VpnServer(id=3, name='Server AS', location='Singapore', status='Online', provider='TimeWeb'),
                VpnServer(id=4, name='Server KZ', location='Kazahstan', status='Offline', provider='TimeWeb'),
                VpnServer(id=5, name='Server KZ', location='Kazahstan', status='Online', provider='Selectel'),
            ]
        )
    )
