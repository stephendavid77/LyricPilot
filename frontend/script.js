const currentLyricElement = document.getElementById('current-lyric');
const nextLyricElements = [
    document.querySelector('.next-1'),
    document.querySelector('.next-2'),
    document.querySelector('.next-3'),
];

const websocket = new WebSocket("ws://localhost:8000/ws"); // Adjust if your backend is on a different host/port

websocket.onopen = (event) => {
    console.log("WebSocket connected!");
};

websocket.onmessage = (event) => {
    const message = JSON.parse(event.data);
    console.log("Received message:", message);

    if (message.type === "lyric_update") {
        const { current_lyric, next_lyrics } = message.data;
        updateLyrics(current_lyric, next_lyrics);
    } else if (message.type === "song_start") {
        const { song_id, title, timecodes } = message.data;
        console.log(`Starting song: ${title} (${song_id})`);
        // Here you could initialize a client-side scheduler if needed
        // For now, we just wait for lyric_update messages
    }
};

websocket.onclose = (event) => {
    console.log("WebSocket disconnected.", event);
};

websocket.onerror = (error) => {
    console.error("WebSocket error:", error);
};

function updateLyrics(currentLyric, nextLyrics) {
    currentLyricElement.textContent = currentLyric || '';

    nextLyricElements.forEach((element, index) => {
        element.textContent = nextLyrics[index] || '';
    });
}

// Example of how to manually trigger a lyric update for testing (e.g., from browser console)
// function testLyricUpdate() {
//     updateLyrics("This is the current line", ["Next line 1", "Next line 2", "Next line 3"]);
// }
// testLyricUpdate();
