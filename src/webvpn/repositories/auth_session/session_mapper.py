from asyncpg import Record
from webvpn.entities.sessions import Session


class MapperError(Exception):
    pass


def session_mapper(record: Record) -> Session | None:
    if record and isinstance(record, list):
        db_user = record[0]
    else:
        return None

    return Session(**dict(db_user))
