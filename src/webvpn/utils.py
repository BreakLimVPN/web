import secrets

from passlib.hash import bcrypt
from webvpn.entities.application import ApplicationResponse, ContentType
from fastapi.templating import Jinja2Templates
from webvpn.settings.base import settings
from uuid import uuid4, UUID

templates = Jinja2Templates(directory=settings.templates_path)


def response(data: ContentType) -> ApplicationResponse[ContentType]:
    return ApplicationResponse(content=data)


def generate_uuid() -> UUID:
    return uuid4()


def generate_session():
    return secrets.token_urlsafe(32)


def hash_password(password) -> str:
    return bcrypt.hash(password)
