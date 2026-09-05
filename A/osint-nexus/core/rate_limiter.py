"""
Rate Limiter for API calls
"""
import asyncio
import time
from collections import deque


class RateLimiter:
    """Token bucket rate limiter"""
    
    def __init__(self, requests_per_minute: int = 30):
        self.rpm = requests_per_minute
        self.interval = 60.0 / self.rpm if self.rpm > 0 else 0
        self.timestamps = deque()
        self._lock = asyncio.Lock()
    
    async def acquire(self):
        async with self._lock:
            now = time.time()
            
            # Remove timestamps older than 60 seconds
            while self.timestamps and now - self.timestamps[0] > 60:
                self.timestamps.popleft()
            
            if len(self.timestamps) >= self.rpm:
                wait_time = 60 - (now - self.timestamps[0])
                if wait_time > 0:
                    await asyncio.sleep(wait_time)
            
            self.timestamps.append(time.time())
    
    def sync_acquire(self):
        now = time.time()
        while self.timestamps and now - self.timestamps[0] > 60:
            self.timestamps.popleft()
        
        if len(self.timestamps) >= self.rpm:
            wait_time = 60 - (now - self.timestamps[0])
            if wait_time > 0:
                time.sleep(wait_time)
        
        self.timestamps.append(time.time())