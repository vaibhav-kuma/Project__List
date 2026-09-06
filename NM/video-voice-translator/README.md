# Video-Voice-Translator

A real-time video and voice translation service that transcribes audio from videos, translates it to the target language, and generates translated audio with subtitles.

## Architecture

- **Backend**: FastAPI for REST API, Celery for async task processing, Redis for job queuing.
- **Frontend**: React/Vite for user interface.
- **ASR**: OpenAI Whisper for speech-to-text.
- **Translation**: Translators library for language translation.
- **TTS**: Google Text-to-Speech (gTTS) or AWS Polly for text-to-speech.
- **Storage**: AWS S3 for video/audio storage.
- **Monitoring**: Prometheus and Grafana for metrics.
- **Deployment**: Kubernetes for container orchestration.

## Prerequisites

- Docker and Docker Compose
- Kubernetes cluster (for deployment)
- AWS account with S3, Polly (optional)
- Python 3.8+
- Node.js 16+

## Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/your-repo/video-voice-translator.git
   cd video-voice-translator
   ```

2. Set up environment variables:
   Create a `.env` file in the backend directory with:
   ```
   AWS_ACCESS_KEY_ID=your_aws_key
   AWS_SECRET_ACCESS_KEY=your_aws_secret
   AWS_S3_BUCKET_NAME=your_bucket
   AWS_S3_REGION=us-east-1
   REDIS_HOST=localhost
   REDIS_PORT=6379
   DATABASE_URL=sqlite:///./test.db
   SECRET_KEY=your_secret_key
   ```

3. Run locally with Docker Compose:
   ```bash
   docker-compose up --build
   ```

## Deployment to Kubernetes

1. Apply Kubernetes manifests:
   ```bash
   kubectl apply -f kubernetes/
   ```

2. Set up secrets:
   ```bash
   kubectl apply -f kubernetes/secrets.yaml
   ```

## API Documentation

The API docs are available at `http://localhost:8000/docs` when running locally.

### Endpoints

- `POST /register`: Register a new user
- `POST /token`: Login and get access token
- `POST /upload`: Upload a video file for processing
- `POST /translate-video`: Process a video from URL
- `GET /status/{job_id}`: Get job status
- `WebSocket /ws/realtime`: Real-time processing (placeholder)

## Switching Providers

### ASR
- Default: OpenAI Whisper
- To switch to Google STT: Update `asr.py` to use Google Cloud Speech-to-Text API.

### TTS
- Default: gTTS
- To use AWS Polly: Set provider to "polly" in TTS connector.

### Translation
- Default: Translators library
- Can be switched to Google Translate API or others.

## Monitoring

- Prometheus: `http://localhost:9090`
- Grafana: `http://localhost:3000`

## Testing

Run tests:
```bash
cd backend
pytest
```

## Load Testing

Use K6 for load testing:
```bash
k6 run loadtest/k6-script.js
