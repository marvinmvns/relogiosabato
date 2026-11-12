"""Decodifica quadros DF/FD do TF37 Pro a partir do JSON gerado por btsnoop_att.py.

Formato (ver docs/PROTOCOLO.md):
  DF LEN_H LEN_L SUM CMD VER KEY PLEN_H PLEN_L PAYLOAD...
  FD LEN_H LEN_L SUM CMD VER KEY ...            (ACK)
SUM = soma de todos os outros bytes do quadro, módulo 256.

Uso:
  python tools/dfdecode.py private/captures/.../att.json            # quadro a quadro
  python tools/dfdecode.py att.json --summary                        # pares comando/chave
"""
import argparse
import collections
import json
import string

PRINTABLE = set(string.printable.encode()) - set(b'\t\n\r\x0b\x0c')


def checksum_ok(frame):
    return len(frame) >= 4 and (sum(frame) - frame[3]) & 0xFF == frame[3]


def decode(frame):
    """Devolve um dict com os campos do quadro, ou None se não for DF/FD."""
    if len(frame) < 7 or frame[0] not in (0xDF, 0xFD):
        return None
    length = int.from_bytes(frame[1:3], 'big')
    result = dict(kind='DF' if frame[0] == 0xDF else 'FD', cmd=frame[4], ver=frame[5],
                  key=frame[6], checksum=checksum_ok(frame),
                  lengthOk=length + 4 == len(frame), payload=b'')
    if frame[0] == 0xDF and len(frame) >= 9:
        plen = int.from_bytes(frame[7:9], 'big')
        result['payload'] = frame[9:9 + plen]
        result['lengthOk'] = result['lengthOk'] and plen + 9 == len(frame)
    elif frame[0] == 0xFD:
        result['payload'] = frame[7:]
    return result


def ascii_hint(data):
    text = ''.join(chr(b) if b in PRINTABLE else '.' for b in data)
    return text if sum(c != '.' for c in text) >= 4 else ''


def reassemble(events):
    """Junta pedaços de quadros DF/FD longos divididos em várias escritas/notificações.

    Um quadro começa com DF/FD e declara o tamanho total (bytes 1-2 + 4). Pedaços
    seguintes na mesma direção são concatenados até completar esse tamanho.
    Gera (evento_do_início, bytes_do_quadro).
    """
    pending = {}
    for e in events:
        if e['op'] not in ('write_cmd', 'write_req', 'notify') or not e['value']:
            continue
        data = bytes.fromhex(e['value'])
        side = e['direction']
        if side in pending:
            start, buf, total = pending[side]
            buf += data
            if len(buf) >= total:
                del pending[side]
                yield start, bytes(buf[:total])
            else:
                pending[side] = (start, buf, total)
            continue
        if len(data) >= 3 and data[0] in (0xDF, 0xFD):
            total = int.from_bytes(data[1:3], 'big') + 4
            if len(data) < total:
                pending[side] = (e, bytearray(data), total)
                continue
        yield e, data
    for start, buf, _total in pending.values():  # quadro incompleto no fim da captura
        yield start, bytes(buf)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('att_json')
    parser.add_argument('--summary', action='store_true')
    args = parser.parse_args()

    events = json.load(open(args.att_json))
    counts = collections.Counter()
    bad = 0
    for e, frame in reassemble(events):
        d = decode(frame)
        if d is None:
            continue
        side = 'app' if e['direction'].startswith('app') else 'rel'
        counts[(side, d['kind'], d['cmd'], d['key'])] += 1
        bad += not (d['checksum'] and d['lengthOk'])
        if not args.summary:
            flag = '' if d['checksum'] and d['lengthOk'] else '  !! checksum/tamanho'
            hint = ascii_hint(d['payload'])
            print(f"{e['time'][11:23]} {side}->{'rel' if side == 'app' else 'app'} {d['kind']} "
                  f"cmd={d['cmd']:02X} ver={d['ver']:02X} key={d['key']:02X} "
                  f"payload={d['payload'].hex()}{'  \"' + hint + '\"' if hint else ''}{flag}")
    if args.summary:
        print('origem tipo cmd/key  ocorrências')
        for (side, kind, cmd, key), n in sorted(counts.items()):
            print(f'{side:<6} {kind:<4} {cmd:02X}/{key:02X}   {n}')
    print(f'{sum(counts.values())} quadros DF/FD; {bad} com checksum ou tamanho inválido.')


if __name__ == '__main__':
    main()
