from fastapi import APIRouter, FastAPI
from fastapi.concurrency import asynccontextmanager
from fastapi.staticfiles import StaticFiles
from webvpn.repositories.postgres.database import (
    close_database_pool,
    initialize_databaze_pool,
)
from webvpn.settings.base import settings
from webvpn.web import routers as v1_routers


@asynccontextmanager
async def lifespan(app: FastAPI):
    await initialize_databaze_pool()
    yield
    await close_database_pool()


def include_routers(app: FastAPI, routers: list[APIRouter]):
    for router in routers:
        app.include_router(router)


def get_application():
    # Creare APP
    app = FastAPI(title="BreakLimVPN", debug=settings.debug, lifespan=lifespan)

    # Create API
    include_routers(app, v1_routers)

    # ADD Static for UI
    app.mount("/static", StaticFiles(directory=settings.assets_path), name="assets")

    return app


app = get_application()
