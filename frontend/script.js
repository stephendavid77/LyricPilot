const currentLyricElement = document.getElementById('current-lyric');
const nextLyricElements = [
    document.querySelector('.next-1'),
    document.querySelector('.next-2'),
    document.querySelector('.next-3'),
];

// Declare variables at a higher scope
let songListElement;
let uploadForm;
let uploadStatus;
let youtubeForm;
let youtubeStatus;
let playPauseButton;

// Progress bar elements
let progressBar;
let currentTimeDisplay;
let totalDurationDisplay;

const websocket = new WebSocket("ws://localhost:8000/ws"); // Adjust if your backend is on a different host/port

let currentSongTimecodes = [];
let currentLyricIndex = -1;
let playbackStartTime = 0;
let animationFrameId = null;
let isPlaying = true; // New state variable
let lastFrameTime = 0; // To calculate elapsed time during pause/resume
let totalSongDuration = 0; // Total duration of the current song

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
            
            // Calculate total song duration
            totalSongDuration = currentSongTimecodes.length > 0 ? currentSongTimecodes[currentSongTimecodes.length - 1].time : 0;
            // Add a buffer to total duration if needed, or assume last timecode is end
            if (currentSongTimecodes.length > 0) {
                // Estimate duration of the last line and add it
                const lastLyricTime = currentSongTimecodes[currentSongTimecodes.length - 1].time;
                const secondLastLyricTime = currentSongTimecodes.length > 1 ? currentSongTimecodes[currentSongTimecodes.length - 2].time : 0;
                const estimatedLastLineDuration = lastLyricTime - secondLastLyricTime; // Simple estimate
                totalSongDuration = lastLyricTime + estimatedLastLineDuration; // Add estimated duration of last line
            }

            // Initialize progress bar
            progressBar.max = totalSongDuration;
            totalDurationDisplay.textContent = formatTime(totalSongDuration);

            // Reset playback state and start/resume
            isPlaying = true;
            playPauseButton.textContent = 'Pause';
            playbackStartTime = performance.now(); // Reset start time for new song
            lastFrameTime = playbackStartTime;

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
    console.log("Updating lyrics:", currentLyric, currentLyricElement); // Debug log
    currentLyricElement.textContent = currentLyric || '';

    nextLyricElements.forEach((element, index) => {
        element.textContent = nextLyrics[index] || '';
    });
}

function updateLyricDisplay(currentTime) {
    if (!isPlaying) {
        // If paused, just update lastFrameTime and request next frame to check for resume
        lastFrameTime = currentTime;
        animationFrameId = requestAnimationFrame(updateLyricDisplay);
        return;
    }

    // Calculate time elapsed since the song started, accounting for pauses
    const elapsedSeconds = (currentTime - playbackStartTime) / 1000;
    
    // Update lastFrameTime for the next frame
    lastFrameTime = currentTime;

    try {
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
                }
            }
            updateLyrics(currentLyric, nextLyrics);
        }

        // Update progress bar
        updateProgressBar(elapsedSeconds);

        // Continue animation if playing and there are still lyrics to display
        if (isPlaying && elapsedSeconds < totalSongDuration) { // Continue until total duration
            animationFrameId = requestAnimationFrame(updateLyricDisplay);
        } else if (elapsedSeconds >= totalSongDuration) { // End of song
            cancelAnimationFrame(animationFrameId);
            animationFrameId = null;
            isPlaying = false; // Automatically pause at the end
            playPauseButton.textContent = 'Play';
            updateProgressBar(totalSongDuration); // Set to end
        }
    } catch (error) {
        console.error("Error in updateLyricDisplay:", error);
        if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
        }
    }
}

// --- Progress Bar Logic ---
function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    const paddedMinutes = String(minutes).padStart(2, '0');
    const paddedSeconds = String(remainingSeconds).padStart(2, '0');
    return `${paddedMinutes}:${paddedSeconds}`;
}

function updateProgressBar(elapsedSeconds) {
    progressBar.value = elapsedSeconds;
    currentTimeDisplay.textContent = formatTime(elapsedSeconds);
}

function seekToTime(newTimeSeconds) {
    // Stop current animation
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
    }

    // Adjust playbackStartTime to simulate starting from newTimeSeconds
    playbackStartTime = performance.now() - (newTimeSeconds * 1000);
    lastFrameTime = performance.now(); // Reset lastFrameTime for accurate delta calculation

    // Find the correct lyric index for the new time
    currentLyricIndex = -1; // Reset to re-find from beginning
    for (let i = 0; i < currentSongTimecodes.length; i++) {
        if (newTimeSeconds >= currentSongTimecodes[i].time) {
            currentLyricIndex = i;
        } else {
            break;
        }
    }

    // Update lyrics display immediately
    const currentLyric = currentSongTimecodes[currentLyricIndex] ? currentSongTimecodes[currentLyricIndex].text : '';
    const nextLyrics = [];
    for (let i = 1; i <= 3; i++) {
        if (currentLyricIndex + i < currentSongTimecodes.length) {
            nextLyrics.push(currentSongTimecodes[currentLyricIndex + i].text);
        }
    }
    updateLyrics(currentLyric, nextLyrics);

    // Update progress bar UI
    updateProgressBar(newTimeSeconds);

    // Resume playback if it was playing
    if (isPlaying) {
        animationFrameId = requestAnimationFrame(updateLyricDisplay);
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
            <button data-song-id="${song.id}" class="delete-button">Delete</button>
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

    // Add event listeners to delete buttons
    document.querySelectorAll('.delete-button').forEach(button => {
        button.addEventListener('click', async (event) => {
            const songId = event.target.dataset.songId;
            if (confirm(`Are you sure you want to delete song "${songId}"?`)) {
                await deleteSong(songId);
            }
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

async function deleteSong(songId) {
    try {
        const response = await fetch(`/songs/${songId}`, {
            method: 'DELETE',
            headers: {
                'Accept': 'application/json',
            },
        });
        const result = await response.json();
        if (response.ok) {
            console.log(result.message);
            fetchSongs(); // Refresh song list
        } else {
            console.error("Error deleting song:", result.detail);
        }
    } catch (error) {
        console.error("Error deleting song:", error);
    }
}

function togglePlayPause() {
    isPlaying = !isPlaying;
    if (isPlaying) {
        playPauseButton.textContent = 'Pause';
        // Resume animation from where it left off
        animationFrameId = requestAnimationFrame(updateLyricDisplay);
    } else {
        playPauseButton.textContent = 'Play';
        // Animation will naturally pause because isPlaying is false
    }
}

// Initial setup when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
    songListElement = document.getElementById('song-list');
    uploadForm = document.getElementById('upload-form');
    uploadStatus = document.getElementById('upload-status');
    youtubeForm = document.getElementById('youtube-form');
    youtubeStatus = document.getElementById('youtube-status');
    playPauseButton = document.getElementById('play-pause-button');

    // Progress bar elements
    progressBar = document.getElementById('progress-bar');
    currentTimeDisplay = document.getElementById('current-time');
    totalDurationDisplay = document.getElementById('total-duration');

    // Add event listener for Play/Pause button
    playPauseButton.addEventListener('click', togglePlayPause);

    // Add event listeners for progress bar seeking
    progressBar.addEventListener('input', (event) => {
        // Update current time display while dragging
        currentTimeDisplay.textContent = formatTime(event.target.value);
    });
    progressBar.addEventListener('change', (event) => {
        // Seek to the new time when dragging stops
        seekToTime(parseFloat(event.target.value));
    });

    uploadForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        uploadStatus.textContent = 'Uploading...';

        const fileInput = document.getElementById('song-file');
        const titleInput = document.getElementById('song-title');
        const bpmInput = document.getElementById('song-bpm'); // Get BPM input
        const measuresPerSectionInput = document.getElementById('measures-per-section'); // Get Measures per Section input
        const beatsPerMeasureInput = document.getElementById('beats-per-measure'); // Get Beats per Measure input

        const formData = new FormData();
        formData.append('file', fileInput.files[0]);
        if (titleInput.value) {
            formData.append('title', titleInput.value);
        }
        // Only append BPM if it's a non-empty, valid number
        if (bpmInput.value && !isNaN(parseFloat(bpmInput.value))) {
            console.log("Sending BPM:", parseFloat(bpmInput.value)); // Debug log
            formData.append('bpm', parseFloat(bpmInput.value)); 
        } else {
            console.log("BPM input is empty or invalid, not sending."); // Debug log
        }
        // Only append Measures per Section if it's a non-empty, valid number
        if (measuresPerSectionInput.value && !isNaN(parseInt(measuresPerSectionInput.value))) {
            console.log("Sending Measures per Section:", parseInt(measuresPerSectionInput.value)); // Debug log
            formData.append('measures_per_section', parseInt(measuresPerSectionInput.value));
        } else {
            console.log("Measures per Section input is empty or invalid, not sending."); // Debug log
        }
        // Only append Beats per Measure if it's a non-empty, valid number
        if (beatsPerMeasureInput.value && !isNaN(parseInt(beatsPerMeasureInput.value))) {
            console.log("Sending Beats per Measure:", parseInt(beatsPerMeasureInput.value)); // Debug log
            formData.append('beats_per_measure', parseInt(beatsPerMeasureInput.value));
        } else {
            console.log("Beats per Measure input is empty or invalid, not sending."); // Debug log
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
                bpmInput.value = ''; // Clear BPM input
                measuresPerSectionInput.value = ''; // Clear Measures per Section input
                beatsPerMeasureInput.value = ''; // Clear Beats per Measure input
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

    youtubeForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        youtubeStatus.textContent = 'Processing YouTube URL...';

        const youtubeUrlInput = document.getElementById('youtube-url');
        const youtubeTitleInput = document.getElementById('youtube-title');

        const formData = new FormData();
        formData.append('youtube_url', youtubeUrlInput.value);
        if (youtubeTitleInput.value) {
            formData.append('title', youtubeTitleInput.value);
        }

        try {
            const response = await fetch('/songs/from_youtube', {
                method: 'POST',
                body: formData,
            });
            const result = await response.json();

            if (response.ok) {
                youtubeStatus.textContent = `Processing initiated for: ${result.youtube_url} (ID: ${result.song_id}). This may take a few minutes.`;
                youtubeUrlInput.value = ''; // Clear input
                youtubeTitleInput.value = ''; // Clear input
                // Poll for song status or rely on manual refresh for now
                setTimeout(fetchSongs, 5000); // Refresh song list after a delay
            } else {
                youtubeStatus.textContent = `Processing failed: ${result.detail || response.statusText}`;
                console.error("YouTube processing error:", result);
            }
        } catch (error) {
            youtubeStatus.textContent = `Processing failed: ${error.message}`;
            console.error("YouTube processing error:", error);
        }
    });

    // Initial fetch of songs when the page loads
    fetchSongs();
});
