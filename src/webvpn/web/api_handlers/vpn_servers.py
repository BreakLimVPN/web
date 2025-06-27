import httpx as htp
from dataclasses import dataclass
from fastapi import APIRouter
import json
from webvpn.entities.application import ApplicationResponse
from webvpn.utils import response
from webvpn.entities.dependency import PGConnectionDepends
import os
from dotenv import load_dotenv
load_dotenv()
vpn_servers_rt = APIRouter(tags=["VpnServer"])


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


@vpn_servers_rt.get("/servers/", response_model=ApplicationResponse[VpnServersList])
async def get_all_servers():
    return response(
        VpnServersList(
            [
                VpnServer(
                    id=1,
                    name="Server KZ",
                    location="Kazahstan",
                    status="Online",
                    provider="TimeWeb",
                ),
                VpnServer(
                    id=2,
                    name="Server EU",
                    location="Frankfurt",
                    status="Online",
                    provider="TimeWeb",
                ),
                VpnServer(
                    id=3,
                    name="Server AS",
                    location="Singapore",
                    status="Online",
                    provider="TimeWeb",
                ),
                VpnServer(
                    id=4,
                    name="Server KZ",
                    location="Kazahstan",
                    status="Offline",
                    provider="TimeWeb",
                ),
                VpnServer(
                    id=5,
                    name="Server KZ",
                    location="Kazahstan",
                    status="Online",
                    provider="Selectel",
                ),
            ]
        )
    )


@vpn_servers_rt.post("/update-servers/")
async def get_information(connect: PGConnectionDepends):
    headers = {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + os.getenv("TOKEN"),
    }
    inf = htp.get("https://api.timeweb.cloud/api/v1/servers", headers=headers)
    inf_json = inf.json()
    if inf.status_code == 200 and inf_json.get("servers"):
        for i in inf_json.get("servers"):
            name = i.get("name")
            ipv4 = i.get("networks")[0].get("ips")[0].get("ip")
            bandwidth = i.get("networks")[0].get("bandwidth")
            location = i.get("location")
            status = "Online" if i.get("status") == "on" else "Offline"

            query = "INSERT INTO vpn_servers (ipv4, server_location, networks_bandwidth, provider, status, name) VALUES ($1, $2, $3, $4, $5, $6)"
            await connect.fetch(
                query, ipv4, location, bandwidth, "Timeweb", status, name
            )
    else:
        print("АШИБКА")
