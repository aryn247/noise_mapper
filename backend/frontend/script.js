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

            navigator.geolocation.getCurrentPosition(async (position) => {
                const lat = position.coords.latitude;
                const lon = position.coords.longitude;

                const formData = new FormData();
                formData.append("audio", audioBlob, "recording.webm");
                formData.append("lat", lat);
                formData.append("lon", lon);

                await uploadAudio(formData);

            }, async () => {
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

// References to toggle buttons
const showPinsBtn = document.getElementById("showPins");
const showHeatBtn = document.getElementById("showHeat");
const showBothBtn = document.getElementById("showBoth");

// Toggle functions
showPinsBtn.addEventListener("click", () => {
    if (markersLayer) markersLayer.addTo(map);
    if (heatLayer) map.removeLayer(heatLayer);
});

showHeatBtn.addEventListener("click", () => {
    if (markersLayer) map.removeLayer(markersLayer);
    if (heatLayer) heatLayer.addTo(map);
});

showBothBtn.addEventListener("click", () => {
    if (markersLayer) markersLayer.addTo(map);
    if (heatLayer) heatLayer.addTo(map);
});

const themeToggle = document.getElementById("themeToggle");

themeToggle.addEventListener("click", () => {
    document.body.classList.toggle("dark-mode");

    if (document.body.classList.contains("dark-mode")) {
        themeToggle.innerText = "Light Mode";
    } else {
        themeToggle.innerText = "Dark Mode";
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

        loadPins();

    } catch (err) {
        statusText.innerText = "Error connecting to server!";
        console.error(err);
    }
}

// Initialize map
const map = L.map('map').setView([19.0760, 72.8777], 12);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);

// Marker layer group
const markersLayer = L.layerGroup().addTo(map);

// Heatmap layer reference
let heatLayer;

// Load pins + heatmap
async function loadPins() {
    try {
        const response = await fetch('http://127.0.0.1:5000/data');
        if (!response.ok) return console.error('Failed to fetch data');
        const data = await response.json();

        // ------- MARKERS -------
        markersLayer.clearLayers();

        data.forEach(record => {
            if (record.latitude && record.longitude) {
                let color = 'green';
                if (record.db > 70) color = 'red';
                else if (record.db > 55) color = 'yellow';

                L.circleMarker([record.latitude, record.longitude], {
                    radius: 8,
                    color: color,
                    fillOpacity: 0.7
                })
                .addTo(markersLayer)
                .bindPopup(`dB: ${record.db.toFixed(2)}<br>Time: ${record.timestamp}`);
            }
        });

        // ------- HEATMAP -------
    const heatPoints = [];

        data.forEach(record => {
            if (record.latitude && record.longitude) {
              // Convert dB into heat intensity (0 to 1)
            const intensity = Math.max(0.1, (record.db) / 100); 

        heatPoints.push([
            record.latitude,
            record.longitude,
            intensity
        ]);
    }
});

        if (heatLayer) {
            map.removeLayer(heatLayer);
        }

        heatLayer = L.heatLayer(heatPoints, {
            radius: 25,
            blur: 15,
            maxZoom: 17
        }).addTo(map);

    } catch (err) {
        console.error(err);
    }
}

// Load initial pins
loadPins();
