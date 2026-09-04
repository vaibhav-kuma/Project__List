import os
import asyncio
from aiortc import RTCPeerConnection
import json
import subprocess
import tempfile
from dotenv import load_dotenv
import boto3
import redis
from asr import get_asr_connector
from translation import get_translator_connector
from tts import get_tts_connector
from aiortc.contrib.media import MediaRelay
from pydub import AudioSegment
import noisereduce as nr
import soundfile as sf
from celery_app import celery
from subtitles import generate_srt, generate_vtt

load_dotenv()
relay = MediaRelay()

AWS_ACCESS_KEY_ID = os.getenv("AWS_ACCESS_KEY_ID")
AWS_SECRET_ACCESS_KEY = os.getenv("AWS_SECRET_ACCESS_KEY")
AWS_S3_BUCKET_NAME = os.getenv("AWS_S3_BUCKET_NAME")
AWS_S3_REGION = os.getenv("AWS_S3_REGION")

s3 = boto3.client(
    "s3",
    region_name=AWS_S3_REGION,
    aws_access_key_id=AWS_ACCESS_KEY_ID,
    aws_secret_access_key=AWS_SECRET_ACCESS_KEY,
)

@celery.task(bind=True, autoretry_for=(Exception,), retry_kwargs={'max_retries': 3, 'countdown': 5})
def process_video_task(self, job):
    job_id = job["job_id"]
    bucket = job.get("bucket", AWS_S3_BUCKET_NAME)
    key = job["key"]
    target_language = job.get("target_language", "en")

    redis_client = redis.Redis(host=os.getenv("REDIS_HOST", "localhost"), port=int(os.getenv("REDIS_PORT", "6379")), decode_responses=True)

    try:
        with tempfile.TemporaryDirectory() as td:
            in_path = os.path.join(td, "input")
            audio_path = os.path.join(td, "audio.wav")
            
            redis_client.hset(f"job:{job_id}", mapping={"status": "extracting"})
            s3.download_file(bucket, key, in_path)
            cmd = ["ffmpeg", "-y", "-i", in_path, "-vn", "-ac", "1", "-ar", "16000", "-c:a", "pcm_s16le", audio_path]
            res = subprocess.run(cmd, capture_output=True, text=True)
            if res.returncode != 0:
                raise Exception(f"FFmpeg failed: {res.stderr}")

            if job.get("noise_reduction", False):
                redis_client.hset(f"job:{job_id}", mapping={"status": "noise_reducing"})
                data, rate = sf.read(audio_path)
                reduced_noise = nr.reduce_noise(y=data, sr=rate)
                reduced_noise_path = os.path.join(td, "audio_reduced_noise.wav")
                sf.write(reduced_noise_path, reduced_noise, rate)
                audio_path = reduced_noise_path

            audio_key = f"audio/{job_id}.wav"
            s3.upload_file(audio_path, bucket, audio_key)
            audio_url = f"https://{bucket}.s3.amazonaws.com/{audio_key}"
            redis_client.hset(f"job:{job_id}", mapping={"status": "transcribing", "audio_url": audio_url})

            asr_connector = get_asr_connector("whisper")
            transcript = asr_connector.transcribe(audio_path)
            transcript_path = os.path.join(td, "transcript.json")
            with open(transcript_path, "w") as f:
                json.dump(transcript, f)

            transcript_key = f"transcripts/{job_id}.json"
            s3.upload_file(transcript_path, bucket, transcript_key)
            transcript_url = f"https://{bucket}.s3.amazonaws.com/{transcript_key}"
            redis_client.hset(f"job:{job_id}", mapping={"status": "translating", "transcript_url": transcript_url, "language": transcript["language"]})

            translator_connector = get_translator_connector()
            translated_segments = translator_connector.translate(transcript["segments"], target_language)
            translated_transcript_path = os.path.join(td, "translated_transcript.json")
            with open(translated_transcript_path, "w") as f:
                json.dump({"segments": translated_segments, "language": target_language}, f)

            translated_transcript_key = f"transcripts/{job_id}_translated_{target_language}.json"
            s3.upload_file(translated_transcript_path, bucket, translated_transcript_key)
            translated_transcript_url = f"https://{bucket}.s3.amazonaws.com/{translated_transcript_key}"
            redis_client.hset(f"job:{job_id}", mapping={"status": "tts", "translated_transcript_url": translated_transcript_url})

            tts_connector = get_tts_connector()
            tts_audio_urls = {}
            voice_style = job.get("voice_style", "default")
            pitch = job.get("pitch", 1.0)
            speed = job.get("speed", 1.0)

            for i, segment in enumerate(translated_segments):
                tts_audio_path = os.path.join(td, f"tts_{i}.mp3")
                tts_connector.text_to_speech(
                    segment["text_translated"],
                    target_language,
                    tts_audio_path,
                    voice=voice_style,
                    rate=speed,
                    pitch=pitch
                )
                tts_audio_key = f"tts/{job_id}/{i}.mp3"
                s3.upload_file(tts_audio_path, bucket, tts_audio_key)
                tts_audio_url = f"https://{bucket}.s3.amazonaws.com/{tts_audio_key}"
                tts_audio_urls[f"segment_{i}"] = tts_audio_url

            redis_client.hset(f"job:{job_id}", mapping={"status": "merging", "tts_audio_urls": json.dumps(tts_audio_urls)})

            final_audio = AudioSegment.empty()
            last_end_time = 0
            for i, segment in enumerate(transcript["segments"]):
                silence_duration = (segment["start"] - last_end_time) * 1000
                if silence_duration > 0:
                    final_audio += AudioSegment.silent(duration=silence_duration)
                tts_audio = AudioSegment.from_mp3(os.path.join(td, f"tts_{i}.mp3"))
                final_audio += tts_audio
                last_end_time = segment["end"]

            final_audio_path = os.path.join(td, "final_audio.aac")
            final_audio.export(final_audio_path, format="adts")

            output_video_path = os.path.join(td, "output.mp4")
            cmd = ["ffmpeg", "-y", "-i", in_path, "-i", final_audio_path, "-c:v", "copy", "-c:a", "aac", "-map", "0:v:0", "-map", "1:a:0", output_video_path]
            res = subprocess.run(cmd, capture_output=True, text=True)
            if res.returncode != 0:
                raise Exception(f"FFmpeg muxing failed: {res.stderr}")

            final_video_key = f"videos/{job_id}_final.mp4"
            s3.upload_file(output_video_path, bucket, final_video_key)
            final_video_url = f"https://{bucket}.s3.amazonaws.com/{final_video_key}"

            # Generate and upload subtitles
            original_srt = generate_srt(transcript["segments"])
            original_srt_path = os.path.join(td, "original.srt")
            with open(original_srt_path, "w", encoding="utf-8") as f:
                f.write(original_srt)
            original_srt_key = f"subtitles/{job_id}_original.srt"
            s3.upload_file(original_srt_path, bucket, original_srt_key)
            original_srt_url = f"https://{bucket}.s3.amazonaws.com/{original_srt_key}"

            translated_srt = generate_srt(translated_segments)
            translated_srt_path = os.path.join(td, "translated.srt")
            with open(translated_srt_path, "w", encoding="utf-8") as f:
                f.write(translated_srt)
            translated_srt_key = f"subtitles/{job_id}_translated_{target_language}.srt"
            s3.upload_file(translated_srt_path, bucket, translated_srt_key)
            translated_srt_url = f"https://{bucket}.s3.amazonaws.com/{translated_srt_key}"

            original_vtt = generate_vtt(transcript["segments"])
            original_vtt_path = os.path.join(td, "original.vtt")
            with open(original_vtt_path, "w", encoding="utf-8") as f:
                f.write(original_vtt)
            original_vtt_key = f"subtitles/{job_id}_original.vtt"
            s3.upload_file(original_vtt_path, bucket, original_vtt_key)
            original_vtt_url = f"https://{bucket}.s3.amazonaws.com/{original_vtt_key}"

            translated_vtt = generate_vtt(translated_segments)
            translated_vtt_path = os.path.join(td, "translated.vtt")
            with open(translated_vtt_path, "w", encoding="utf-8") as f:
                f.write(translated_vtt)
            translated_vtt_key = f"subtitles/{job_id}_translated_{target_language}.vtt"
            s3.upload_file(translated_vtt_path, bucket, translated_vtt_key)
            translated_vtt_url = f"https://{bucket}.s3.amazonaws.com/{translated_vtt_key}"

            redis_client.hset(f"job:{job_id}", mapping={
                "status": "completed",
                "final_video_url": final_video_url,
                "original_srt_url": original_srt_url,
                "translated_srt_url": translated_srt_url,
                "original_vtt_url": original_vtt_url,
                "translated_vtt_url": translated_vtt_url
            })

    except Exception as e:
        redis_client.hset(f"job:{job_id}", mapping={"status": "failed", "error": str(e)})
        self.retry(exc=e)

