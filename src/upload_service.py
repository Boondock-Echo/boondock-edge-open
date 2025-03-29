from flask import Flask, request, jsonify, Blueprint
import os
import json
import sqlite3
from datetime import datetime
import logging
from pytz import timezone
import time
import requests
from config import Config

# Set up logging
error_logger = logging.getLogger('error_logger')
error_logger.setLevel(logging.ERROR)
handler = logging.FileHandler('error.log')
error_logger.addHandler(handler)

# Initialize Flask app
app = Flask(__name__)
audio_bp = Blueprint('audio', __name__)

# Configuration
CHANNELS_JSON_PATH = os.path.join('db', 'channels.json')
DB_PATH = os.path.join('db', 'default.db')
QUEUE_JSON_PATH = os.path.join('db', 'queue.json')
ALLOWED_EXTENSIONS = {'wav', 'mp3'}
CHANNELS = []
QUEUE_URL = f'http://{Config.EVENT_HOST}:{Config.EVENT_PORT}/api/uploads/queue'

# Database connection with retry mechanism
def get_db_connection():
    for _ in range(5):
        try:
            conn = sqlite3.connect(DB_PATH, timeout=10)
            conn.execute('PRAGMA journal_mode=WAL;')
            return conn
        except sqlite3.OperationalError as e:
            if 'database is locked' in str(e):
                time.sleep(0.1)
                continue
            raise
    raise sqlite3.OperationalError("Database is locked after multiple retries")

# Database initialization
def init_db():
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS recordings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                channel_id INTEGER,
                filename TEXT,
                timestamp TEXT,
                transcription TEXT,
                status TEXT DEFAULT 'new'
            )
        ''')
        cursor.execute('''
            CREATE INDEX IF NOT EXISTS idx_recordings_timestamp
            ON recordings(timestamp DESC)
        ''')
        conn.commit()

# Initialize queue.json if it doesn't exist
def init_queue_file():
    if not os.path.exists(QUEUE_JSON_PATH):
        with open(QUEUE_JSON_PATH, 'w') as f:
            json.dump([], f)

def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def get_channel_id_from_mac(mac, refresh=False):
    global CHANNELS
    
    if refresh:
        try:
            with open(CHANNELS_JSON_PATH, 'r') as f:
                CHANNELS = json.load(f)
        except Exception as e:
            error_logger.error(f"Error refreshing channels from JSON: {str(e)}")
    
    if mac:
        mac = mac.upper()
        for channel in CHANNELS:
            if channel.get('mac') == mac:
                return channel.get('id')
    return None

def get_channel_details(channel_id):
    for channel in CHANNELS:
        if channel.get('id') == channel_id:
            return channel
    return None

class AudioHandler:
    def queue_upload_for_processing(self, file_path, channel_id):
        try:
            utc_tz = timezone('UTC')
            timestamp = datetime.now(utc_tz).strftime('%Y%m%d_%H%M%S')
            with get_db_connection() as conn:
                cursor = conn.cursor()
                cursor.execute(
                    'INSERT INTO recordings (channel_id, filename, timestamp, status) VALUES (?, ?, ?, ?)',
                    (channel_id, file_path, timestamp, 'queued')
                )
                conn.commit()
            
            return True, {
                'timestamp': timestamp,
                'status': 'queued'
            }
        except Exception as e:
            return False, str(e)

def get_audio_handler():
    return AudioHandler()

@audio_bp.route('/api/uploads', methods=['POST'])
def upload_audio():
    try:
        mac = request.args.get('mac')
        if not mac:
            return jsonify({'error': 'MAC address is required'}), 400

        channel_id = get_channel_id_from_mac(mac, refresh=True)
        if channel_id is None:
            return jsonify({'error': 'Invalid MAC address'}), 400

        if 'file' not in request.files:
            return jsonify({'error': 'No file part in the request'}), 400

        file = request.files['file']
        if file.filename == '':
            return jsonify({'error': 'No file selected for uploading'}), 400

        if file and allowed_file(file.filename):
            utc_tz = timezone('UTC')
            current_time = datetime.now(utc_tz).strftime('%Y%m%d_%H%M%S')
            filename = f"audio_{current_time}.wav"
            relative_path = os.path.join('recordings', f'channel_{channel_id}', filename)
            absolute_path = os.path.join(os.getcwd(), relative_path)

            os.makedirs(os.path.dirname(absolute_path), exist_ok=True)
            file.save(absolute_path)

            audio_handler = get_audio_handler()
            success, result = audio_handler.queue_upload_for_processing(relative_path, channel_id)

            if success:
                channel_details = get_channel_details(channel_id)
               
                
                # Prepare dynamic data for queue request
                queue_params = {
                    'mac': mac,
                    'relative_path': relative_path,
                    'channel_id': str(channel_id)
                }
                
                # Make POST request to queue endpoint
                try:
                    queue_response = requests.post(QUEUE_URL, params=queue_params)
                    queue_data = queue_response.json()
                    
                    if queue_response.status_code == 200 and queue_data.get('message') == 'OK':
                         #HERE IS SUCCUSS THAN UPDATE COM PLETED IN DB
                        with get_db_connection() as conn:
                            cursor = conn.cursor()
                            cursor.execute(
                                'UPDATE recordings SET status = ? WHERE filename = ?',
                                ('completed', relative_path)
                            )
                            conn.commit()
                        return jsonify({
                            'message': 'File uploaded successfully and queued for processing',
                            'filename': relative_path,
                            'timestamp': result.get('timestamp'),
                            'status': result.get('status'),
                            'channel_id': channel_id,
                            'channel_details': channel_details
                        }), 200
                    else:
                        # If queue fails, add to queue.json
                        
                        
                        error_metadata = {
                            'mac': mac,
                            'relative_path': relative_path,
                            'channel_id': channel_id,
                            'timestamp': result.get('timestamp'),
                            'error': queue_data.get('error', 'Unknown error'),
                            'attempt_time': datetime.now(utc_tz).strftime('%Y%m%d_%H%M%S')
                        }
                        with open(QUEUE_JSON_PATH, 'r+') as f:
                            queue_data = json.load(f)
                            queue_data.append(error_metadata)
                            f.seek(0)
                            json.dump(queue_data, f, indent=2)
                        
                        return jsonify({
                            'message': 'File uploaded but failed to queue',
                            'filename': relative_path,
                            'timestamp': result.get('timestamp'),
                            'status': result.get('status'),
                            'queue_error': queue_data.get('error')
                        }), 200

                except requests.exceptions.RequestException as e:
                      #HERE IF FAILS THAN UPDATE QUEUE_FAILE IN DB
                    with get_db_connection() as conn:
                            cursor = conn.cursor()
                            cursor.execute(
                                'UPDATE recordings SET status = ? WHERE filename = ?',
                                ('queue_failed', relative_path)
                            )
                            conn.commit()
                    # Handle network errors
                    error_metadata = {
                        'mac': mac,
                        'relative_path': relative_path,
                        'channel_id': channel_id,
                        'timestamp': result.get('timestamp'),
                        'error': str(e),
                        'attempt_time': datetime.now(utc_tz).strftime('%Y%m%d_%H%M%S')
                    }
                    with open(QUEUE_JSON_PATH, 'r+') as f:
                        queue_data = json.load(f)
                        queue_data.append(error_metadata)
                        f.seek(0)
                        json.dump(queue_data, f, indent=2)
                    
                    return jsonify({
                        'message': 'File uploaded but failed to queue due to network error',
                        'filename': relative_path,
                        'timestamp': result.get('timestamp'),
                        'status': result.get('status'),
                        'queue_error': str(e)
                    }), 200

            return jsonify({'error': f'Error queueing file: {result}'}), 500

        return jsonify({'error': 'Allowed file types are wav, mp3'}), 400

    except Exception as e:
        error_logger.error(f"Error in upload_audio: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

# Register blueprint and run app
app.register_blueprint(audio_bp)

if __name__ == '__main__':
    os.makedirs('db', exist_ok=True)
    init_db()
    init_queue_file()
    app.run(host='0.0.0.0', port=Config.UPLOAD_PORT, debug=True)