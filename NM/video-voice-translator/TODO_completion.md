# Video-Voice-Translator Completion TODO

## 1. Add Unit & Integration Tests
- [ ] Update backend/requirements.txt to include pytest and related testing libraries
- [ ] Create tests/ directory
- [ ] Create tests/test_asr.py for ASR module (Whisper transcription)
- [ ] Create tests/test_translation.py for translation module
- [ ] Create tests/test_tts.py for TTS module (gTTS and AWS Polly)
- [ ] Create tests/test_api.py for API endpoints (upload, status, health)
- [ ] Create tests/test_worker.py for worker task integration
- [ ] Run tests to ensure they pass

## 2. Create README.md
- [ ] Create README.md at root with:
  - Project overview and architecture diagram
  - Prerequisites (Docker, Kubernetes, AWS creds)
  - Setup instructions (clone, env vars)
  - Run locally with Docker Compose
  - Deploy to Kubernetes
  - API documentation (endpoints)
  - Switching providers (ASR to Google STT, TTS to AWS Polly, etc.)
  - Monitoring with Prometheus/Grafana

## 3. Enhance TTS for Voice Selection
- [ ] Update backend/tts.py to add AWS Polly connector with voice selection, rate, pitch
- [ ] Update get_tts_connector to support "polly" provider
- [ ] Add comments on how to switch to Polly

## 4. Verify and Test
- [ ] Run full test suite
- [ ] Test end-to-end with sample video (if possible)
- [ ] Ensure Docker builds and Compose works
- [ ] Check Kubernetes manifests
