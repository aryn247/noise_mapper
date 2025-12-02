Noise Mapper

Noise Mapper is a lightweight web application that analyzes audio files and visualizes noise intensity on an interactive map.
It helps identify high-noise areas using pins and heatmap layers, making it useful for environmental studies and smart-city projects.

Features

Upload audio files (.mp3/.wav)

Automatic noise intensity calculation

Saves location + noise data

Interactive Leaflet map

Heatmap visualization

Responsive, mobile-friendly UI

Node.js + MongoDB backend API

Tech Stack

Frontend: HTML, CSS, JavaScript, Leaflet.js
Backend: Node.js, Express.js, Multer
Database: MongoDB
Other: Leaflet-heat plugin, audio amplitude processing

How It Works

User uploads an audio file.

Backend extracts amplitude and calculates noise intensity.

Data is saved to MongoDB.

Frontend loads pins + heatmap to display noise distribution.

API Endpoints
Method	Endpoint	Description
POST	/upload_audio	Uploads & analyzes audio
GET	/get_pins	Returns pin markers
GET	/get_heatmap	Returns heatmap data


Open frontend/index.html in your browser.
