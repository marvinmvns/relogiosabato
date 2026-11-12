"""Testes offline do decodificador DF/FD (dados sintéticos e o quadro F3/00 do app)."""
import pathlib
import sys
import unittest

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent.parent / 'tools'))
import dfdecode  # noqa: E402


def build(cmd, key, payload=b'', ver=0x04):
    """Monta um quadro DF como CommandUtils.generalSendBytes + addSumCheck."""
    body = bytes([0xDF]) + (len(payload) + 5).to_bytes(2, 'big') + bytes([cmd, ver, key]) \
        + len(payload).to_bytes(2, 'big') + payload
    return body[:3] + bytes([sum(body) & 0xFF]) + body[3:]


def event(frame, direction='relógio->app', op='notify'):
    return dict(op=op, direction=direction, value=frame.hex())


class DfDecodeTest(unittest.TestCase):
    def test_app_device_info_frame(self):
        # getDeviceInfo() com versão 0, como visto na primeira escrita do app.
        frame = bytes.fromhex('df0005d7f300000000')
        self.assertEqual(build(0xF3, 0x00, ver=0), frame)
        d = dfdecode.decode(frame)
        self.assertEqual((d['kind'], d['cmd'], d['key']), ('DF', 0xF3, 0x00))
        self.assertTrue(d['checksum'] and d['lengthOk'])

    def test_bad_checksum(self):
        frame = bytearray(build(0x11, 0x00, b'\x00'))
        frame[3] ^= 0xFF
        self.assertFalse(dfdecode.decode(bytes(frame))['checksum'])

    def test_ack(self):
        d = dfdecode.decode(bytes.fromhex('fd00061c140400000100'))
        self.assertEqual((d['kind'], d['cmd'], d['ver']), ('FD', 0x14, 0x04))
        self.assertTrue(d['checksum'] and d['lengthOk'])

    def test_reassembles_split_frame(self):
        frame = build(0x02, 0x17, b'V1.8(TEST_PROJECT_NAME)')
        events = [event(frame[:10]), event(build(0x11, 0x00, b'\x01'), 'app->relógio', 'write_cmd'),
                  event(frame[10:20]), event(frame[20:])]
        out = list(dfdecode.reassemble(events))
        self.assertEqual(len(out), 2)
        frames = {f for _e, f in out}
        self.assertIn(frame, frames)
        self.assertTrue(all(dfdecode.decode(f)['checksum'] for f in frames))

    def test_ignores_other_bytes(self):
        self.assertIsNone(dfdecode.decode(b'\x01\x02\x03\x04\x05\x06\x07'))


if __name__ == '__main__':
    unittest.main()
