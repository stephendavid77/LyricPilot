# LyricPilot: Real-time Lyrics Display System

LyricPilot is a modular Python project designed for real-time display of lyrics, synchronized with various music sources. It features a FastAPI backend, a simple web frontend, and a flexible architecture for future expansion.

## Functionality Overview

-   **Song Upload & Preprocessing:** Supports uploading audio (MP3/WAV), MIDI, MusicXML, or plain text lyrics. Automatically detects file type and initiates processing to generate a standard `timecode.json` for each song.
-   **Real-Time Display:** A browser-based frontend displays current and upcoming lyric lines, updating in real-time via WebSockets.
-   **Song Management:** A REST API allows listing, fetching, uploading, and deleting songs, with metadata stored in an SQLite database.
-   **Extendable Trigger Interface:** Designed to easily send lyric events to the web frontend and can be extended for other stage systems (e.g., ProPresenter via OSC/MIDI).

## Architecture

-   **Backend (Python/FastAPI):** Modular components handle file uploads, parsing, timecode generation, and WebSocket communication.
-   **Frontend (HTML/JS):** A simple web page connects to the backend via WebSocket to display lyrics.
-   **Data Storage:** SQLite database for song metadata; song files and `timecode.json` stored in `data/songs/`.

## Setup and Running the Application

To get LyricPilot up and running, follow these steps:

1.  **Navigate to the project root directory** in your terminal.

2.  **Run the setup and start script:**
    This single script will set up your Python virtual environment, install all dependencies, start the FastAPI backend, and open the frontend in your default web browser.
    ```bash
    ./scripts/start_app.sh
    ```
    *   **Note:** If port `8000` is already in use, the script will attempt to kill the conflicting process. Be aware that this might disrupt other applications.

3.  **Access the Frontend:** Once the script runs, your browser should automatically open to `http://localhost:8000/`.

## How to Configure (Upload) a New Song

Use `curl` to upload your song files to the backend.

1.  **Prepare your song file:** Have your audio (MP3/WAV), MIDI, MusicXML, or plain text lyrics (`.txt`) file ready.

2.  **Open a new terminal window.** Ensure your backend is running (`./scripts/start_app.sh`).

3.  **Use `curl` to upload your file:**

    *   **For a plain text lyrics file (e.g., `my_lyrics.txt`):**
        ```bash
        curl -X POST "http://localhost:8000/songs" \
             -H "accept: application/json" \
             -H "Content-Type: multipart/form-data" \
             -F "file=@/path/to/your/my_lyrics.txt;type=text/plain" \
             -F "title=My New Song Title"
        ```
        *   Replace `/path/to/your/my_lyrics.txt` with the actual absolute path to your `.txt` file.
        *   Replace `My New Song Title` with the desired title for your song.

    *   **For other file types (e.g., `my_audio.mp3`):**
        ```bash
        curl -X POST "http://localhost:8000/songs" \
             -H "accept: application/json" \
             -H "Content-Type: multipart/form-data" \
             -F "file=@/path/to/your/my_audio.mp3;type=audio/mpeg" \
             -F "title=My Audio Song"
        ```
        *   Adjust the `type` parameter for other formats: WAV: `type=audio/wav`, MIDI: `type=audio/midi`, MusicXML: `type=application/xml`.
        *   Replace `My Audio Song` with the desired title.

4.  **Note down the `song_id`** from the server's JSON response. You will need this to play the song.

## How to Choose Which Song's Lyrics are Displayed

Use the new `/play_song/{song_id}` endpoint to tell the backend which song to display.

1.  **Ensure your backend is running** (`./scripts/start_app.sh`).
2.  **Open your browser** to `http://localhost:8000/`.
3.  **Get the `song_id` of the song you want to play:**
    *   If you just uploaded a song, use the `song_id` you noted down.
    *   To list all available songs and their IDs, open a new terminal and run:
        ```bash
        curl -X GET "http://localhost:8000/songs" -H "accept: application/json"
        ```
        Look for the `id` field in the JSON response for the song you want (e.g., `"amazing_grace"` for the preloaded song).

4.  **Use `curl` to tell the backend to play the song:**
    *   Open a new terminal window.
    *   Execute the following command, replacing `<YOUR_SONG_ID>` with the actual ID of the song you want to display:
        ```bash
        curl -X POST "http://localhost:8000/play_song/<YOUR_SONG_ID>" \
             -H "accept: application/json"
        ```

5.  **Observe the frontend:** The lyrics for the chosen song should now start appearing and scrolling on your browser page.

## Future Enhancements

-   **ProPresenter Integration:** Extend `trigger_interface.py` to send triggers via OSC or MIDI.
-   **Robust Aligners:** Implement full `librosa`, `mido`, and `music21` integration in the placeholder modules for accurate timecode generation.
-   **Manual Alignment Interface:** Develop a UI for manual or semi-automatic lyric alignment for plain text files.
-   **Real-time Audio Input:** Implement `sounddevice` or `pyaudio` for live microphone input and real-time beat detection.

## Technologies Used

-   **Backend:** Python, FastAPI, SQLAlchemy (SQLite), WebSockets
-   **Frontend:** HTML, CSS, JavaScript
-   **Potential Libraries:** `librosa`, `mido`, `music21`, `sounddevice`, `pyaudio`