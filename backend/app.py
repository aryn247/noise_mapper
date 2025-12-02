from flask import Flask, request, jsonify, send_from_directory
from noise_processing import calculate_noise_level
from pydub import AudioSegment
import os
import json
from datetime import datetime

app = Flask(__name__)

UPLOAD_FOLDER = 'uploads'
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

DATA_FILE = 'data.json'

# Ensure data.json exists and is valid
if not os.path.exists(DATA_FILE):
    with open(DATA_FILE, 'w') as f:
        json.dump([], f)
else:
    try:
        with open(DATA_FILE, 'r') as f:
            json.load(f)
    except json.JSONDecodeError:
        with open(DATA_FILE, 'w') as f:
            json.dump([], f)


@app.route('/upload_audio', methods=['POST'])
def upload_audio():
    try:
        if "audio" not in request.files:
            return jsonify({"error": "No audio file uploaded"}), 400

        audio_file = request.files["audio"]
        timestamp = int(datetime.now().timestamp())
        input_path = os.path.join(UPLOAD_FOLDER, f"{timestamp}_{audio_file.filename}")
        audio_file.save(input_path)

        print(f"Received file: {audio_file.filename}, saved to: {input_path}")

        # Convert to WAV with unique name
        wav_path = os.path.join(UPLOAD_FOLDER, f"{timestamp}_converted.wav")
        AudioSegment.from_file(input_path).export(wav_path, format="wav")
        print(f"Converted to WAV: {wav_path}")

        # Calculate noise
        db_value = calculate_noise_level(wav_path)
        db_value = float(db_value)  
        print(f"Noise level: {db_value} dB")
        

        latitude = request.form.get("lat")
        longitude = request.form.get("lon")

        record = {
            "filename": audio_file.filename,
            "db": db_value,
            "timestamp": datetime.now().isoformat(),
            "latitude": float(latitude) if latitude else None,
            "longitude": float(longitude) if longitude else None
        }

        # Append safely to JSON
        try:
            with open(DATA_FILE, 'r+') as f:
                try:
                    data = json.load(f)
                except json.JSONDecodeError:
                    data = []
                data.append(record)
                f.seek(0)
                json.dump(data, f, indent=2)
                f.truncate()
        except Exception as e:
            print("Failed to save data:", str(e))
            return jsonify({"error": f"Failed to save data: {str(e)}"}), 500

        return jsonify(record)

    except Exception as e:
        # Log full traceback in server console
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

@app.route('/data', methods=['GET'])
def get_data():
    if not os.path.exists(DATA_FILE):
        return jsonify([])
    try:
        with open(DATA_FILE, 'r') as f:
            data = json.load(f)
    except json.JSONDecodeError:
        data = []
    return jsonify(data)

@app.route('/')
def index():
    return send_from_directory('frontend', 'index.html')

@app.route('/<path:path>')
def static_files(path):
    return send_from_directory('frontend', path)

if __name__ == "__main__":
    app.run(debug=True)