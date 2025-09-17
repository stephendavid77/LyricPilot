import asyncio
from typing import List, Dict

class LyricScheduler:
    def __init__(self, timecodes: List[Dict], lead_offset: float = 0.5):
        self.timecodes = sorted(timecodes, key=lambda x: x['time'])
        self.lead_offset = lead_offset
        self.current_lyric_index = -1

    def get_next_lyric(self, current_audio_time: float) -> Dict | None:
        """Predicts the next lyric line based on current audio time and lead offset."""
        for i in range(self.current_lyric_index + 1, len(self.timecodes)):
            lyric_entry = self.timecodes[i]
            if current_audio_time >= (lyric_entry['time'] - self.lead_offset):
                self.current_lyric_index = i
                return lyric_entry
        return None

    def reset(self):
        self.current_lyric_index = -1

# lyric_scheduler = LyricScheduler([]) # Instantiate with timecodes when a song starts
