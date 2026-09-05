"""Quick debug to check health endpoint response"""
from main import app
from fastapi.testclient import TestClient

client = TestClient(app)
response = client.get("/health")
print(f"Status Code: {response.status_code}")
print(f"Response:\n{response.json()}")
