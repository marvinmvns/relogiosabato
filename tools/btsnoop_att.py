"""Extrai o tráfego ATT (GATT) de um btsnoop_hci.log do Android.

Mostra escritas do app (write_req/write_cmd), notificações do relógio e leituras,
com handle e bytes em hex. Remonta fragmentos ACL. Só lê o arquivo.

Uso:
  python tools/btsnoop_att.py private/captures/btsnoop_hci.log
  python tools/btsnoop_att.py LOG --handles 0x0007,0x000a --json saida.json
"""
import argparse
import datetime
import json
import struct

BTSNOOP_MAGIC = b'btsnoop\0'
DATALINK_H4 = 1002
# Microssegundos entre 0000-01-01 e 1970-01-01, como no formato btsnoop.
EPOCH_DELTA_US = 0x00DCDDB30F2F8000

ATT_OPS = {
    0x01: 'error', 0x02: 'mtu_req', 0x03: 'mtu_rsp',
    0x0A: 'read_req', 0x0B: 'read_rsp', 0x12: 'write_req', 0x13: 'write_rsp',
    0x52: 'write_cmd', 0x1B: 'notify', 0x1D: 'indicate', 0x1E: 'confirm',
}
WITH_HANDLE = {0x0A, 0x12, 0x52, 0x1B, 0x1D}


def records(data):
    """Gera (sent, timestamp_us, packet) para cada registro do arquivo."""
    if data[:8] != BTSNOOP_MAGIC:
        raise ValueError('Arquivo não é btsnoop.')
    _version, datalink = struct.unpack('>II', data[8:16])
    if datalink != DATALINK_H4:
        raise ValueError(f'Datalink {datalink} não suportado (esperado 1002/H4).')
    off = 16
    while off + 24 <= len(data):
        _orig, incl, flags, _drops, ts = struct.unpack('>IIIIq', data[off:off + 24])
        off += 24
        packet = data[off:off + incl]
        off += incl
        if len(packet) < incl:
            break  # registro truncado no fim do arquivo
        yield (flags & 1) == 0, ts, packet


def att_events(data):
    """Gera um dict por PDU ATT, remontando L2CAP fragmentado em ACL."""
    pending = {}
    for sent, ts, packet in records(data):
        if not packet or packet[0] != 0x02 or len(packet) < 5:
            continue  # só pacotes ACL
        header, length = struct.unpack('<HH', packet[1:5])
        conn, boundary = header & 0x0FFF, (header >> 12) & 0x3
        payload = packet[5:5 + length]
        key = (conn, sent)
        if boundary == 0x1:  # continuação
            if key not in pending:
                continue
            pending[key]['buf'] += payload
        else:  # início de um PDU L2CAP
            pending[key] = dict(buf=bytearray(payload), ts=ts)
        entry = pending[key]
        buf = entry['buf']
        if len(buf) < 4:
            continue
        l2len, cid = struct.unpack('<HH', buf[:4])
        if len(buf) - 4 < l2len:
            continue  # aguardando mais fragmentos
        del pending[key]
        if cid != 0x0004:
            continue  # não é ATT
        att = bytes(buf[4:4 + l2len])
        if not att:
            continue
        op = att[0]
        event = dict(
            time=datetime.datetime.fromtimestamp(
                (entry['ts'] - EPOCH_DELTA_US) / 1e6, datetime.timezone.utc).isoformat(),
            direction='app->relógio' if sent else 'relógio->app',
            conn=conn, op=ATT_OPS.get(op, f'0x{op:02x}'), handle=None, value='')
        if op in WITH_HANDLE and len(att) >= 3:
            event['handle'] = struct.unpack('<H', att[1:3])[0]
            event['value'] = att[3:].hex()
        elif op == 0x01 and len(att) >= 5:
            event['handle'] = struct.unpack('<H', att[2:4])[0]
            event['value'] = f'req=0x{att[1]:02x} code=0x{att[4]:02x}'
        else:
            event['value'] = att[1:].hex()
        yield event


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('log')
    parser.add_argument('--handles', help='lista separada por vírgula, ex.: 0x0007,10')
    parser.add_argument('--json', help='grava os eventos neste arquivo')
    args = parser.parse_args()

    wanted = {int(h, 0) for h in args.handles.split(',')} if args.handles else None
    with open(args.log, 'rb') as f:
        data = f.read()
    events = [e for e in att_events(data)
              if wanted is None or e['handle'] in wanted]
    if args.json:  # grava antes de imprimir, para não perder o JSON se a saída for cortada
        with open(args.json, 'w') as f:
            json.dump(events, f, indent=2, ensure_ascii=False)
    for e in events:
        handle = f"h0x{e['handle']:04x}" if e['handle'] is not None else '      '
        print(f"{e['time']}  {e['direction']:<13} {e['op']:<10} {handle}  {e['value']}")
    print(f'{len(events)} eventos ATT.')


if __name__ == '__main__':
    main()
