from fastapi import APIRouter, Request
from fastapi.responses import HTMLResponse
from webvpn.utils import templates

ui_rt = APIRouter()


@ui_rt.get("/", response_class=HTMLResponse)
async def index(request: Request):
    return templates.TemplateResponse(request=request, name="index.html")


@ui_rt.get("/home/", response_class=HTMLResponse)
async def home(request: Request):
    return templates.TemplateResponse(request=request, name="home.html")


@ui_rt.get("/dashboard/", response_class=HTMLResponse)
async def dashboard(request: Request):
    return templates.TemplateResponse(request=request, name="dashboard.html")


@ui_rt.get("/self/", response_class=HTMLResponse)
async def self(request: Request):
    return templates.TemplateResponse(request=request, name="self.html")


@ui_rt.get("/servers/{id}/", response_class=HTMLResponse)
async def server(request: Request, id:int):
    return templates.TemplateResponse(request=request, name="server.html", context={'server_id': id})


@ui_rt.get("/servers/{id}/config/", response_class=HTMLResponse)
async def config(request: Request, id:int):
    return templates.TemplateResponse(request=request, name="config.html", context={'server_id': id})