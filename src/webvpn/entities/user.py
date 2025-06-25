

from dataclasses import dataclass
from uuid import UUID


@dataclass
class User:
    uid: UUID
    username: str

@dataclass
class CreateUser(User):
    password: str

# @dataclass
# class User(BaseUser):
#     uid: UUID