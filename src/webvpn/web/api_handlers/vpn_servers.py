import httpx
from fastapi import APIRouter, HTTPException
from webvpn.entities.application import ApplicationResponse
from webvpn.entities.vpn_servers import VpnServer, VpnServerClient
from webvpn.repositories.configs.configs import ConfigRepo
from webvpn.repositories.vpn_servers.servers import VPNServerRepo
from webvpn.repositories.vpn_servers.strategy import GetVpnServerByIdStrategy
from webvpn.utils import response
from webvpn.entities.dependency import PGConnectionDepends, UserDepends
import os
from dotenv import load_dotenv


load_dotenv()
vpn_servers_rt = APIRouter(prefix='/servers', tags=["VpnServer"])

def find_client(client_name: str, clients_json: list[dict]) -> VpnServerClient | None:
    new_client = clients_json[-1]
    if new_client['name'] == client_name:
        return VpnServerClient(
            latestHandshakeAt = new_client['latestHandshakeAt'],
            transferRx = new_client['transferRx'],
            transferTx = new_client['transferTx'],
            createdAt = new_client['createdAt'],
            updatedAt = new_client['updatedAt'],
            enabled = new_client['enabled'],
            user_id = new_client['id'],
        )
    idx_clients = len(clients_json)
    while idx_clients != 0:
        current_client = clients_json[idx_clients]
        name = current_client['name']
        if name == client_name:
            return VpnServerClient(
                latestHandshakeAt = current_client['latestHandshakeAt'],
                transferRx = current_client['transferRx'],
                transferTx = current_client['transferTx'],
                createdAt = current_client['createdAt'],
                updatedAt = current_client['updatedAt'],
                enabled = current_client['enabled'],
                user_id = current_client['id'],
            )
        
        idx_clients -= 1

    return None


@vpn_servers_rt.get("/", response_model=ApplicationResponse[list[VpnServer]])
async def get_all_servers(connect: PGConnectionDepends):
    servers = await VPNServerRepo.get_list(connect)
    return response(servers)


@vpn_servers_rt.get("/{server_id}/", response_model=ApplicationResponse[VpnServer])
async def get_server_by_id(user: UserDepends, server_id: int, connect: PGConnectionDepends):
    server = await VPNServerRepo.get(
        GetVpnServerByIdStrategy(server_id),
        connect, 
    )
    if not server:
        raise HTTPException(status_code=400, detail=f'Не удалось найти сервер с id {server_id}')
    return response(server)

@vpn_servers_rt.post('/{server_id}/clients/', response_model=ApplicationResponse[bool])
async def create_vpn_client(user: UserDepends, client_name: str, server_id: int, connect: PGConnectionDepends):
    server = await VPNServerRepo.get(
        GetVpnServerByIdStrategy(server_id),
        connect, 
    )
    if not server:
        raise HTTPException(status_code=400, detail='Сервер не найден')
    url = f'http://{server.ipv4}:51821/api/wireguard/client'

    records = await connect.fetch('SELECT * FROM vpn_servers_connection WHERE server_id = $1', server_id)
    connect_sid = dict(records[0]).get('connection')
    if not connect_sid:
        raise HTTPException(status_code=400, detail=f'Ошибка. Нет кредов для сервера {server_id}')

    client_create_response = httpx.post(url, cookies={'connect.sid': connect_sid}, json={'name': client_name})

    succes = client_create_response.json()['success']
    if not succes:
        raise HTTPException(status_code=400, detail=f'Ошибка при создание конфига для сервера - {server_id}')
    
    clients_response = httpx.get(url, cookies={'connect.sid': connect_sid})
    client: VpnServerClient | None = find_client(client_name=client_name, clients_json=clients_response.json())
    if not client:
        raise HTTPException(status_code=400, detail=f'Ошибка при создание конфига для сервера - {server_id}')
    config_id = await ConfigRepo.create(
        server_id=server_id, user_uuid=user.uuid, config_uuid=client.user_id, connect=connect, config_name=client_name, config_enabled=client.enabled
    )
    if not config_id:
        raise HTTPException(status_code=400, detail=f'Ошибка при создание конфига для сервера - {server_id}')
        
    return response(succes)

@vpn_servers_rt.get('/{server_id}/clients/', response_model=ApplicationResponse[list[VpnServerClient]])
async def clients_info(user: UserDepends, server_id: int, connect: PGConnectionDepends):
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
                user_id = client['id'],
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
