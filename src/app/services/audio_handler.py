# app/services/audio_handler.py
import os
import threading
import time
from datetime import datetime, timezone
from queue import Queue
import sqlite3
import json
from ..utils.logging_setup import error_logger, warning_logger, transcription_logger, db_logger
from .transcription_service import TranscriptionService

class UploadTask:
    """Represents a pending upload transcription task."""
    def __init__(self, file_path, channel_id, timestamp):
        self.file_path = file_path
        self.channel_id = channel_id
        self.timestamp = timestamp
        self.status = "pending"  # pending, processing, completed, failed
        self.transcription = None
        self.error = None

# Constants
DB_PATH = os.path.join('db', 'default.db')
SETTINGS_JSON_PATH = os.path.join('db', 'settings.json')

DB_FILE_NAME = 'default.db'
 
try:
    with open(SETTINGS_JSON_PATH, 'r') as f:
        settings = json.load(f)
    DB_FILE_NAME = settings.get("event_name", "default") + ".db"
    DB_PATH = os.path.join('db', DB_FILE_NAME)
except Exception as e:
    print("Error Checking the database location")

def init_db():
    """Initialize the SQLite database with proper indices."""
    try:
        os.makedirs('db', exist_ok=True)
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS recordings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                channel_id INTEGER,
                filename TEXT,
                timestamp TEXT,
                transcription TEXT
            )
        ''')
        
        cursor.execute('''
            CREATE INDEX IF NOT EXISTS idx_recordings_timestamp 
            ON recordings(timestamp DESC)
        ''')
        
        cursor.execute('''
            CREATE INDEX IF NOT EXISTS idx_channel_timestamp 
            ON recordings(channel_id, timestamp DESC)
        ''')
        
        conn.commit()
        conn.close()
        db_logger.info("Database initialized successfully")
    except Exception as e:
        error_logger.error(f"Failed to initialize database: {str(e)}")
        raise

def load_settings():
    """Load settings from JSON file."""
    try:
        with open(SETTINGS_JSON_PATH, 'r') as f:
            settings = json.load(f)
            db_logger.info("Settings loaded successfully")
            return settings
    except Exception as e:
        error_logger.error(f"Error loading settings: {str(e)}")
        return {}   

class AudioChannel:
    """Handle individual audio channel operations."""
    
    def __init__(self, channel_id, output_dir):
        self.channel_id = channel_id
        self.output_dir = output_dir
        self.recording_lock = threading.Lock()
        os.makedirs(output_dir, exist_ok=True)
        db_logger.info(f"AudioChannel {channel_id} initialized successfully")

    def save_recording(self, filename, timestamp, transcription):
        """Save recording metadata to database with improved error handling and validation."""
        with self.recording_lock:
            conn = sqlite3.connect(DB_PATH, isolation_level='IMMEDIATE')
            cursor = None
            try:
                if not all([filename, timestamp, transcription]):
                    raise ValueError("Missing required fields for recording")
                    
                cursor = conn.cursor()
                
                cursor.execute('''
                    SELECT id FROM recordings 
                    WHERE channel_id = ? AND filename = ?
                ''', (self.channel_id, filename))
                
                if cursor.fetchone():
                    cursor.execute('''
                        UPDATE recordings 
                        SET timestamp = ?, transcription = ?
                        WHERE channel_id = ? AND filename = ?
                    ''', (timestamp, transcription, self.channel_id, filename))
                else:
                    cursor.execute('''
                        INSERT INTO recordings (channel_id, filename, timestamp, transcription)
                        VALUES (?, ?, ?, ?)
                    ''', (self.channel_id, filename, timestamp, transcription))
                
                conn.commit()
                db_logger.info(f"Recording saved successfully: Channel {self.channel_id}, File: {filename}")
                return True
                
            except sqlite3.Error as e:
                error_logger.error(f"Database error while saving recording: {str(e)}")
                if conn:
                    conn.rollback()
                return False
                
            except Exception as e:
                error_logger.error(f"Unexpected error while saving recording: {str(e)}")
                if conn:
                    conn.rollback()
                return False
                
            finally:
                if cursor:
                    cursor.close()
                if conn:
                    conn.close()

    def get_recordings(self):
        """Retrieve recordings with validation against filesystem."""
        with self.recording_lock:
            conn = sqlite3.connect(DB_PATH)
            try:
                cursor = conn.cursor()
                cursor.execute('''
                    SELECT id, channel_id, filename, timestamp, transcription
                    FROM recordings
                    WHERE channel_id = ?
                    ORDER BY timestamp DESC
                ''', (self.channel_id,))
                
                recordings = []
                for row in cursor.fetchall():
                    file_path = row[2]
                    if os.path.exists(file_path):
                        recordings.append({
                            'id': row[0],
                            'channel_id': row[1],
                            'filename': row[2],
                            'timestamp': row[3],
                            'transcription': row[4]
                        })
                    else:
                        warning_logger.warning(f"Audio file not found: {file_path}")
                        cursor.execute('''
                            DELETE FROM recordings
                            WHERE id = ?
                        ''', (row[0],))
                
                conn.commit()
                return recordings
                
            except sqlite3.Error as e:
                error_logger.error(f"Error retrieving recordings for channel {self.channel_id}: {str(e)}")
                return []
                
            finally:
                conn.close()

class MultiChannelAudioHandler:
    """Handle multiple audio channels and their operations."""
    
    def __init__(self, model_name="tiny.en", trans_local=False, trans_node=True, trans_openai=True):
        try:
            self.running = False
            self.threads = []
            self.db_lock = threading.Lock()
            self.upload_queue = Queue()
            self.upload_tasks = {}
            self.upload_processor_thread = None
            self.upload_processor_lock = threading.Lock()
            self.channels = {}  # Dictionary to store channels dynamically

            self.transcription_service = TranscriptionService(model_name=model_name)
            self.trans_local = trans_local.lower() == 'true' if isinstance(trans_local, str) else bool(trans_local)
            self.trans_openai = trans_openai.lower() == 'true' if isinstance(trans_openai, str) else bool(trans_openai)
            self.trans_node = trans_node.lower() == 'true' if isinstance(trans_node, str) else bool(trans_node)

            db_logger.info("MultiChannelAudioHandler initialized")
        except Exception as e:
            error_logger.error(f"Failed to initialize MultiChannelAudioHandler: {str(e)}")
            raise

    def get_or_create_channel(self, channel_id):
        """Get existing channel or create new one dynamically."""
        if channel_id not in self.channels:
            channel_dir = os.path.join('recordings', f'channel_{channel_id}')
            self.channels[channel_id] = AudioChannel(channel_id, channel_dir)
            db_logger.info(f"Created new channel: {channel_id}")
        return self.channels[channel_id]

    def start(self):
        """Start upload processing."""
        self.running = True
        self.upload_processor_thread = threading.Thread(
            target=self.process_upload_queue,
            daemon=True
        )
        self.threads.append(self.upload_processor_thread)
        self.upload_processor_thread.start()
        db_logger.info("Started upload processor thread")

    def queue_upload_for_processing(self, file_path, channel_id):
        """Queue an uploaded file for processing."""
        try:
            timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
            task = UploadTask(file_path, channel_id, timestamp)
            
            with self.upload_processor_lock:
                filename = os.path.basename(file_path)
                self.upload_tasks[filename] = task
                self.upload_queue.put(task)
            
            # Ensure channel exists
            self.get_or_create_channel(channel_id)
            
            return True, {
                'filename': filename,
                'timestamp': timestamp,
                'status': 'pending'
            }
        except Exception as e:
            error_logger.error(f"Error queueing upload: {str(e)}")
            return False, str(e)

    def process_upload_queue(self):
        """Process queued upload tasks."""
        while self.running:
            try:
                if not self.upload_queue.empty():
                    task = self.upload_queue.get()
                    
                    try:
                        task.status = "processing"
                        channel = self.get_or_create_channel(task.channel_id)
                        
                        absolute_path = os.path.join(os.getcwd(), task.file_path)
                        
                        transcription_logger.info(f"Starting transcription for uploaded file: {task.file_path}")
                        transcription = self.transcription_service.transcribe_audio(
                            absolute_path 
                        )
                        transcription_logger.info(f"Transcription completed for uploaded file: {task.file_path}")
                        
                        if transcription:
                            channel.save_recording(task.file_path, task.timestamp, transcription)
                            task.status = "completed"
                            task.transcription = transcription
                        else:
                            raise Exception("Transcription failed - no result returned")
                            
                    except Exception as e:
                        error_logger.error(f"Error processing upload: {str(e)}")
                        task.status = "failed"
                        task.error = str(e)
                    
                    finally:
                        self.upload_queue.task_done()
                        
            except Exception as e:
                error_logger.error(f"Error in upload queue processor: {str(e)}")
            time.sleep(0.1)

    def get_upload_status(self, filename):
        """Get the status of an uploaded file's processing."""
        with self.upload_processor_lock:
            task = self.upload_tasks.get(filename)
            if task:
                return {
                    'filename': filename,
                    'status': task.status,
                    'timestamp': task.timestamp,
                    'transcription': task.transcription if task.status == "completed" else None,
                    'error': task.error if task.status == "failed" else None
                }
            return None

    def stop(self):
        """Stop all threads."""
        try:
            self.running = False
            for thread in self.threads:
                thread.join(timeout=1.0)
            db_logger.info("MultiChannelAudioHandler stopped successfully")
        except Exception as e:
            error_logger.error(f"Error stopping MultiChannelAudioHandler: {str(e)}")

    def get_all_recordings(self):
        """Get all recordings across all channels, considering settings."""
        with open(SETTINGS_JSON_PATH, 'r') as settings_file:
            settings = json.load(settings_file)
        
        global_hallucination = settings.get("global_hallucination", "False") == "True"
        
        with self.db_lock:
            conn = sqlite3.connect(DB_PATH)
            try:
                cursor = conn.cursor()
                cursor.execute('''
                    SELECT id, channel_id, filename, timestamp, transcription
                    FROM recordings
                    ORDER BY timestamp DESC
                ''')
                recordings = cursor.fetchall()
                
                filtered_recordings = []
                for row in recordings:
                    transcription = row[4]
                    if global_hallucination and transcription in ("...", "."):
                        continue
                    filtered_recordings.append({
                        'id': row[0],
                        'channel_id': row[1],
                        'filename': row[2],
                        'timestamp': row[3],
                        'transcription': transcription
                    })
                
                return filtered_recordings
            
            except sqlite3.Error as e:
                error_logger.error(f"Error retrieving all recordings: {str(e)}")
                return []
            finally:
                conn.close()

    def get_channel_recordings(self, channel_id):
        """Get recordings for a specific channel."""
        channel = self.get_or_create_channel(channel_id)
        return channel.get_recordings()

    def process_uploaded_file(self, file_path, channel_id):
        """Process an uploaded audio file and save its transcription."""
        try:
            channel = self.get_or_create_channel(channel_id)
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")

            transcription_logger.info(f"Starting transcription for uploaded file: {file_path}")
            transcription = self.transcription_service.transcribe_audio(
                file_path 
            )
            transcription_logger.info(f"Transcription completed for uploaded file: {file_path}")

            if transcription:
                channel.save_recording(file_path, timestamp, transcription)
                return True, {
                    'filename': os.path.basename(file_path),
                    'timestamp': timestamp,
                    'transcription': transcription
                }
            else:
                return False, "Transcription failed - no result returned"

        except Exception as e:
            error_logger.error(f"Error processing uploaded file: {str(e)}")
            return False, str(e)

# Singleton instance
_audio_handler = None

def get_audio_handler():
    """Get the singleton audio handler instance, initializing if necessary."""
    global _audio_handler
    if _audio_handler is None:
        try:
            _audio_handler = init_audio_handler()
        except Exception as e:
            error_logger.error(f"Failed to initialize audio handler in get_audio_handler: {str(e)}")
            raise
    return _audio_handler

def init_audio_handler():
    """Initialize the singleton audio handler instance."""
    global _audio_handler
    if _audio_handler is None:
        try:
            init_db()
            settings = load_settings()
            model_name = settings.get("global_model", "tiny.en")

            trans_local = settings.get("global_transcribe_local", "False")
            trans_node = settings.get("global_transcribe_node", "False")
            trans_openai = settings.get("global_transcribe_openai", "False")

            _audio_handler = MultiChannelAudioHandler(
                model_name=model_name,
                trans_local=trans_local,
                trans_node=trans_node,
                trans_openai=trans_openai,
            )
            _audio_handler.start()
            db_logger.info("Audio handler initialized successfully")
            return _audio_handler
        except Exception as e:
            error_logger.error(f"Failed to initialize audio handler: {str(e)}")
            raise
    return _audio_handler