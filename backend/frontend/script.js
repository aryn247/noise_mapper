let mediaRecorder;
let audioChunks = [];

// DOM Elements
const startBtn = document.getElementById("startBtn");
const statusText = document.getElementById("status");
const playback = document.getElementById("playback");
const themeToggle = document.getElementById("themeToggle");

const showPinsBtn = document.getElementById("showPins");
const showHeatBtn = document.getElementById("showHeat");
const showBothBtn = document.getElementById("showBoth");

// Map initialization
const map = L.map('map').setView([19.0760, 72.8777], 12); // Mumbai default
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);

// Marker and Heat layers
const markersLayer = L.layerGroup().addTo(map);
let heatLayer = null;
let currentLayer = 'pins'; // default

// Theme Toggle
themeToggle.addEventListener("click", () => {
    document.body.classList.toggle("dark-mode");
    themeToggle.innerText = document.body.classList.contains("dark-mode") ? "Light Mode" : "Dark Mode";
});

// Recording functionality
startBtn.addEventListener("click", async () => {
    statusText.innerText = "Requesting microphone permission...";
    startBtn.classList.add("recording");

    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        statusText.innerText = "Recording for 10 seconds...";
        audioChunks = [];
        mediaRecorder = new MediaRecorder(stream);

        mediaRecorder.ondataavailable = e => audioChunks.push(e.data);

        mediaRecorder.onstop = async () => {
            startBtn.classList.remove("recording");
            const audioBlob = new Blob(audioChunks, { type: "audio/webm" });
            playback.src = URL.createObjectURL(audioBlob);

            // Get geolocation
            navigator.geolocation.getCurrentPosition(async pos => {
                const lat = pos.coords.latitude;
                const lon = pos.coords.longitude;

                const formData = new FormData();
                formData.append("audio", audioBlob, "recording.webm");
                formData.append("lat", lat);
                formData.append("lon", lon);

                await uploadAudio(formData);

            }, async () => {
                // If location unavailable
                const formData = new FormData();
                formData.append("audio", audioBlob, "recording.webm");
                await uploadAudio(formData);
            });
        };

        mediaRecorder.start();
        setTimeout(() => mediaRecorder.stop(), 10000);

    } catch (err) {
        startBtn.classList.remove("recording");
        statusText.innerText = "Microphone permission denied!";
        console.error(err);
    }
});

// Upload audio to server
async function uploadAudio(formData) {
    try {
        const response = await fetch("http://127.0.0.1:5000/upload_audio", { method: "POST", body: formData });
        if (!response.ok) {
            statusText.innerText = "Upload failed!";
            return;
        }
        const result = await response.json();
        statusText.innerText = `Recording finished! Noise Level: ${result.db.toFixed(2)} dB`;
        loadPins(); // refresh map
    } catch (err) {
        statusText.innerText = "Error connecting to server!";
        console.error(err);
    }
}

// Load pins + heatmap
async function loadPins() {
    try {
        const response = await fetch('http://127.0.0.1:5000/data');
        if (!response.ok) return console.error('Failed to fetch data');
        const data = await response.json();

        // Clear markers
        markersLayer.clearLayers();
        if (heatLayer) map.removeLayer(heatLayer);

        // Prepare heat points
        const heatPoints = [];

        data.forEach(record => {
            if (record.latitude && record.longitude) {
                // Add marker
                const color = record.db > 60 ? 'red' : record.db > 20 ? 'yellow' : 'green';
                const marker = L.circleMarker([record.latitude, record.longitude], {
                    radius: 8,
                    color: color,
                    fillOpacity: 0.7
                }).bindPopup(`dB: ${record.db.toFixed(2)}<br>Time: ${record.timestamp}`);

                if (currentLayer === 'pins' || currentLayer === 'both') {
                    marker.addTo(markersLayer);
                }

                // Add heat point [lat, lon, intensity]
                heatPoints.push([record.latitude, record.longitude, Math.min(1, Math.max(0.1, (record.db - 20) / 60))]);
            }
        });

        // Add heat layer if needed
        if (currentLayer === 'heat' || currentLayer === 'both') {
            heatLayer = L.heatLayer(heatPoints, { radius: 25, blur: 15 }).addTo(map);
        }

    } catch (err) {
        console.error(err);
    }
}

// Map Layer Toggle
showPinsBtn.addEventListener('click', () => { currentLayer = 'pins'; loadPins(); });
showHeatBtn.addEventListener('click', () => { currentLayer = 'heat'; loadPins(); });
showBothBtn.addEventListener('click', () => { currentLayer = 'both'; loadPins(); });

// Initial load
loadPins();
