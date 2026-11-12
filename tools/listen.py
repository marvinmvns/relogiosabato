"""Escuta notificações do relógio por um tempo limitado.

Conecta, lê a bateria uma vez, se inscreve em 2AAC, 1107 e 2A19 (isso grava
apenas o descritor CCCD, padrão do BLE), registra tudo o que chegar e desconecta.
Não envia nenhum comando proprietário (nada em 2AAD/1108).

Uso: python tools/listen.py 41:42:BA:B6:3B:E9 --seconds 30
Dica: mexa no relógio (troque de tela, gire o pulso) enquanto escuta.
"""
import argparse
import asyncio
import pathlib
import sys

from bleak import BleakClient, BleakScanner

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from common import NOTIFY_UUIDS, label, now, save

BATTERY = '00002a19-0000-1000-8000-00805f9b34fb'
MAX_SECONDS = 120
MAX_EVENTS = 4096


async def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('address')
    parser.add_argument('--seconds', type=float, default=30)
    parser.add_argument('--timeout', type=float, default=20)
    args = parser.parse_args()
    seconds = min(args.seconds, MAX_SECONDS)

    device = await BleakScanner.find_device_by_address(args.address, timeout=args.timeout)
    if device is None:
        raise SystemExit('Relógio não visível; nenhuma conexão feita.')
    report = dict(address=args.address, name=device.name, startedAt=now(), seconds=seconds,
                  battery=None, notifications=[], errors=[])

    def receive(characteristic, data):
        if len(report['notifications']) < MAX_EVENTS:
            entry = dict(at=now(), uuid=characteristic.uuid, label=label(characteristic.uuid),
                         hex=bytes(data).hex())
            report['notifications'].append(entry)
            print(f"{entry['at']}  {entry['label'] or entry['uuid']}: {entry['hex']}")

    async with BleakClient(device, timeout=args.timeout) as client:
        try:
            value = bytes(await client.read_gatt_char(BATTERY))
            report['battery'] = dict(hex=value.hex(), percent=value[0] if value else None)
            print('Bateria (2A19):', report['battery'])
        except Exception as exc:  # noqa: BLE001 - registrar e seguir
            report['errors'].append(f'battery: {exc}')
        subscribed = []
        for uuid in NOTIFY_UUIDS:
            if client.services.get_characteristic(uuid) is None:
                continue
            try:
                await client.start_notify(uuid, receive)
                subscribed.append(uuid)
            except Exception as exc:  # noqa: BLE001
                report['errors'].append(f'subscribe {uuid}: {exc}')
        print(f'Escutando {len(subscribed)} características por {seconds:.0f} s...')
        await asyncio.sleep(seconds)
        for uuid in subscribed:
            try:
                await client.stop_notify(uuid)
            except Exception as exc:  # noqa: BLE001
                report['errors'].append(f'unsubscribe {uuid}: {exc}')
    report['finishedAt'] = now()
    print(f"{len(report['notifications'])} notificações. Relatório:", save('listen', report))


asyncio.run(main())
