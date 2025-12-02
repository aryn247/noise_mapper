let mediaRecorder;
let audioChunks = [];

const startBtn = document.getElementById("startBtn");
const statusText = document.getElementById("status");
const playback = document.getElementById("playback");

startBtn.addEventListener("click", async () => {
    statusText.innerText = "Requesting microphone permission...";

    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        statusText.innerText = "Recording for 10 seconds...";

        audioChunks = [];
        mediaRecorder = new MediaRecorder(stream);

        mediaRecorder.ondataavailable = event => {
            audioChunks.push(event.data);
        };

        mediaRecorder.onstop = async () => {
            const audioBlob = new Blob(audioChunks, { type: "audio/webm" });
            playback.src = URL.createObjectURL(audioBlob);

            statusText.innerText = "Uploading audio to server...";

            // Get geolocation
            navigator.geolocation.getCurrentPosition(async (position) => {
                const lat = position.coords.latitude;
                const lon = position.coords.longitude;

                const formData = new FormData();
                formData.append("audio", audioBlob, "recording.webm");
                formData.append("lat", lat);
                formData.append("lon", lon);

                await uploadAudio(formData);

            }, async () => {
                // If location unavailable, upload without lat/lon
                const formData = new FormData();
                formData.append("audio", audioBlob, "recording.webm");
                await uploadAudio(formData);
            });
        };

        mediaRecorder.start();

        setTimeout(() => {
            mediaRecorder.stop();
        }, 10000);

    } catch (err) {
        statusText.innerText = "Microphone permission denied!";
        console.error(err);
    }
});

// Upload function
async function uploadAudio(formData) {
    try {
        const response = await fetch("http://127.0.0.1:5000/upload_audio", {
            method: "POST",
            body: formData
        });

        if (!response.ok) {
            statusText.innerText = "Upload failed!";
            return;
        }

        const result = await response.json();
        statusText.innerText = `Recording finished! Noise Level: ${result.db.toFixed(2)} dB`;
        console.log(result);

        loadPins(); // refresh map

    } catch (err) {
        statusText.innerText = "Error connecting to server!";
        console.error(err);
    }
}

// Initialize map
const map = L.map('map').setView([19.0760, 72.8777], 12); // Mumbai default
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);

// Create a layer group for markers to manage them easily
const markersLayer = L.layerGroup().addTo(map);

// Load pins
async function loadPins() {
    try {
        const response = await fetch('http://127.0.0.1:5000/data');
        if (!response.ok) return console.error('Failed to fetch data');
        const data = await response.json();

        // Clear existing markers before adding new ones
        markersLayer.clearLayers();

        data.forEach(record => {
            if (record.latitude && record.longitude) {
                let color = 'green';
                if (record.db > -20) color = 'red';
                else if (record.db > -40) color = 'yellow';

                L.circleMarker([record.latitude, record.longitude], {
                    radius: 8,
                    color: color,
                    fillOpacity: 0.7
                }).addTo(markersLayer)  // Add to the layer group instead of directly to map
                  .bindPopup(`dB: ${record.db.toFixed(2)}<br>Time: ${record.timestamp}`);
            }
        });
    } catch (err) {
        console.error(err);
    }
}

// Load initial pins
loadPins();
