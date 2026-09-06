import whisper

class WhisperConnector:
    def __init__(self, model_name="base"):
        self.model = whisper.load_model(model_name)

    def transcribe(self, audio_path):
        result = self.model.transcribe(audio_path)
        segments = [{"start": seg["start"], "end": seg["end"], "text": seg["text"]} for seg in result["segments"]]
        language = result["language"]
        return {"segments": segments, "language": language}

def get_asr_connector(provider="whisper"):
    if provider == "whisper":
        return WhisperConnector()
    # Future connectors for Google STT, Azure STT can be added here
    else:
        raise ValueError(f"Unsupported ASR provider: {provider}")
