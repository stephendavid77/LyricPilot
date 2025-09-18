import os
import shutil
from typing import Optional
from pathlib import Path
from uuid import uuid4
import traceback

from fastapi import UploadFile

from .config import SONGS_DIR, UPLOAD_DIR
from .database import add_song, update_song_processed_status
from .lyrics_text_parser import parse_plain_text_lyrics, generate_basic_timecodes_from_text
from .timecode_generator import save_timecode_json
from .musicxml_parser import parse_musicxml
from .midi_aligner import process_midi_file
from .pdf_parser import extract_text_from_pdf, parse_song_structure
from .structure_timecode_generator import generate_timecodes_from_structure

# Placeholder imports for other aligners/parsers
# from .audio_aligner import process_audio_file

async def upload_and_process_song(db, file: UploadFile, title: Optional[str] = None, bpm: Optional[float] = None, measures_per_section: Optional[int] = None, beats_per_measure: Optional[int] = None):
    print(f"Received BPM in upload_and_process_song: {bpm}") # Debug log
    print(f"Received Measures per Section in upload_and_process_song: {measures_per_section}") # Debug log
    print(f"Received Beats per Measure in upload_and_process_song: {beats_per_measure}") # Debug log
    song_id = str(uuid4())
    if not title:
        title = Path(file.filename).stem.replace('_', ' ').title()

    # Create song-specific directory
    song_dir = os.path.join(SONGS_DIR, song_id)
    os.makedirs(song_dir, exist_ok=True)
    raw_files_dir = os.path.join(song_dir, "raw")
    os.makedirs(raw_files_dir, exist_ok=True)

    # Save the uploaded file first
    file_extension = Path(file.filename).suffix.lower()
    print(f"File name: {file.filename}")
    print(f"Detected file extension: {file_extension}")
    saved_file_path = os.path.join(raw_files_dir, file.filename)
    with open(saved_file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # Add initial song entry to DB
    db_song = add_song(db, song_id=song_id, title=title, file_path=saved_file_path, processed=False)

    timecode_path = os.path.join(song_dir, "timecode.json")
    processed = False

    try:
        # Determine file type and process from the saved file
        if file_extension in ['.mp3', '.wav']:
            # Placeholder for audio processing
            # timecode_data = process_audio_file(saved_file_path)
            # save_timecode_json(timecode_path, timecode_data)
            # processed = True
            print(f"Audio file {file.filename} uploaded. Audio processing is a placeholder.")
            # For now, generate basic timecodes from a dummy lyrics file if available
            dummy_lyrics_path = os.path.join(raw_files_dir, f"{Path(file.filename).stem}.txt")
            if os.path.exists(dummy_lyrics_path):
                with open(dummy_lyrics_path, 'r', encoding='utf-8') as f:
                    lyrics_text = f.read()
                lyrics_lines = parse_plain_text_lyrics(lyrics_text)
                timecode_data = generate_basic_timecodes_from_text(lyrics_lines, total_duration=180.0) # Assume 3 min duration
                save_timecode_json(timecode_path, timecode_data)
                processed = True
            else:
                print("No dummy lyrics file found for audio. Song not fully processed.")

        elif file_extension in ['.mid', '.midi']:
            print(f"MIDI file {file.filename} uploaded. Processing...")
            timecode_data = process_midi_file(saved_file_path)
            save_timecode_json(timecode_path, timecode_data)
            processed = True

        elif file_extension in ['.xml', '.musicxml']:
            print(f"MusicXML file {file.filename} uploaded. Processing...")
            timecode_data = parse_musicxml(saved_file_path)
            save_timecode_json(timecode_path, timecode_data)
            processed = True

        elif file_extension == '.txt':
            with open(saved_file_path, 'r', encoding='utf-8') as f:
                lyrics_text = f.read()
            lyrics_lines = parse_plain_text_lyrics(lyrics_text)
            timecode_data = generate_basic_timecodes_from_text(lyrics_lines)
            save_timecode_json(timecode_path, timecode_data)
            processed = True
            print(f"Plain text lyrics file {file.filename} uploaded and processed.")

        elif file_extension == '.pdf':
            print(f"PDF file {file.filename} uploaded. Processing...")
            if bpm is None:
                raise ValueError("BPM is required for PDF song chart processing.")
            
            pdf_text = extract_text_from_pdf(saved_file_path)
            song_structure = parse_song_structure(pdf_text)
            timecode_data = generate_timecodes_from_structure(song_structure, bpm, measures_per_section, beats_per_measure)
            save_timecode_json(timecode_path, timecode_data)
            processed = True

        else:
            print(f"Unsupported file type: {file_extension}. Song not processed for timecodes.")

    except Exception as e:
        print(f"[Song Loader] Error processing file {file.filename}: {e}")
        traceback.print_exc() # Print full traceback
        # Clean up partially created song directory if processing fails
        if os.path.exists(song_dir):
            shutil.rmtree(song_dir)
        # Delete song entry from DB if processing failed
        db.delete(db_song)
        db.commit()
        raise Exception(f"Failed to process uploaded file: {e}")

    # Update song status in DB
    update_song_processed_status(db, song_id, processed, timecode_path if processed else None)

    return db_song