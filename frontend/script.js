const currentLyricElement = document.getElementById('current-lyric');
const nextLyricElements = [
    document.querySelector('.next-1'),
    document.querySelector('.next-2'),
    document.querySelector('.next-3'),
];

const songListElement = document.getElementById('song-list');
const uploadForm = document.getElementById('upload-form');
const uploadStatus = document.getElementById('upload-status');

const websocket = new WebSocket("ws://localhost:8000/ws"); // Adjust if your backend is on a different host/port

let currentSongTimecodes = [];
let currentLyricIndex = -1;
let playbackStartTime = 0;
let animationFrameId = null;

// --- WebSocket Logic ---
websocket.onopen = (event) => {
    console.log("WebSocket connected!");
};

websocket.onmessage = (event) => {
    try {
        const message = JSON.parse(event.data);
        console.log("Received message:", message);

        if (message.type === "lyric_update") {
            const { current_lyric, next_lyrics } = message.data;
            updateLyrics(current_lyric, next_lyrics);
        } else if (message.type === "song_start") {
            const { song_id, title, timecodes } = message.data;
            console.log(`Starting song: ${title} (${song_id})`);
            currentSongTimecodes = timecodes.sort((a, b) => a.time - b.time);
            currentLyricIndex = -1;
            playbackStartTime = performance.now(); // Start client-side timer
            if (animationFrameId) {
                cancelAnimationFrame(animationFrameId);
            }
            animationFrameId = requestAnimationFrame(updateLyricDisplay);
        }
    } catch (error) {
        console.error("Error in WebSocket onmessage:", error);
    }
};

websocket.onclose = (event) => {
    console.log("WebSocket disconnected.", event);
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
    }
};

websocket.onerror = (error) => {
    console.error("WebSocket error:", error);
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
    }
};

// --- Lyric Display Logic ---
function updateLyrics(currentLyric, nextLyrics) {
    currentLyricElement.textContent = currentLyric || '';

    nextLyricElements.forEach((element, index) => {
        element.textContent = nextLyrics[index] || '';
    });
}

function updateLyricDisplay(currentTime) {
    try {
        const elapsedSeconds = (currentTime - playbackStartTime) / 1000;

        let newLyricFound = false;
        for (let i = currentLyricIndex + 1; i < currentSongTimecodes.length; i++) {
            if (elapsedSeconds >= currentSongTimecodes[i].time) {
                currentLyricIndex = i;
                newLyricFound = true;
            } else {
                break; // Timecodes are sorted, so no need to check further
            }
        }

        if (newLyricFound) {
            const currentLyric = currentSongTimecodes[currentLyricIndex] ? currentSongTimecodes[currentLyricIndex].text : '';
            const nextLyrics = [];
            for (let i = 1; i <= 3; i++) {
                if (currentLyricIndex + i < currentSongTimecodes.length) {
                    nextLyrics.push(currentSongTimecodes[currentLyricIndex + i].text);
                } else {
                    nextLyrics.push(''); // Fill with empty if no more lyrics
                }
            }
            updateLyrics(currentLyric, nextLyrics);
        }

        // Continue animation if there are still lyrics to display
        if (currentLyricIndex < currentSongTimecodes.length - 1) {
            animationFrameId = requestAnimationFrame(updateLyricDisplay);
        } else if (currentLyricIndex === currentSongTimecodes.length - 1 && !newLyricFound) {
            // If we are at the last lyric and it has been displayed, stop the animation
            cancelAnimationFrame(animationFrameId);
            animationFrameId = null;
        }
    } catch (error) {
        console.error("Error in updateLyricDisplay:", error);
        if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
        }
    }
}

// --- Song Management Logic ---
async function fetchSongs() {
    try {
        const response = await fetch('/songs');
        const songs = await response.json();
        displaySongs(songs);
    } catch (error) {
        console.error("Error fetching songs:", error);
    }
}

function displaySongs(songs) {
    songListElement.innerHTML = ''; // Clear existing list
    if (songs.length === 0) {
        songListElement.innerHTML = '<li>No songs uploaded yet.</li>';
        return;
    }

    songs.forEach(song => {
        const listItem = document.createElement('li');
        listItem.innerHTML = `
            <span>${song.title} (ID: ${song.id})</span>
            <button data-song-id="${song.id}" class="play-button">Play</button>
        `;
        songListElement.appendChild(listItem);
    });

    // Add event listeners to play buttons
    document.querySelectorAll('.play-button').forEach(button => {
        button.addEventListener('click', async (event) => {
            const songId = event.target.dataset.songId;
            await playSong(songId);
        });
    });
}

async function playSong(songId) {
    try {
        const response = await fetch(`/play_song/${songId}`, {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
            },
        });
        const result = await response.json();
        if (response.ok) {
            console.log(result.message);
            // The song_start message will come via WebSocket
        } else {
            console.error("Error playing song:", result.detail);
        }
    } catch (error) {
        console.error("Error playing song:", error);
    }
}

uploadForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    uploadStatus.textContent = 'Uploading...';

    const fileInput = document.getElementById('song-file');
    const titleInput = document.getElementById('song-title');

    const formData = new FormData();
    formData.append('file', fileInput.files[0]);
    if (titleInput.value) {
        formData.append('title', titleInput.value);
    }

    try {
        const response = await fetch('/songs', {
            method: 'POST',
            body: formData,
        });
        const result = await response.json();

        if (response.ok) {
            uploadStatus.textContent = `Upload successful: ${result.title} (ID: ${result.song_id})`;
            fileInput.value = ''; // Clear file input
            titleInput.value = ''; // Clear title input
            fetchSongs(); // Refresh song list
        } else {
            uploadStatus.textContent = `Upload failed: ${result.detail || response.statusText}`;
            console.error("Upload error:", result);
        }
    } catch (error) {
        uploadStatus.textContent = `Upload failed: ${error.message}`;
        console.error("Upload error:", error);
    }
});

// Initial fetch of songs when the page loads
document.addEventListener('DOMContentLoaded', fetchSongs);