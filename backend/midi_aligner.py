from music21 import converter, stream, note, chord, tempo
from .timecode_generator import TimecodeData, TimecodeEntry
from typing import List
import traceback

def process_midi_file(file_path: str) -> TimecodeData:
    """Parses a MIDI file and extracts timecodes for note/rest onsets.

    Args:
        file_path: The path to the MIDI file.

    Returns:
        TimecodeData: An object containing time-aligned entries for notes/rests.
    Raises:
        Exception: If parsing fails.
    """
    try:
        score = converter.parse(file_path)
        timecodes: List[TimecodeEntry] = []

        # Flatten the score to get all notes and rests in sequence
        # This handles multiple tracks/parts and measures correctly for time offsets
        for element in score.flat.notesAndRests:
            if isinstance(element, note.Note):
                text_content = f"Note: {element.nameWithOctave}"
            elif isinstance(element, chord.Chord):
                text_content = f"Chord: {element.root().nameWithOctave}"
            elif isinstance(element, note.Rest):
                text_content = "Rest"
            else:
                continue # Skip other elements

            timecodes.append(TimecodeEntry(time=element.offset, text=text_content))

        # Sort timecodes by time, as flat.notesAndRests might not always be perfectly ordered
        timecodes.sort(key=lambda x: x.time)

        return TimecodeData(timecodes=timecodes)
    except Exception as e:
        print(f"Error during MIDI processing for {file_path}:")
        traceback.print_exc() # Print the full traceback
        raise Exception(f"Failed to process MIDI file {file_path}: {e}")
