from fastapi import APIRouter
# Frontend
from webvpn.web.ui_handlers.index import index_rt

# Backend
from webvpn.web.api_handlers.health import health_rt
from webvpn.web.api_handlers.checkcode import checkcode_rt
from webvpn.web.api_handlers.users import user_rt


# UI | Frontend
ui_v1 = APIRouter(tags=['UI'])
ui_v1.include_router(index_rt)

# API | Backend
api_v1 = APIRouter(prefix='/api', tags=['API'])
api_v1.include_router(health_rt)
api_v1.include_router(checkcode_rt)
api_v1.include_router(user_rt)

routers = [
    ui_v1,
    api_v1
]