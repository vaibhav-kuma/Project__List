import pytest
import tempfile
import os
from backend.asr import get_asr_connector, WhisperConnector

def test_whisper_connector_init():
    connector = WhisperConnector()
    assert connector.model is not None

def test_whisper_transcribe():
    connector = WhisperConnector()
    # Create a dummy audio file (silence) for testing
    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as f:
        # Write a short silent WAV (this is a minimal test; in real scenario, use a sample audio)
        import wave
        with wave.open(f.name, 'wb') as wav_file:
            wav_file.setnchannels(1)
            wav_file.setsampwidth(2)
            wav_file.setframerate(16000)
            wav_file.writeframes(b'\x00\x00' * 16000)  # 1 second of silence
        audio_path = f.name

    try:
        result = connector.transcribe(audio_path)
        assert "segments" in result
        assert "language" in result
        assert isinstance(result["segments"], list)
    finally:
        os.unlink(audio_path)

def test_get_asr_connector():
    connector = get_asr_connector("whisper")
    assert isinstance(connector, WhisperConnector)

def test_get_asr_connector_invalid():
    with pytest.raises(ValueError):
        get_asr_connector("invalid")
