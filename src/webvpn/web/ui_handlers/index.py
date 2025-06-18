from fastapi import APIRouter, Request
from fastapi.responses import HTMLResponse
from webvpn.utils import templates

index_rt = APIRouter()


@index_rt.get(
    '/',
    response_class=HTMLResponse
)
async def index(request: Request):
    return templates.TemplateResponse(request=request, name='index.html')