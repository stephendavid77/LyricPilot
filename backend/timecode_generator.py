import json
from typing import List
from pydantic import BaseModel

class TimecodeEntry(BaseModel):
    time: float  # Time in seconds
    text: str    # Lyric line

class TimecodeData(BaseModel):
    timecodes: List[TimecodeEntry]

def save_timecode_json(file_path: str, timecode_data: TimecodeData):
    with open(file_path, 'w', encoding='utf-8') as f:
        json.dump(timecode_data.model_dump(), f, ensure_ascii=False, indent=4)

def load_timecode_json(file_path: str) -> TimecodeData:
    with open(file_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    return TimecodeData(**data)
