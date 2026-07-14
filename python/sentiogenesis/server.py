"""Dependency-free localhost WebSocket server for the Python life substrate."""

from __future__ import annotations

import argparse
import asyncio
import base64
import hashlib
import json
import struct
import sys
from typing import Any

from .kernel import KernelSession, PROTOCOL_VERSION

GUID = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11"
MAX_MESSAGE = 8 * 1024 * 1024


async def _handshake(reader: asyncio.StreamReader, writer: asyncio.StreamWriter) -> bool:
    request = await reader.readuntil(b"\r\n\r\n")
    lines = request.decode("latin1").split("\r\n")
    headers = {key.lower(): value.strip() for line in lines[1:] if ":" in line for key, value in [line.split(":", 1)]}
    origin = headers.get("origin", "")
    if origin and not (origin.startswith("http://127.0.0.1") or origin.startswith("http://localhost")):
        writer.write(b"HTTP/1.1 403 Forbidden\r\nContent-Length: 0\r\n\r\n")
        await writer.drain()
        return False
    key = headers.get("sec-websocket-key")
    if not key:
        return False
    accept = base64.b64encode(hashlib.sha1((key + GUID).encode()).digest()).decode()
    writer.write(("HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\n" f"Sec-WebSocket-Accept: {accept}\r\n\r\n").encode())
    await writer.drain()
    return True


async def _read_frame(reader: asyncio.StreamReader) -> tuple[bool, int, bytes]:
    first, second = await reader.readexactly(2)
    final, opcode, masked, length = bool(first & 0x80), first & 0x0F, bool(second & 0x80), second & 0x7F
    if length == 126:
        length = struct.unpack("!H", await reader.readexactly(2))[0]
    elif length == 127:
        length = struct.unpack("!Q", await reader.readexactly(8))[0]
    if length > MAX_MESSAGE:
        raise ValueError("message too large")
    mask = await reader.readexactly(4) if masked else b""
    payload = await reader.readexactly(length)
    if masked:
        payload = bytes(value ^ mask[index % 4] for index, value in enumerate(payload))
    return final, opcode, payload


async def _read_message(reader: asyncio.StreamReader) -> tuple[int, bytes]:
    final, opcode, payload = await _read_frame(reader)
    if opcode in (8, 9, 10) or final:
        return opcode, payload
    if opcode != 1:
        raise ValueError("unsupported fragmented opcode")
    chunks = [payload]
    total = len(payload)
    while not final:
        final, continuation, payload = await _read_frame(reader)
        if continuation != 0:
            raise ValueError("expected continuation frame")
        total += len(payload)
        if total > MAX_MESSAGE:
            raise ValueError("message too large")
        chunks.append(payload)
    return opcode, b"".join(chunks)


async def _write_frame(writer: asyncio.StreamWriter, payload: bytes, opcode: int = 1) -> None:
    header = bytes([0x80 | opcode])
    length = len(payload)
    if length < 126:
        header += bytes([length])
    elif length < 65536:
        header += bytes([126]) + struct.pack("!H", length)
    else:
        header += bytes([127]) + struct.pack("!Q", length)
    writer.write(header + payload)
    await writer.drain()


async def _reply(writer: asyncio.StreamWriter, value: dict[str, Any]) -> None:
    await _write_frame(writer, json.dumps(value, separators=(",", ":"), ensure_ascii=False).encode())


async def handle(reader: asyncio.StreamReader, writer: asyncio.StreamWriter) -> None:
    session: KernelSession | None = None
    try:
        if not await _handshake(reader, writer):
            return
        while True:
            opcode, payload = await _read_message(reader)
            if opcode == 8:
                break
            if opcode == 9:
                await _write_frame(writer, payload, 10)
                continue
            if opcode != 1:
                continue
            message = json.loads(payload.decode())
            if not isinstance(message, dict):
                raise ValueError("message must be an object")
            request_id = message.get("requestId")
            if message.get("type") == "hello":
                await _reply(writer, {"type": "hello", "requestId": request_id, "protocol": PROTOCOL_VERSION, "backend": "python-list-cpu"})
            elif message.get("type") == "ingest":
                life = message.get("life")
                if not isinstance(life, dict):
                    raise ValueError("ingest.life must be an object")
                if session is None:
                    session = KernelSession(str(life.get("id", "")), int(life.get("seed", -1)))
                    existing = message.get("substrate")
                    if isinstance(existing, dict) and existing.get("identity") == session.identity:
                        session.substrate = existing
                        session.last_tick = int(existing.get("tick", -1))
                substrate = session.ingest(life)
                await _reply(writer, {"type": "substrate", "requestId": request_id, "protocol": PROTOCOL_VERSION, "substrate": substrate})
            else:
                await _reply(writer, {"type": "error", "requestId": request_id, "error": "unknown message type"})
    except (asyncio.IncompleteReadError, ConnectionResetError):
        pass
    except Exception as error:
        print(f"kernel client error: {type(error).__name__}: {error}", file=sys.stderr, flush=True)
        try:
            await _reply(writer, {"type": "error", "error": str(error)})
        except Exception:
            pass
    finally:
        writer.close()
        await writer.wait_closed()


async def main_async(host: str, port: int) -> None:
    server = await asyncio.start_server(handle, host, port)
    addresses = ", ".join(str(sock.getsockname()) for sock in server.sockets or [])
    print(f"Sentiogenesis Python kernel listening on {addresses}", flush=True)
    async with server:
        await server.serve_forever()


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=8765)
    args = parser.parse_args()
    asyncio.run(main_async(args.host, args.port))


if __name__ == "__main__":
    main()
