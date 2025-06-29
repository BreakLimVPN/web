

from fastapi import APIRouter, HTTPException

from webvpn.entities.application import ApplicationResponse
from webvpn.entities.configs import VpnConfig
from webvpn.entities.dependency import PGConnectionDepends, UserDepends
from webvpn.repositories.configs.config_mapper import config_list_mapper
from webvpn.repositories.configs.configs import ConfigRepo
from webvpn.repositories.configs.get_configs_strategy import GetConfigsByUserUUID
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
        raise HTTPException(status_code=400, detail=f"Конфиги для пользователя {user.username} не найдены")
    
    return response(configs)
    