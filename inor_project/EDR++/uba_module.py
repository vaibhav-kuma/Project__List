import hashlib

def detect_anomalies(logs):
    anomalies = []
    known_patterns = set()

    for log in logs:
        fingerprint = hashlib.sha256(log.encode()).hexdigest()[:8]
        if fingerprint not in known_patterns:
            known_patterns.add(fingerprint)
        else:
            continue  # Considered normal
        if "suspicious" in log.lower() or "unauthorized" in log.lower():
            anomalies.append(log)
    return anomalies
