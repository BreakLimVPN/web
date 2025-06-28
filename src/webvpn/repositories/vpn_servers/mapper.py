

from asyncpg import Record

from webvpn.entities.vpn_servers import VpnServer


def vpn_servers_list_mapper(records: list[Record]) -> list[VpnServer]:
    output: list[VpnServer] = []
    for server in records:
        output.append(
            VpnServer(**dict(server))
        )
    return output

def vpn_server_mapper(record: list[Record]) -> VpnServer:
    return VpnServer(**dict(record[0]))