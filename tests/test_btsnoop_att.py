"""Teste offline do parser btsnoop com uma captura sintética (sem hardware)."""
import pathlib
import struct
import sys
import unittest

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent.parent / 'tools'))
import btsnoop_att  # noqa: E402

TS = btsnoop_att.EPOCH_DELTA_US + 1_700_000_000 * 1_000_000


def record(packet, received, ts=TS):
    flags = 1 if received else 0
    return struct.pack('>IIIIq', len(packet), len(packet), flags, 0, ts) + packet


def acl(conn, boundary, payload):
    return bytes([0x02]) + struct.pack('<HH', conn | (boundary << 12), len(payload)) + payload


def l2cap_att(att):
    return struct.pack('<HH', len(att), 0x0004) + att


def capture(*records_):
    return b'btsnoop\0' + struct.pack('>II', 1, 1002) + b''.join(records_)


class BtsnoopAttTest(unittest.TestCase):
    def test_write_and_fragmented_notify(self):
        write = l2cap_att(bytes([0x52, 0x0A, 0x00, 0xAB, 0xCD]))
        notify = l2cap_att(bytes([0x1B, 0x07, 0x00]) + bytes(range(10)))
        data = capture(
            record(acl(0x40, 0b10, write), received=False),
            record(acl(0x40, 0b10, notify[:6]), received=True),
            record(acl(0x40, 0b01, notify[6:]), received=True),
            record(bytes([0x04, 0x0E, 0x00]), received=True),  # evento HCI, ignorado
        )
        events = list(btsnoop_att.att_events(data))
        self.assertEqual(len(events), 2)
        self.assertEqual(events[0]['op'], 'write_cmd')
        self.assertEqual(events[0]['direction'], 'app->relógio')
        self.assertEqual(events[0]['handle'], 0x000A)
        self.assertEqual(events[0]['value'], 'abcd')
        self.assertEqual(events[1]['op'], 'notify')
        self.assertEqual(events[1]['direction'], 'relógio->app')
        self.assertEqual(events[1]['handle'], 0x0007)
        self.assertEqual(events[1]['value'], bytes(range(10)).hex())
        self.assertTrue(events[0]['time'].startswith('2023-11-14'))

    def test_error_response(self):
        err = l2cap_att(bytes([0x01, 0x0A, 0x09, 0x00, 0x0A]))
        events = list(btsnoop_att.att_events(capture(record(acl(1, 0b10, err), True))))
        self.assertEqual(events[0]['op'], 'error')
        self.assertEqual(events[0]['handle'], 0x0009)

    def test_rejects_non_btsnoop(self):
        with self.assertRaises(ValueError):
            list(btsnoop_att.att_events(b'not a capture'))


if __name__ == '__main__':
    unittest.main()
