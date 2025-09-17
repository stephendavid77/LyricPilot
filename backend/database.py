from sqlalchemy import create_engine, Column, Integer, String, Boolean
from sqlalchemy.orm import sessionmaker, declarative_base
from .config import DATABASE_URL

Base = declarative_base()

class Song(Base):
    __tablename__ = "songs"

    id = Column(String, primary_key=True, index=True)
    title = Column(String, index=True)
    bpm = Column(Integer, nullable=True)
    file_path = Column(String)
    processed = Column(Boolean, default=False)
    timecode_path = Column(String, nullable=True)

    def __repr__(self):
        return f"<Song(id='{self.id}', title='{self.title}', bpm={self.bpm})>"

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def create_tables():
    Base.metadata.create_all(bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# CRUD operations
def add_song(db, song_id: str, title: str, file_path: str, bpm: int = None, processed: bool = False, timecode_path: str = None):
    db_song = Song(id=song_id, title=title, file_path=file_path, bpm=bpm, processed=processed, timecode_path=timecode_path)
    db.add(db_song)
    db.commit()
    db.refresh(db_song)
    return db_song

def get_song(db, song_id: str):
    return db.query(Song).filter(Song.id == song_id).first()

def list_songs(db, skip: int = 0, limit: int = 100):
    return db.query(Song).offset(skip).limit(limit).all()

def delete_song(db, song_id: str):
    db_song = db.query(Song).filter(Song.id == song_id).first()
    if db_song:
        db.delete(db_song)
        db.commit()
    return db_song

def update_song_processed_status(db, song_id: str, processed: bool, timecode_path: str = None):
    db_song = db.query(Song).filter(Song.id == song_id).first()
    if db_song:
        db_song.processed = processed
        if timecode_path:
            db_song.timecode_path = timecode_path
        db.commit()
        db.refresh(db_song)
    return db_song
