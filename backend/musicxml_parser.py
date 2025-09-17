from music21 import converter, stream, note, text
from .timecode_generator import TimecodeData, TimecodeEntry
from typing import List

def parse_musicxml(file_path: str) -> TimecodeData:
    """Parses a MusicXML file and extracts time-aligned lyrics.

    Args:
        file_path: The path to the MusicXML file.

    Returns:
        TimecodeData: An object containing time-aligned lyric entries.
    Raises:
        Exception: If parsing or lyric extraction fails.
    """
    try:
        score = converter.parse(file_path)
        timecodes: List[TimecodeEntry] = []

        # Iterate through all parts in the score
        for part in score.parts:
            # Flatten the part to get all notes and rests in sequence
            # This handles measures and voices correctly for time offsets
            for element in part.flat.notesAndRests:
                if isinstance(element, note.Note):
                    # Check for lyrics associated with the note
                    if element.lyrics:
                        # music21 can have multiple lyric objects per note
                        # We'll concatenate them or take the first one
                        lyric_text = " ".join([ly.text for ly in element.lyrics])
                        timecodes.append(TimecodeEntry(time=element.offset, text=lyric_text))

        # Sort timecodes by time, as flat.notesAndRests might not always be perfectly ordered
        timecodes.sort(key=lambda x: x.time)

        # Optional: Merge consecutive lyrics if they have the same timestamp (e.g., from chords)
        # For simplicity, we'll keep them separate for now, but this could be a refinement.

        return TimecodeData(timecodes=timecodes)
    except Exception as e:
        raise Exception(f"Failed to parse MusicXML file {file_path}: {e}")