import httpx
from fastapi import APIRouter, HTTPException
from webvpn.entities.application import ApplicationResponse
from webvpn.entities.vpn_servers import VpnServer, VpnServerClient
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


@vpn_servers_rt.get('/{server_id}/clients/', response_model=ApplicationResponse[list[VpnServerClient]])
async def clients_info(server_id: int, connect: PGConnectionDepends):
    server = await VPNServerRepo.get(
        GetVpnServerByIdStrategy(server_id),
        connect, 
    )
    if not server:
        raise HTTPException(status_code=400, detail='Сервер не найден')
    
    records = await connect.fetch('SELECT * FROM vpn_servers_connection WHERE server_id = $1', server_id)
    
    url = f'http://{server.ipv4}:51821/api/wireguard/client'
    connect_sid = dict(records[0]).get('connection')
    if not connect_sid:
        raise HTTPException(status_code=400, detail=f'Ошибка. Нет кредов для сервера {server_id}')
    cookies = {
        'connect.sid': connect_sid
    }
    
    vpn_response = httpx.get(url, cookies=cookies)
    json_response = vpn_response.json()
    if vpn_response.status_code != 200 or not json_response:
        raise HTTPException(status_code=400, detail=f'Ошибка получения клиентов сервера {server_id}')
    clients = []
    for client in json_response:
        clients.append(
            VpnServerClient(
                latestHandshakeAt = client['latestHandshakeAt'],
                transferRx = client['transferRx'],
                transferTx = client['transferTx'],
                createdAt = client['createdAt'],
                updatedAt = client['updatedAt'],
                enabled = client['enabled'],
            )
        )
    
    return response(clients)


@vpn_servers_rt.post("/update-servers/")
async def get_information(connect: PGConnectionDepends):
    TOKEN: str | None = os.getenv("TOKEN")
    if not TOKEN:
        raise HTTPException(status_code=500, detail='Timeweb token not found')
    headers = {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + TOKEN,
    }
    inf = httpx.get("https://api.timeweb.cloud/api/v1/servers", headers=headers)
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
