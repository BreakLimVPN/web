

from asyncpg import Record

from webvpn.entities.configs import VpnConfig


def config_mapper(record: list[Record]) -> VpnConfig | None:
    if record and isinstance(record, list):
        db_result = record[0]
    else:
        return None

    return VpnConfig(**dict(db_result))

def config_list_mapper(record: list[Record]) -> list[VpnConfig] | None:
    output: list[VpnConfig] = []
    if not record:
        return None
    for config in record:
        output.append(
            VpnConfig(**dict(config))
        )
    return output
