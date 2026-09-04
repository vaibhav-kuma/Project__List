import requests

# Sample client for API usage

BASE_URL = "http://localhost:8000"

def register_user(email, password):
    response = requests.post(f"{BASE_URL}/register", data={"email": email, "password": password})
    return response.json()

def login_user(email, password):
    response = requests.post(f"{BASE_URL}/token", data={"username": email, "password": password})
    return response.json()

def upload_video(token, file_path, target_language="en"):
    headers = {"Authorization": f"Bearer {token}"}
    with open(file_path, "rb") as f:
        files = {"file": f}
        data = {"target_language": target_language}
        response = requests.post(f"{BASE_URL}/upload", files=files, data=data, headers=headers)
    return response.json()

def translate_video_url(token, video_url, target_language="en"):
    headers = {"Authorization": f"Bearer {token}"}
    data = {"video_url": video_url, "target_language": target_language}
    response = requests.post(f"{BASE_URL}/translate-video", data=data, headers=headers)
    return response.json()

def get_job_status(token, job_id):
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.get(f"{BASE_URL}/status/{job_id}", headers=headers)
    return response.json()

# Example usage
if __name__ == "__main__":
    # Register and login
    register_user("test@example.com", "password")
    token_data = login_user("test@example.com", "password")
    token = token_data["access_token"]

    # Upload video
    job = upload_video(token, "sample.mp4", "es")
    job_id = job["job_id"]
    print(f"Job ID: {job_id}")

    # Check status
    import time
    while True:
        status = get_job_status(token, job_id)
        print(status)
        if status["status"] in ["completed", "failed"]:
            break
        time.sleep(5)
