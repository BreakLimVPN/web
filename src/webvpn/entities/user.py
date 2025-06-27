from dataclasses import dataclass
from uuid import UUID


@dataclass
class User:
    uuid: UUID
    username: str


@dataclass
class FullUser(User):
    hash_password: str


@dataclass
class CreateUser(User):
    password: str


# @dataclass
# class User(BaseUser):
#     uid: UUID
