import os
import shutil
import asyncio
from typing import List, Optional
from pathlib import Path
from uuid import uuid4

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Depends, HTTPException, UploadFile, File, Form
from fastapi.responses import HTMLResponse
from starlette.staticfiles import StaticFiles
from sqlalchemy.orm import Session

from .config import SONGS_DIR, UPLOAD_DIR
from .database import create_tables, get_db, add_song, get_song, list_songs, delete_song, update_song_processed_status, Song
from .song_loader import upload_and_process_song
from .timecode_generator import load_timecode_json, save_timecode_json, TimecodeData, TimecodeEntry
from .trigger_interface import trigger_interface
from .lyrics_text_parser import parse_plain_text_lyrics, generate_basic_timecodes_from_text

app = FastAPI()

# Mount static files (CSS, JS) from the frontend directory
app.mount("/static", StaticFiles(directory=os.path.join(Path(__file__).parent.parent, "frontend")), name="static")

# --- Startup Events ---
@app.on_event("startup")
def on_startup():
    create_tables()
    # Ensure SONGS_DIR and UPLOAD_DIR exist
    os.makedirs(SONGS_DIR, exist_ok=True)
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    preload_example_song()

def preload_example_song():
    db = next(get_db())
    example_song_id = "amazing_grace"
    if not get_song(db, example_song_id):
        print("Preloading example song: Amazing Grace")
        song_dir = os.path.join(SONGS_DIR, example_song_id)
        os.makedirs(song_dir, exist_ok=True)
        raw_files_dir = os.path.join(song_dir, "raw")
        os.makedirs(raw_files_dir, exist_ok=True)

        lyrics_content = """
Amazing Grace, how sweet the sound,
That saved a wretch like me.
I once was lost, but now am found,
Was blind, but now I see.

'Twas Grace that taught my heart to fear,
And Grace my fears relieved.
How precious did that Grace appear,
The hour I first believed.
"""
        lyrics_file_path = os.path.join(raw_files_dir, "amazing_grace.txt")
        with open(lyrics_file_path, "w", encoding="utf-8") as f:
            f.write(lyrics_content)

        # Generate timecodes for the example song
        lyrics_lines = parse_plain_text_lyrics(lyrics_content)
        # Assign some dummy timecodes for demonstration
        example_timecodes = [
            {"time": 0.0, "text": "Amazing Grace, how sweet the sound,"},
            {"time": 3.0, "text": "That saved a wretch like me."},
            {"time": 6.0, "text": "I once was lost, but now am found,"},
            {"time": 9.0, "text": "Was blind, but now I see."},
            {"time": 14.0, "text": "'Twas Grace that taught my heart to fear,"},
            {"time": 17.0, "text": "And Grace my fears relieved."},
            {"time": 20.0, "text": "How precious did that Grace appear,"},
            {"time": 23.0, "text": "The hour I first believed."},
        ]
        timecode_data = TimecodeData(timecodes=[TimecodeEntry(**tc) for tc in example_timecodes])
        save_timecode_json(timecode_json_path, timecode_data)

        add_song(
            db,
            song_id=example_song_id,
            title="Amazing Grace",
            file_path=lyrics_file_path,
            processed=True,
            timecode_path=timecode_json_path
        )
        db.close()

# --- HTML for Frontend ---
@app.get("/", response_class=HTMLResponse)
async def get_frontend():
    with open(os.path.join(Path(__file__).parent.parent, "frontend", "index.html"), "r") as f:
        return f.read()

# --- REST API Endpoints ---
@app.post("/songs", response_model=dict)
async def upload_song_endpoint(
    file: UploadFile = File(...),
    title: Optional[str] = Form(None),
    bpm: Optional[float] = Form(None),
    measures_per_section: Optional[int] = Form(None),
    beats_per_measure: Optional[int] = Form(None),
    db: Session = Depends(get_db)
):
    print(f"Received BPM in upload_song_endpoint: {bpm}") # Debug log
    print(f"Received Measures per Section in upload_song_endpoint: {measures_per_section}") # Debug log
    print(f"Received Beats per Measure in upload_song_endpoint: {beats_per_measure}") # Debug log
    try:
        song = await upload_and_process_song(db, file, title, bpm, measures_per_section, beats_per_measure)
        return {"message": "Song uploaded and processing initiated", "song_id": song.id, "title": song.title}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to upload song: {e}")

@app.get("/songs", response_model=List[dict])
async def list_all_songs(db: Session = Depends(get_db)):
    songs = list_songs(db)
    return [{
        "id": song.id,
        "title": song.title,
        "bpm": song.bpm,
        "processed": song.processed,
        "file_path": song.file_path,
        "timecode_path": song.timecode_path
    } for song in songs]

@app.get("/songs/{song_id}", response_model=dict)
async def get_song_details(song_id: str, db: Session = Depends(get_db)):
    song = get_song(db, song_id)
    if not song:
        raise HTTPException(status_code=404, detail="Song not found")

    timecodes = []
    if song.processed and song.timecode_path and os.path.exists(song.timecode_path):
        timecode_data = load_timecode_json(song.timecode_path)
        timecodes = [tc.model_dump() for tc in timecode_data.timecodes]

    return {
        "id": song.id,
        "title": song.title,
        "bpm": song.bpm,
        "processed": song.processed,
        "file_path": song.file_path,
        "timecode_path": song.timecode_path,
        "timecodes": timecodes
    }

@app.delete("/songs/{song_id}", response_model=dict)
async def delete_song_endpoint(song_id: str, db: Session = Depends(get_db)):
    song = delete_song(db, song_id)
    if not song:
        raise HTTPException(status_code=404, detail="Song not found")

    # Optionally, remove song files from disk
    song_dir = os.path.join(SONGS_DIR, song_id)
    if os.path.exists(song_dir):
        shutil.rmtree(song_dir)

    return {"message": f"Song {song_id} deleted successfully"}

# --- WebSocket Endpoint ---
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    trigger_interface.active_connections.append(websocket)
    try:
        while True:
            # Keep connection alive, or handle incoming messages if any
            # For now, we just wait for disconnect
            await asyncio.sleep(0.1) # Keep connection alive, non-blocking
    except WebSocketDisconnect:
        print("WebSocket disconnected")
    except Exception as e:
        print(f"WebSocket error: {e}")
    finally:
        if websocket in trigger_interface.active_connections:
            trigger_interface.active_connections.remove(websocket)

# --- Live Lyric Trigger (for testing/manual control) ---
@app.post("/trigger_lyric/{song_id}")
async def trigger_lyric(song_id: str, current_time: float, db: Session = Depends(get_db)):
    song = get_song(db, song_id)
    if not song or not song.processed or not song.timecode_path:
        raise HTTPException(status_code=404, detail="Song not found or not processed")

    timecode_data = load_timecode_json(song.timecode_path)
    # This is a simplified trigger. In a real scenario, lyric_scheduler would be used.
    current_lyric = None
    next_lyrics = []

    # Find current and next lyrics based on current_time
    for i, tc in enumerate(timecode_data.timecodes):
        if tc.time <= current_time:
            current_lyric = tc.text
        else:
            next_lyrics.append(tc.text)
            if len(next_lyrics) >= 3: # Show up to 3 upcoming lines
                break

    await trigger_interface.send_message("lyric_update", {
        "current_lyric": current_lyric,
        "next_lyrics": next_lyrics
    })
    return {"message": "Lyric triggered", "current_lyric": current_lyric, "next_lyrics": next_lyrics}

async def _send_song_start_to_clients(song_id: str, db: Session):
    song = get_song(db, song_id)
    if not song or not song.processed or not song.timecode_path:
        print(f"Warning: Song {song_id} not found or not processed for playback.")
        return

    timecode_data = load_timecode_json(song.timecode_path)
    await trigger_interface.send_song_start(song.id, song.title, [tc.model_dump() for tc in timecode_data.timecodes])

@app.post("/start_song_playback/{song_id}")
async def start_song_playback_endpoint(song_id: str, db: Session = Depends(get_db)):
    await _send_song_start_to_clients(song_id, db)
    return {"message": f"Playback started for {song_id}"}

@app.post("/play_song/{song_id}", response_model=dict)
async def play_song_endpoint(song_id: str, db: Session = Depends(get_db)):
    song = get_song(db, song_id)
    if not song:
        raise HTTPException(status_code=404, detail="Song not found")
    if not song.processed or not song.timecode_path:
        raise HTTPException(status_code=400, detail="Song not processed for playback")

    await _send_song_start_to_clients(song_id, db)
    return {"message": f"Initiated playback for song ID: {song_id}"}