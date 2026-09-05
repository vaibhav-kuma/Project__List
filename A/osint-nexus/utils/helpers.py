"""Helper utility functions"""
import re
import hashlib
from typing import Optional


def sanitize_filename(filename: str) -> str:
    """Remove invalid characters from filename"""
    return re.sub(r'[<>:"/\\|?*]', '_', filename)


def calculate_hash(data: str, algorithm: str = 'sha256') -> str:
    """Calculate hash of data"""
    h = hashlib.new(algorithm)
    h.update(data.encode())
    return h.hexdigest()


def truncate_string(s: str, max_length: int = 100) -> str:
    """Truncate string to max length"""
    return s[:max_length] + '...' if len(s) > max_length else s


def extract_domain(url: str) -> Optional[str]:
    """Extract domain from URL"""
    match = re.search(r'(?:https?://)?(?:www\.)?([^/]+)', url)
    return match.group(1) if match else None
