

from asyncpg import Record
from webvpn.entities.user import FullUser, User

class MapperError(Exception):
    pass

def user_mapper(record: Record) -> User | None:
    if record and isinstance(record, list):
        db_user = record[0]
    else:
        return None
    
    return User(**dict(db_user))


def full_user_mapper(record: Record) -> FullUser | None:
    if record and isinstance(record, list):
        db_user = record[0]
    else:
        return None
    
    return FullUser(**dict(db_user))