import pytest
import tempfile
import os
from backend.tts import get_tts_connector, GTTSConnector

def test_gtts_connector_text_to_speech():
    connector = GTTSConnector()
    with tempfile.NamedTemporaryFile(suffix=".mp3", delete=False) as f:
        output_path = f.name

    try:
        connector.text_to_speech("Hello world", "en", output_path, rate=1.0)
        assert os.path.exists(output_path)
        assert os.path.getsize(output_path) > 0
    finally:
        if os.path.exists(output_path):
            os.unlink(output_path)

def test_get_tts_connector():
    connector = get_tts_connector("gtts")
    assert isinstance(connector, GTTSConnector)

def test_get_tts_connector_invalid():
    with pytest.raises(ValueError):
        get_tts_connector("invalid")
