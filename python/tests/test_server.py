import asyncio
import json
import struct
import unittest

from sentiogenesis.server import _read_message


def masked_frame(payload: bytes, opcode: int, final: bool) -> bytes:
    first = (0x80 if final else 0) | opcode
    mask = b"test"
    length = len(payload)
    if length < 126:
        header = bytes([first, 0x80 | length])
    elif length < 65536:
        header = bytes([first, 0x80 | 126]) + struct.pack("!H", length)
    else:
        header = bytes([first, 0x80 | 127]) + struct.pack("!Q", length)
    encoded = bytes(value ^ mask[index % 4] for index, value in enumerate(payload))
    return header + mask + encoded


class WebSocketProtocolTests(unittest.IsolatedAsyncioTestCase):
    async def test_reassembles_a_large_fragmented_browser_snapshot(self):
        payload = json.dumps({"type": "ingest", "life": {"memory": "x" * 180_000}}).encode()
        split = 90_000
        reader = asyncio.StreamReader()
        reader.feed_data(masked_frame(payload[:split], 1, False))
        reader.feed_data(masked_frame(payload[split:], 0, True))
        reader.feed_eof()
        opcode, decoded = await _read_message(reader)
        self.assertEqual(opcode, 1)
        self.assertEqual(decoded, payload)


if __name__ == "__main__":
    unittest.main()
