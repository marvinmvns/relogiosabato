"""Utilidades compartilhadas pelas ferramentas do relogio-santo."""
import datetime
import json
import pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUTPUT = ROOT / 'output' / 'sessions'

# UUIDs observados no TF37 Pro (descoberta GATT de 2026-11-12).
UUIDS = {
    '000018ac-0000-1000-8000-00805f9b34fb': 'svc-18AC (canal principal?)',
    '00002aac-0000-1000-8000-00805f9b34fb': '2AAC read/notify (relógio -> app)',
    '00002aad-0000-1000-8000-00805f9b34fb': '2AAD write (app -> relógio)',
    '00001106-0000-1000-8000-00805f9b34fb': 'svc-1106 (canal secundário?)',
    '00001107-0000-1000-8000-00805f9b34fb': '1107 read/notify (relógio -> app)',
    '00001108-0000-1000-8000-00805f9b34fb': '1108 write (app -> relógio)',
    '0000180f-0000-1000-8000-00805f9b34fb': 'Battery Service',
    '00002a19-0000-1000-8000-00805f9b34fb': 'Battery Level',
}

NOTIFY_UUIDS = [
    '00002aac-0000-1000-8000-00805f9b34fb',
    '00001107-0000-1000-8000-00805f9b34fb',
    '00002a19-0000-1000-8000-00805f9b34fb',
]


def now():
    return datetime.datetime.now(datetime.timezone.utc).isoformat()


def label(uuid):
    return UUIDS.get(uuid.lower(), '')


def save(kind, data):
    """Grava um relatório JSON em output/sessions e devolve o caminho."""
    OUTPUT.mkdir(parents=True, exist_ok=True)
    stamp = datetime.datetime.now().strftime('%Y%m%d-%H%M%S')
    path = OUTPUT / f'{kind}_{stamp}.json'
    path.write_text(json.dumps(data, indent=2, ensure_ascii=False))
    return path
