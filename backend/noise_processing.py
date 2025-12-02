# noise_processing.py
import librosa
import numpy as np
from pydub import AudioSegment
import os
from pydub.utils import which

# Ensure ffmpeg is accessible
os.environ["PATH"] += os.pathsep + r"C:\ffmpeg-2025-11-24-git-c732564d2e-full_build\bin"

def load_audio(path):
    """
    Loads an audio file and converts to WAV if necessary.
    Returns audio samples and sample rate.
    """
    # If file is webm, mp4, or any unsupported format, convert to wav
    if not path.endswith('.wav'):
        wav_path = path.rsplit('.', 1)[0] + '.wav'
        AudioSegment.from_file(path).export(wav_path, format='wav')
        path = wav_path

    # Load using librosa
    y, sr = librosa.load(path, sr=None)
    return y, sr

def calculate_noise_level(path):
    """
    Calculates average noise level (in dB) of an audio file.
    """
    try:
        y, sr = load_audio(path)
        # RMS = Root Mean Square energy
        rms = np.sqrt(np.mean(y ** 2))
        # Convert to decibels
        db = 20 * np.log10(rms + 1e-9)
        return db
    except Exception as e:
        print("Error reading audio:", e)
        return None
