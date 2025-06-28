import httpx as htp
from fastapi import APIRouter, HTTPException
from webvpn.entities.application import ApplicationResponse
from webvpn.entities.vpn_servers import VpnServer
from webvpn.repositories.vpn_servers.servers import VPNServerRepo
from webvpn.repositories.vpn_servers.strategy import GetVpnServerByIdStrategy
from webvpn.utils import response
from webvpn.entities.dependency import PGConnectionDepends
import os
from dotenv import load_dotenv


load_dotenv()
vpn_servers_rt = APIRouter(prefix='/servers', tags=["VpnServer"])




@vpn_servers_rt.get("/", response_model=ApplicationResponse[list[VpnServer]])
async def get_all_servers(connect: PGConnectionDepends):
    servers = await VPNServerRepo.get_list(connect)
    return response(servers)


@vpn_servers_rt.get("/{server_id}/", response_model=ApplicationResponse[VpnServer])
async def get_server_by_id(server_id: int, connect: PGConnectionDepends):
    server = await VPNServerRepo.get(
        GetVpnServerByIdStrategy(server_id),
        connect, 
    )
    if not server:
        raise HTTPException(status_code=400, detail=f'Не удалось найти сервер с id {server_id}')
    return response(server)


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
