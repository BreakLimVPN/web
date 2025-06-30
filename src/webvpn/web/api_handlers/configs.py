import io
from fastapi import APIRouter, HTTPException, Response
from fastapi.responses import StreamingResponse
import httpx

from webvpn.entities.application import ApplicationResponse
from webvpn.entities.configs import RequestConfigToggle, VpnConfig
from webvpn.entities.dependency import PGConnectionDepends, UserDepends
from webvpn.repositories.configs.config_mapper import config_list_mapper, config_mapper
from webvpn.repositories.configs.configs import ConfigRepo
from webvpn.repositories.configs.get_configs_strategy import GetConfigsByConfigID, GetConfigsByUserUUID
from webvpn.repositories.vpn_servers.servers import VPNServerRepo
from webvpn.repositories.vpn_servers.strategy import GetVpnServerByIdStrategy
from webvpn.utils import response


config_rt = APIRouter(prefix='/configs', tags=["VpnConfig"])


@config_rt.get('/', response_model=ApplicationResponse[list[VpnConfig]])
async def get(user: UserDepends, connect: PGConnectionDepends):
    configs: list[VpnConfig] = await ConfigRepo.get(
        GetConfigsByUserUUID(user.uuid),
        connect,
        config_list_mapper
    )
    if not configs:
        return response([])
    
    return response(configs)

@config_rt.post('/{config_id}/toggle/', response_model=ApplicationResponse[bool])
async def toggle(config_id: int , user: UserDepends, connect: PGConnectionDepends, request: RequestConfigToggle):
    config: VpnConfig = await ConfigRepo.get(
        GetConfigsByConfigID(config_id),
        connect,
        config_mapper
    )
    if not config:
        raise HTTPException(status_code=400, detail='Конфиг не найден')

    if config.user_uuid != user.uuid:
        raise HTTPException(status_code=400, detail='Нет прав для переключения этого конфига')
    
    server = await VPNServerRepo.get(
        GetVpnServerByIdStrategy(config.server_id),
        connect, 
    )
    if not server:
        raise HTTPException(status_code=400, detail='Сервер не найден')
    suffix = ''
    if not request.enabled:
        suffix = 'disable'
    else:
        suffix = 'enable'
    
    url = f'http://{server.ipv4}:51821/api/wireguard/client/{config.config_uuid}/{suffix}'
    records = await connect.fetch('SELECT * FROM vpn_servers_connection WHERE server_id = $1', config.server_id)
    connect_sid = dict(records[0]).get('connection')
    if not connect_sid:
        raise HTTPException(status_code=400, detail='Ошибка получения кредов сервера')
        
    vpn_response = httpx.post(url, cookies={'connect.sid': connect_sid})
    if vpn_response.status_code != 200:
        raise HTTPException(status_code=400, detail='Не удалось удалить конфиг на VPN сервере')
    vpn_server_status = vpn_response.json()['success']
    db_status = await ConfigRepo.toggle_enabled(request.enabled, config_id, connect)
    
    if not vpn_server_status or not db_status:
        raise HTTPException(status_code=400, detail='Что-то пошло не так...')
    return response(True)



@config_rt.delete('/{config_id}/', response_model=ApplicationResponse[bool])
async def delete(config_id: int , user: UserDepends, connect: PGConnectionDepends):
    config: VpnConfig = await ConfigRepo.get(
        GetConfigsByConfigID(config_id),
        connect,
        config_mapper
    )
    
    if not config:
        raise HTTPException(status_code=400, detail='Конфиг не найден')
    
    if config.user_uuid != user.uuid:
        raise HTTPException(status_code=400, detail='Нет прав для удаления этого конфига')
    
    server = await VPNServerRepo.get(
        GetVpnServerByIdStrategy(config.server_id),
        connect, 
    )
    if not server:
        raise HTTPException(status_code=400, detail='Сервер не найден')

    url = f'http://{server.ipv4}:51821/api/wireguard/client/{config.config_uuid}'
    records = await connect.fetch('SELECT * FROM vpn_servers_connection WHERE server_id = $1', config.server_id)
    connect_sid = dict(records[0]).get('connection')
    if not connect_sid:
        raise HTTPException(status_code=400, detail='Ошибка получения кредов сервера')
    
    vpn_response = httpx.delete(url, cookies={'connect.sid': connect_sid})
    if vpn_response.status_code != 200:
        raise HTTPException(status_code=400, detail='Не удалось удалить конфиг на VPN сервере')

    vpn_server_status = vpn_response.json()['success']
    db_status = await ConfigRepo.delete(config_id, connect)
    
    if db_status and vpn_server_status:
        return response(True)
    return response(False)


@config_rt.get('/{config_id}/qr/')
async def get_qr(config_id: int , user: UserDepends, connect: PGConnectionDepends):
    config: VpnConfig = await ConfigRepo.get(
        GetConfigsByConfigID(config_id),
        connect,
        config_mapper
    )
    
    if not config:
        raise HTTPException(status_code=400, detail='Конфиг не найден')
    
    if config.user_uuid != user.uuid:
        raise HTTPException(status_code=400, detail='Нет прав для получения QR этого конфига')
    
    server = await VPNServerRepo.get(
        GetVpnServerByIdStrategy(config.server_id),
        connect, 
    )
    if not server:
        raise HTTPException(status_code=400, detail='Сервер не найден')

    url = f'http://{server.ipv4}:51821/api/wireguard/client/{config.config_uuid}/qrcode.svg'
    records = await connect.fetch('SELECT * FROM vpn_servers_connection WHERE server_id = $1', config.server_id)
    connect_sid = dict(records[0]).get('connection')
    if not connect_sid:
        raise HTTPException(status_code=400, detail='Ошибка получения кредов сервера')
    
    vpn_response = httpx.get(url, cookies={'connect.sid': connect_sid})
    if vpn_response.status_code != 200:
        raise HTTPException(status_code=400, detail='Не удалось получить QR конфига')
    svg_io = io.BytesIO(vpn_response.read())
    return StreamingResponse(
        content=svg_io,
        media_type="image/svg+xml",
        headers={"Content-Disposition": "inline; filename=qrcode.svg"}
    )

@config_rt.get('/{config_id}/configuration/')
async def get_config(config_id: int , user: UserDepends, connect: PGConnectionDepends):
    config: VpnConfig = await ConfigRepo.get(
        GetConfigsByConfigID(config_id),
        connect,
        config_mapper
    )
    
    if not config:
        raise HTTPException(status_code=400, detail='Конфиг не найден')
    
    if config.user_uuid != user.uuid:
        raise HTTPException(status_code=400, detail='Нет прав для получения QR этого конфига')
    
    server = await VPNServerRepo.get(
        GetVpnServerByIdStrategy(config.server_id),
        connect, 
    )
    if not server:
        raise HTTPException(status_code=400, detail='Сервер не найден')

    url = f'http://{server.ipv4}:51821/api/wireguard/client/{config.config_uuid}/configuration'
    records = await connect.fetch('SELECT * FROM vpn_servers_connection WHERE server_id = $1', config.server_id)
    connect_sid = dict(records[0]).get('connection')
    if not connect_sid:
        raise HTTPException(status_code=400, detail='Ошибка получения кредов сервера')
    
    vpn_response = httpx.get(url, cookies={'connect.sid': connect_sid})
    print(vpn_response.status_code)
    print(vpn_response.read())
    if vpn_response.status_code != 200:
        raise HTTPException(status_code=500, detail='Ошибка получения конфигурации с сервера')
    
    config_content = vpn_response.content.decode('utf-8')
    
    return Response(
        content=config_content,
        media_type='application/octet-stream',
        headers={
            'Content-Disposition': f'attachment; filename="vpn_config_{config.config_name}.conf"'
        }
    )
