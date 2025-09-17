from typing import List
import asyncio
import json

from websockets.exceptions import ConnectionClosedOK, ConnectionClosedError
from websockets.sync.server import WebSocketServerProtocol

class TriggerInterface:
    def __init__(self):
        self.active_connections: List[WebSocketServerProtocol] = []

    async def connect(self, websocket: WebSocketServerProtocol):
        self.active_connections.append(websocket)
        try:
            await websocket.wait_closed()
        except (ConnectionClosedOK, ConnectionClosedError):
            pass
        finally:
            self.active_connections.remove(websocket)

    async def send_lyric_update(self, lyric_data: dict):
        message = json.dumps({"type": "lyric_update", "data": lyric_data})
        for connection in self.active_connections:
            try:
                await connection.send(message)
            except (ConnectionClosedOK, ConnectionClosedError):
                # Connection already closed, will be removed by connect method
                pass

    async def send_song_start(self, song_id: str, title: str, timecodes: List[dict]):
        message = json.dumps({"type": "song_start", "data": {"song_id": song_id, "title": title, "timecodes": timecodes}})
        for connection in self.active_connections:
            try:
                await connection.send(message)
            except (ConnectionClosedOK, ConnectionClosedError):
                pass

    async def send_message(self, message_type: str, data: dict):
        message = json.dumps({"type": message_type, "data": data})
        for connection in self.active_connections:
            try:
                await connection.send(message)
            except (ConnectionClosedOK, ConnectionClosedError):
                pass

trigger_interface = TriggerInterface()
