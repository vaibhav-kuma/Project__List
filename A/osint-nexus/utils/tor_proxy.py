"""Tor proxy support for anonymous requests"""
import requests
from typing import Optional


class TorProxy:
    """Tor SOCKS proxy manager"""
    
    def __init__(self, host: str = "127.0.0.1", port: int = 9050):
        self.proxies = {
            'http': f'socks5h://{host}:{port}',
            'https': f'socks5h://{host}:{port}'
        }
    
    def get_session(self) -> requests.Session:
        """Get requests session with Tor proxy"""
        session = requests.Session()
        session.proxies.update(self.proxies)
        return session
    
    def test_connection(self) -> bool:
        """Test if Tor is working"""
        try:
            session = self.get_session()
            resp = session.get('https://check.torproject.org', timeout=10)
            return 'Congratulations' in resp.text
        except:
            return False
