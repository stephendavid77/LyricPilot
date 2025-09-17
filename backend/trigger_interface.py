from typing import List
import asyncio
import json

from websockets.exceptions import ConnectionClosedOK, ConnectionClosedError
from fastapi import WebSocket

class TriggerInterface:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        self.active_connections.append(websocket)
        print(f"WebSocket connected: {websocket.client}")
        try:
            await websocket.wait_closed()
        except (ConnectionClosedOK, ConnectionClosedError):
            pass
        finally:
            self.active_connections.remove(websocket)
            print(f"WebSocket disconnected: {websocket.client}")

    async def send_lyric_update(self, lyric_data: dict):
        message_dict = {"type": "lyric_update", "data": lyric_data}
        print(f"Sending lyric update to {len(self.active_connections)} connections.")
        for connection in self.active_connections:
            try:
                await connection.send_json(message_dict)
            except (ConnectionClosedOK, ConnectionClosedError):
                print(f"Failed to send to {connection.client}, connection closed.")
                pass

    async def send_song_start(self, song_id: str, title: str, timecodes: List[dict]):
        message_dict = {"type": "song_start", "data": {"song_id": song_id, "title": title, "timecodes": timecodes}}
        print(f"Sending song_start for {title} to {len(self.active_connections)} connections.")
        for connection in self.active_connections:
            try:
                await connection.send_json(message_dict)
            except (ConnectionClosedOK, ConnectionClosedError):
                print(f"Failed to send to {connection.client}, connection closed.")
                pass

    async def send_message(self, message_type: str, data: dict):
        message_dict = {"type": message_type, "data": data}
        print(f"Sending generic message '{message_type}' to {len(self.active_connections)} connections.")
        for connection in self.active_connections:
            try:
                await connection.send_json(message_dict)
            except (ConnectionClosedOK, ConnectionClosedError):
                print(f"Failed to send to {connection.client}, connection closed.")
                pass

trigger_interface = TriggerInterface()