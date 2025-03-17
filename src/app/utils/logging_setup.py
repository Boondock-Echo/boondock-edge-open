# app/utils/logging_setup.py
import os
import logging
from datetime import datetime
from logging.handlers import RotatingFileHandler

def setup_logger(name, log_file, level=logging.INFO, max_size=5*1024*1024, backup_count=5):
    """
    Setup logger with rotation capability
    
    Args:
        name (str): Logger name
        log_file (str): Path to log file
        level: Logging level
        max_size (int): Maximum size of log file before rotation (default 5MB)
        backup_count (int): Number of backup files to keep
    """
    # Create logs directory if it doesn't exist
    os.makedirs(os.path.dirname(log_file), exist_ok=True)
    
    # Create formatter
    formatter = logging.Formatter(
        '%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )
    
    # Setup file handler with rotation
    file_handler = RotatingFileHandler(
        log_file,
        maxBytes=max_size,
        backupCount=backup_count
    )
    file_handler.setFormatter(formatter)
    
    # Setup logger
    logger = logging.getLogger(name)
    logger.setLevel(level)
    
    # Remove existing handlers to prevent duplicate logs
    logger.handlers = []
    
    logger.addHandler(file_handler)
    
    return logger

# Create different loggers for different components
error_logger = setup_logger(
    'error_logger',
    os.path.join('logs', 'errors.log'),
    level=logging.ERROR
)

warning_logger = setup_logger(
    'warning_logger',
    os.path.join('logs', 'warnings.log'),
    level=logging.WARNING
)

transcription_logger = setup_logger(
    'transcription_logger',
    os.path.join('logs', 'transcription.log'),
    level=logging.INFO
)
event_logger = setup_logger(
    'event_logger',
    os.path.join('logs', 'event.log'),
    level=logging.INFO
)

db_logger = setup_logger(
    'db_logger',
    os.path.join('logs', 'database.log'),
    level=logging.INFO
)