"""Procura o relógio ouvindo anúncios BLE. Não conecta e não envia nada.

Por padrão só guarda dispositivos cujo nome contém 'TF37', para não gravar
endereços de aparelhos vizinhos. Use --all para ver tudo (sem gravar).
"""
import argparse
import asyncio
import pathlib
import sys

from bleak import BleakScanner

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from common import now, save


async def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--seconds', type=float, default=10)
    parser.add_argument('--name', default='TF37', help='trecho do nome a filtrar')
    parser.add_argument('--all', action='store_true', help='mostra todos (não grava)')
    args = parser.parse_args()

    found = {}

    def receive(device, adv):
        name = adv.local_name or device.name or ''
        if args.all or args.name.lower() in name.lower():
            found[device.address] = dict(
                address=device.address, name=name, rssi=adv.rssi,
                manufacturerData={str(k): bytes(v).hex() for k, v in adv.manufacturer_data.items()},
                serviceUuids=adv.service_uuids,
                serviceData={k: bytes(v).hex() for k, v in adv.service_data.items()})

    started = now()
    async with BleakScanner(receive):
        await asyncio.sleep(args.seconds)

    for d in found.values():
        print(f"{d['address']}  {d['rssi']:>4} dBm  {d['name'] or '-'}  mfr={d['manufacturerData']}")
    if not found:
        print('Nada encontrado. O relógio está ligado e desconectado do celular?')
    if found and not args.all:
        print('Relatório:', save('scan', dict(startedAt=started, finishedAt=now(), devices=list(found.values()))))


asyncio.run(main())
