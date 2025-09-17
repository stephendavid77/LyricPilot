import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATABASE_URL = f"sqlite:///{os.path.join(BASE_DIR, '../data/lyrics.db')}"
SONGS_DIR = os.path.join(BASE_DIR, '../data/songs')
UPLOAD_DIR = os.path.join(BASE_DIR, '../data/uploads') # Temporary upload directory

# Ensure directories exist
os.makedirs(SONGS_DIR, exist_ok=True)
os.makedirs(UPLOAD_DIR, exist_ok=True)
