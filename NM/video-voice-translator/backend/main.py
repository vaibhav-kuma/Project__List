import os
import uuid
import sentry_sdk
from fastapi import FastAPI, File, UploadFile, HTTPException, Form, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from botocore.exceptions import NoCredentialsError
from dotenv import load_dotenv
import boto3
import json
import redis
from sqlalchemy.orm import Session
from worker import process_video_task
from . import auth, models
from .database import SessionLocal, engine

models.Base.metadata.create_all(bind=engine)

load_dotenv()

SENTRY_DSN = os.getenv("SENTRY_DSN")
if SENTRY_DSN:
    sentry_sdk.init(
        dsn=SENTRY_DSN,
        traces_sample_rate=1.0,
    )

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# AWS S3 Configuration
AWS_ACCESS_KEY_ID = os.getenv("AWS_ACCESS_KEY_ID")
AWS_SECRET_ACCESS_KEY = os.getenv("AWS_SECRET_ACCESS_KEY")
AWS_S3_BUCKET_NAME = os.getenv("AWS_S3_BUCKET_NAME")
AWS_S3_REGION = os.getenv("AWS_S3_REGION")

s3_client = boto3.client(
    "s3",
    region_name=AWS_S3_REGION,
    aws_access_key_id=AWS_ACCESS_KEY_ID,
    aws_secret_access_key=AWS_SECRET_ACCESS_KEY,
)

REDIS_HOST = os.getenv("REDIS_HOST", "localhost")
REDIS_PORT = int(os.getenv("REDIS_PORT", "6379"))
redis_client = redis.Redis(host=REDIS_HOST, port=REDIS_PORT, decode_responses=True)

# Constants
ALLOWED_EXTENSIONS = {"mp4", "mov", "avi"}
MAX_FILE_SIZE = 500 * 1024 * 1024  # 500 MB


def allowed_file(filename):
    if "." not in filename:
        return False
    ext = filename.rsplit(".", 1)[1].lower()
    return ext in ALLOWED_EXTENSIONS


@app.get("/health")
def read_root():
    return {"status": "ok"}


@app.get("/sentry-debug")
async def trigger_error():
    division_by_zero = 1 / 0


@app.get("/status/{job_id}")
def get_status(job_id: str):
    status = redis_client.hgetall(f"job:{job_id}")
    if not status:
        raise HTTPException(status_code=404, detail="Job not found")
    return status


@app.post("/register")
def register(email: str = Form(...), password: str = Form(...), db: Session = Depends(auth.get_db)):
    db_user = auth.get_user(db, email=email)
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    hashed_password = auth.get_password_hash(password)
    user = models.User(email=email, hashed_password=hashed_password)
    db.add(user)
    db.commit()
    db.refresh(user)
    return {"email": user.email}


@app.post("/token")
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(auth.get_db)):
    user = auth.get_user(db, email=form_data.username)
    if not user or not auth.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token = auth.create_access_token(data={"sub": user.email})
    return {"access_token": access_token, "token_type": "bearer"}


@app.post("/upload")
async def upload_video(file: UploadFile = File(...), target_language: str = Form("en"), current_user: models.User = Depends(auth.get_current_user)):
    # Validate file extension
    if not allowed_file(file.filename):
        raise HTTPException(status_code=400, detail="Invalid file extension")

    # Validate file size using seek/tell to avoid loading into memory
    try:
        file.file.seek(0, os.SEEK_END)
        size = file.file.tell()
        file.file.seek(0)
    except Exception:
        size = None

    if size is not None and size > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="File size exceeds 500MB")

    job_id = str(uuid.uuid4())
    file.filename = f"{job_id}-{file.filename}"

    try:
        s3_client.upload_fileobj(file.file, AWS_S3_BUCKET_NAME, file.filename)
        storage_url = f"https://{AWS_S3_BUCKET_NAME}.s3.amazonaws.com/{file.filename}"
        job_data = {"job_id": job_id, "bucket": AWS_S3_BUCKET_NAME, "key": file.filename, "target_language": target_language}
        redis_client.hset(f"job:{job_id}", mapping={"status": "queued", "storage_url": storage_url})
        process_video_task.delay(job_data)
    except NoCredentialsError:
        raise HTTPException(status_code=500, detail="AWS credentials not available")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to upload to S3: {e}")

    return {"job_id": job_id, "storage_url": storage_url}

@app.post("/translate-video")
async def translate_video_url(video_url: str = Form(...), target_language: str = Form("en"), current_user: models.User = Depends(auth.get_current_user)):
    # Download video from URL and process asynchronously
    job_id = str(uuid.uuid4())
    job_data = {"job_id": job_id, "video_url": video_url, "target_language": target_language}
    redis_client.hset(f"job:{job_id}", mapping={"status": "queued"})
    process_video_task.delay(job_data)
    return {"job_id": job_id}

# WebRTC endpoint for real-time processing (placeholder, needs full implementation)
@app.websocket("/ws/realtime")
async def websocket_endpoint(websocket):
    await websocket.accept()
    # Implement real-time ASR, translation, TTS streaming here
    # This is a placeholder; full implementation required
    await websocket.send_text("Real-time processing not fully implemented yet")
    await websocket.close()
