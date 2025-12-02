import numpy as np
import librosa

def apply_a_weighting(y, sr):
    """
    Apply A-weighting filter to the audio signal in frequency domain.
    Returns the weighted signal in time domain.
    """
    # Ensure mono
    if y.ndim > 1:
        y = librosa.to_mono(y)
    
    # FFT
    freqs = np.fft.rfftfreq(len(y), 1/sr)
    fft_vals = np.fft.rfft(y)
    
    # A-weighting curve (IEC 61672-1 standard)
    f_sq = freqs**2
    ra = (
        (12194**2 * f_sq**2)
        / (
            (f_sq + 20.6**2)
            * np.sqrt((f_sq + 107.7**2) * (f_sq + 737.9**2))
            * (f_sq + 12194**2)
        )
    )
    
    # Apply weighting (magnitude only for simplicity, but preserve phase)
    a_weighted_fft = fft_vals * ra
    y_weighted = np.fft.irfft(a_weighted_fft, n=len(y))
    return y_weighted.real  # Ensure real output

def calculate_noise_level(path):
    """
    Calculates noise level using RMS energy with A-weighting and SPL calibration.
    """
    try:
        y, sr = librosa.load(path, sr=None)
        
        # Apply A-weighting
        y_weighted = apply_a_weighting(y, sr)
        
        # RMS of weighted signal
        rms = np.sqrt(np.mean(y_weighted ** 2))
        
        # Convert to dB SPL (with reference adjustment)
        # +60 is approximate for mic calibration; adjust based on testing
        db_spl = 20 * np.log10(rms + 1e-9) + 60
        
        # Floor at 0 dB to avoid negatives
        db_spl = max(db_spl, 0.0)
        
        return float(db_spl)
    except Exception as e:
        print(f"Error processing {path}: {e}")
        return None  # Or raise, depending on your server handling
