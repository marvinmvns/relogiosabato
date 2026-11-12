"""Descoberta GATT: conecta, lista serviços/características/descritores e desconecta.

Não lê valores, não escreve e não se inscreve em notificações.
Uso: python tools/gatt_discover.py 41:42:BA:B6:3B:E9
"""
import argparse
import asyncio
import pathlib
import sys

from bleak import BleakClient, BleakScanner

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from common import label, now, save


async def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('address')
    parser.add_argument('--timeout', type=float, default=20)
    args = parser.parse_args()

    device = await BleakScanner.find_device_by_address(args.address, timeout=args.timeout)
    if device is None:
        raise SystemExit('Relógio não visível; nenhuma conexão feita.')
    result = dict(address=args.address, name=device.name, startedAt=now(), services=[])
    async with BleakClient(device, timeout=args.timeout) as client:
        for s in client.services:
            svc = dict(uuid=s.uuid, handle=s.handle, label=label(s.uuid), characteristics=[])
            for c in s.characteristics:
                svc['characteristics'].append(dict(
                    uuid=c.uuid, handle=c.handle, label=label(c.uuid), properties=c.properties,
                    descriptors=[dict(uuid=d.uuid, handle=d.handle) for d in c.descriptors]))
            result['services'].append(svc)
    result['finishedAt'] = now()

    for s in result['services']:
        print(f"SERVIÇO {s['uuid']} (h{s['handle']}) {s['label']}")
        for c in s['characteristics']:
            print(f"   CARAC {c['uuid']} (h{c['handle']}) {','.join(c['properties'])}  {c['label']}")
    print('Relatório:', save('gatt', result))


asyncio.run(main())
