import pytest
import tempfile
import os
from unittest.mock import patch, MagicMock
from backend.worker import process_video_task

@patch('backend.worker.redis')
@patch('backend.worker.s3')
@patch('backend.worker.subprocess.run')
@patch('backend.worker.AudioSegment')
def test_process_video_task_success(mock_audio_segment, mock_subprocess, mock_s3, mock_redis):
    # Mock Redis
    mock_redis_client = MagicMock()
    mock_redis.Redis.return_value = mock_redis_client

    # Mock S3
    mock_s3_client = MagicMock()
    mock_s3.return_value = mock_s3_client

    # Mock subprocess for FFmpeg
    mock_subprocess.return_value.returncode = 0

    # Mock AudioSegment
    mock_audio = MagicMock()
    mock_audio_segment.from_mp3.return_value = mock_audio
    mock_audio_segment.empty.return_value = mock_audio
    mock_audio.export.return_value = None

    job = {
        "job_id": "test-job",
        "bucket": "test-bucket",
        "key": "test-video.mp4",
        "target_language": "es"
    }

    with tempfile.TemporaryDirectory() as td:
        with patch('backend.worker.tempfile.TemporaryDirectory') as mock_td:
            mock_td.return_value.__enter__.return_value = td
            # Create dummy files
            input_path = os.path.join(td, "input")
            with open(input_path, 'w') as f:
                f.write("dummy")

            # Mock ASR, Translation, TTS
            with patch('backend.worker.get_asr_connector') as mock_asr:
                mock_asr_connector = MagicMock()
                mock_asr_connector.transcribe.return_value = {"segments": [{"start": 0, "end": 1, "text": "Hello"}], "language": "en"}
                mock_asr.return_value = mock_asr_connector

                with patch('backend.worker.get_translator_connector') as mock_trans:
                    mock_trans_connector = MagicMock()
                    mock_trans_connector.translate.return_value = [{"start": 0, "end": 1, "text_translated": "Hola"}]
                    mock_trans.return_value = mock_trans_connector

                    with patch('backend.worker.get_tts_connector') as mock_tts:
                        mock_tts_connector = MagicMock()
                        mock_tts.return_value = mock_tts_connector

                        with patch('backend.worker.generate_srt') as mock_srt:
                            mock_srt.return_value = "dummy srt"

                            with patch('backend.worker.generate_vtt') as mock_vtt:
                                mock_vtt.return_value = "dummy vtt"

                                # Run the task
                                process_video_task(job)

                                # Assert Redis updates
                                assert mock_redis_client.hset.called
                                # Check final status
                                calls = mock_redis_client.hset.call_args_list
                                assert any("completed" in str(call) for call in calls)
