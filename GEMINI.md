# LyricPilot Project: Gemini Agent Directives

This `GEMINI.md` file serves as the internal knowledge base and operational directives for the Gemini agent when working on the LyricPilot project. It complements the global `~/.gemini/GEMINI.md` by providing project-specific context.

## 1. Project Purpose

To develop a modular, real-time lyrics display system capable of synchronizing lyrics with various music sources (audio, MIDI, MusicXML, text) and displaying them on a web-based frontend, with an extensible architecture for stage system integration.

## 2. Key Technologies & Libraries

-   **Backend Framework:** FastAPI (Python)
-   **WebSockets:** `websockets` library (underlying FastAPI's WebSocket implementation)
-   **Database:** SQLite (via SQLAlchemy ORM)
-   **File Handling:** `python-multipart`
-   **Asynchronous Operations:** `asyncio`
-   **Frontend:** HTML, CSS, JavaScript
-   **Placeholder Libraries (for future integration):** `librosa`, `mido`, `music21`, `sounddevice`, `pyaudio`

## 3. Architectural Decisions

-   **Modular Backend:** Each core functionality (audio processing, MIDI parsing, song management, etc.) is encapsulated in its own Python module for maintainability and extensibility.
-   **FastAPI:** Chosen for its high performance, ease of use for building APIs, and native support for WebSockets and asynchronous operations.
-   **SQLite:** Selected for its simplicity and file-based nature, suitable for a prototype and local development without requiring a separate database server.
-   **WebSockets for Real-time:** Essential for pushing lyric updates from the backend to the frontend in real-time.
-   **Standard `timecode.json`:** A unified format for storing lyric timing data, ensuring interoperability between different processing modules.

## 4. Module Responsibilities

-   `backend/config.py`: Global configuration and constants.
-   `backend/database.py`: SQLAlchemy models and CRUD operations for song metadata.
-   `backend/timecode_generator.py`: Defines `TimecodeEntry` and handles saving/loading `timecode.json` files.
-   `backend/lyrics_text_parser.py`: Parses plain text lyrics and generates basic timecodes.
-   `backend/song_loader.py`: Handles file uploads, type detection, and delegates to appropriate processing modules.
-   `backend/audio_aligner.py`: Placeholder for audio processing (e.g., `librosa`).
-   `backend/midi_aligner.py`: Placeholder for MIDI parsing (e.g., `mido`, `music21`).
-   `backend/musicxml_parser.py`: Placeholder for MusicXML parsing (e.g., `music21`).
-   `backend/trigger_interface.py`: Manages active WebSocket connections and sends messages to clients.
-   `backend/audio_input.py`: Placeholder for live microphone input.
-   `backend/beat_detector.py`: Placeholder for real-time beat detection.
-   `backend/lyric_scheduler.py`: Placeholder for predicting next lyric based on timecodes.
-   `backend/main.py`: FastAPI application entry point, defines API endpoints (REST and WebSocket), and handles startup/shutdown.

## 5. Data Storage Structure

-   `data/lyrics.db`: SQLite database file for song metadata.
-   `data/songs/<song_id>/`: Directory for each song.
    -   `data/songs/<song_id>/raw/`: Stores the original uploaded song file(s).
    -   `data/songs/<song_id>/timecode.json`: Stores the generated timecode data for the song.

## 6. Project-Specific Conventions

-   **`timecode.json` Format:** An array of objects, each with `time` (float, seconds) and `text` (string).
-   **Song ID:** A UUID string used as a unique identifier for each song and its directory.
-   **Frontend Static Files:** Served from the `frontend/` directory via FastAPI's `StaticFiles` mount at `/static`.
-   **Script for Running:** `scripts/start_app.sh` is the single entry point for setup and running the application.

## 7. Known Limitations & Future Work (as of last update)

-   **Processing Modules are Placeholders:** `audio_aligner.py`, `midi_aligner.py`, `musicxml_parser.py`, `audio_input.py`, `beat_detector.py`, `lyric_scheduler.py` currently contain only basic or dummy implementations. Full integration of libraries like `librosa`, `mido`, `music21`, `sounddevice`, `pyaudio` is pending.
-   **Manual Alignment:** No UI for manual lyric alignment is implemented.
-   **ProPresenter/OSC/MIDI:** Integration with external stage systems is planned but not yet implemented.
-   **Error Handling:** While basic error handling is present, more robust error reporting and user feedback mechanisms could be added.
-   **Frontend Features:** The frontend is minimal; features like song selection UI, playback controls, and advanced styling are future work.
