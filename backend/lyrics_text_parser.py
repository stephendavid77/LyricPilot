from typing import List
from .timecode_generator import TimecodeEntry, TimecodeData

def parse_plain_text_lyrics(text_content: str) -> List[str]:
    """Parses plain text lyrics into a list of lines."""
    return [line.strip() for line in text_content.split('\n') if line.strip()]

def generate_basic_timecodes_from_text(lyrics_lines: List[str], total_duration: float = None) -> TimecodeData:
    """Generates basic timecodes for plain text lyrics.
    If total_duration is provided, lines are evenly spaced. Otherwise, they are sequential with 0.0s start.
    """
    timecodes = []
    num_lines = len(lyrics_lines)

    if total_duration and num_lines > 0:
        # Distribute lines evenly over the total duration
        interval = total_duration / num_lines
        for i, line in enumerate(lyrics_lines):
            timecodes.append(TimecodeEntry(time=i * interval, text=line))
    else:
        # Assign 0.0s to each line, implying manual alignment or sequential display
        for line in lyrics_lines:
            timecodes.append(TimecodeEntry(time=0.0, text=line))

    return TimecodeData(timecodes=timecodes)

