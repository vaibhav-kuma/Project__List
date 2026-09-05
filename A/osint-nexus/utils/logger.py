"""
Logging Setup
"""
import logging
import sys
from pathlib import Path
from logging.handlers import RotatingFileHandler


def setup_logger(name: str, level: str = "INFO") -> logging.Logger:
    logger = logging.getLogger(name)
    
    if logger.handlers:
        return logger
    
    logger.setLevel(getattr(logging, level.upper(), logging.INFO))
    
    # Console handler
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(logging.WARNING)
    console_fmt = logging.Formatter('%(asctime)s [%(levelname)s] %(name)s: %(message)s', datefmt='%H:%M:%S')
    console_handler.setFormatter(console_fmt)
    
    # File handler
    log_dir = Path("logs")
    log_dir.mkdir(exist_ok=True)
    file_handler = RotatingFileHandler(
        log_dir / "osint_nexus.log",
        maxBytes=50 * 1024 * 1024,
        backupCount=5
    )
    file_handler.setLevel(logging.DEBUG)
    file_fmt = logging.Formatter('%(asctime)s [%(levelname)s] %(name)s:%(lineno)d: %(message)s')
    file_handler.setFormatter(file_fmt)
    
    logger.addHandler(console_handler)
    logger.addHandler(file_handler)
    
    return logger