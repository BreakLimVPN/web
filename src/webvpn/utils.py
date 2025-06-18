from webvpn.entities.application import ApplicationResponse, ContentType
from fastapi.templating import Jinja2Templates
from webvpn.settings.base import settings

templates = Jinja2Templates(directory=settings.templates_path)

def response(data: ContentType) -> ApplicationResponse[ContentType]:
    return ApplicationResponse(content=data)