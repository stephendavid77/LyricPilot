const currentLyricElement = document.getElementById('current-lyric');
const nextLyricElements = [
    document.querySelector('.next-1'),
    document.querySelector('.next-2'),
    document.querySelector('.next-3'),
];

const websocket = new WebSocket("ws://localhost:8000/ws"); // Adjust if your backend is on a different host/port

let currentSongTimecodes = [];
let currentLyricIndex = -1;
let playbackStartTime = 0;
let animationFrameId = null;

websocket.onopen = (event) => {
    console.log("WebSocket connected!");
};

websocket.onmessage = (event) => {
    try {
        const message = JSON.parse(event.data);
        console.log("Received message:", message);

        if (message.type === "lyric_update") {
            // This path is for manual triggers or future real-time audio input
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
