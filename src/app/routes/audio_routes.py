import json
import os
import re
import logging
from flask import Blueprint, jsonify, request, send_from_directory, render_template,abort
from flask_cors import CORS
import glob
from werkzeug.utils import secure_filename
from werkzeug.security import generate_password_hash, check_password_hash

from app.services.audio_handler import get_audio_handler
from datetime import datetime,timezone
from ..utils.logging_setup import error_logger,event_logger
import threading
import sqlite3
from serial import Serial, SerialException
import serial.tools.list_ports

db_lock = threading.Lock()
DB_PATH = os.path.join('db', 'default.db')

# New lock for channels.json
channels_json_lock = threading.Lock()

logs_bp = Blueprint('logs', __name__)
# logs_bp = Blueprint('logs', __name__)

LOG_TYPES = {
    'error': 'logs/errors.log',
    'warning': 'logs/warnings.log',
    'transcription': 'logs/transcription.log',
    'database': 'logs/database.log',
    'event': 'logs/event.log'
}

settings_bp = Blueprint('settings', __name__)


# Path to settings.json
SETTINGS_JSON_PATH = os.path.join('db', 'settings.json')
USERS_JSON_PATH = os.path.join('db', 'users.json')
branding_bp = Blueprint('branding', __name__)
# Configuration
UPLOAD_FOLDER = 'uploads'
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'ico'}
BRANDING_JSON_PATH = os.path.join('db', 'branding.json')
audio_bp = Blueprint('audio', __name__)

# Set the path to the JSON file
CHANNELS_JSON_PATH = os.path.join('db', 'channels.json')
FREQUENCIES_JSON_PATH = os.path.join('db', 'frequencies.json')
BRANDING_JSON_PATH = os.path.join('db', 'branding.json')

# Load channels.json for MAC to channel_id mapping
with open(CHANNELS_JSON_PATH, 'r') as f:
    CHANNELS = json.load(f)

# Set the base directory for recordings
RECORDINGS_DIR = os.path.join(os.getcwd(), 'recordings')

# event_bp = Blueprint('event', __name__)
# @audio_bp.route('/')
# def index():
#     return render_template('index.html')

ALLOWED_EXTENSIONS = {'wav', 'mp3'}

def allowed_file(filename):
    """Check if the file extension is allowed."""
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def get_channel_id_from_mac(mac, refresh=False):
    """
    Retrieve channel_id from MAC address.
    
    Args:
        mac (str): The MAC address to look up
        refresh (bool): Whether to refresh channel data from disk
        
    Returns:
        int or None: The channel ID if found, None otherwise
    """
    global CHANNELS
    
    # Reload channels from JSON file if refresh is True
    if refresh:
        try:
            with open(CHANNELS_JSON_PATH, 'r') as f:
                CHANNELS = json.load(f)
        except Exception as e:
            error_logger.error(f"Error refreshing channels from JSON: {str(e)}")
            # Continue with existing CHANNELS data if refresh fails
    
    # Look up the channel ID by MAC address
    if mac:
        mac = mac.upper()  # Normalize MAC address to uppercase
        for channel in CHANNELS:
            if channel.get('mac') == mac:
                return channel.get('id')
    
    return None
def get_channel_details(channel_id):
    """Retrieve channel_id from MAC address."""
    if os.path.exists(CHANNELS_JSON_PATH):
        with open(CHANNELS_JSON_PATH, 'r') as f:
            channel = json.load(f)
    for channel in CHANNELS:
        if channel['id'] == channel_id:
            return channel
    return None


def get_channel_details(channel_id):
    """
    Fetch the latest channel details from the JSON file.
    
    Args:
        channel_id (int): The channel ID to look up
        
    Returns:
        dict: Channel details including sensitivity, silence, etc.
    """
    channel_details = {}
    
    try:
        # Always read the latest data from file
        if os.path.exists(CHANNELS_JSON_PATH):
            with open(CHANNELS_JSON_PATH, 'r') as f:
                channels_data = json.load(f)

            # Extract details for the specific channel
            for channel in channels_data:
                if channel.get('id') == channel_id:
                    channel_details = {
                        'sensitivity': channel.get('sensitivity', '10'),
                        'silence': channel.get('silence', '1600'),
                        'min_rec': channel.get('min_rec', '1000'),
                        'max_rec': channel.get('max_rec', '10000'),
                        'audio_gain': channel.get('audio_gain', '0'),
                        'state': 'stop' if channel.get('status') == 'disabled' else channel.get('status', 'resume'),
                    }
                    break
    except Exception as e:
        error_logger.error(f"Error fetching channel details: {str(e)}")
    
    return channel_details


# Initialize CHANNELS global variable
CHANNELS = []

# Load initial channel data
try:
    with open(CHANNELS_JSON_PATH, 'r') as f:
        CHANNELS = json.load(f)
except Exception as e:
    error_logger.error(f"Error loading initial channel data: {str(e)}")
    
# Update your route handlers
@audio_bp.route('/api/uploads', methods=['POST'])
def upload_audio():
    """Handle audio file uploads with real-time channel MAC address fetching."""
    try:
        mac = request.args.get('mac')
        if not mac:
            return jsonify({'error': 'MAC address is required'}), 400

        # Fetch latest channel information directly from JSON file
        channel_id = get_channel_id_from_mac(mac, refresh=True)
        if channel_id is None:
            return jsonify({'error': 'Invalid MAC address'}), 400

        if 'file' not in request.files:
            return jsonify({'error': 'No file part in the request'}), 400

        file = request.files['file']
        if file.filename == '':
            return jsonify({'error': 'No file selected for uploading'}), 400

        if file and allowed_file(file.filename):
            # Generate filename with current date and time
            current_time = datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')
            filename = f"audio_{current_time}.wav"

            # Create relative path for database storage
            relative_path = os.path.join('recordings', f'channel_{channel_id}', filename)
            # Create absolute path for file saving
            absolute_path = os.path.join(os.getcwd(), relative_path)

            # Create directory for the channel if it doesn't exist
            os.makedirs(os.path.dirname(absolute_path), exist_ok=True)

            # Save the file
            file.save(absolute_path)

            # Get audio handler instance and queue the file for processing
            audio_handler = get_audio_handler()
            success, result = audio_handler.queue_upload_for_processing(relative_path, channel_id)

            if success:
                # Fetch latest channel details directly from JSON file
                channel_details = get_channel_details(channel_id)
                
                return jsonify({
                    'message': 'File uploaded successfully and queued for processing',
                    'filename': relative_path,  # Return the relative path
                    'timestamp': result.get('timestamp'),
                    'status': result.get('status'),
                    'channel_id': channel_id,
                    'channel_details': channel_details
                }), 200

            return jsonify({'error': f'Error queueing file: {result}'}), 500

        return jsonify({'error': 'Allowed file types are wav, mp3'}), 400

    except Exception as e:
        error_logger.error(f"Error in upload_audio: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500
@audio_bp.route('/api/uploads/<filename>/status', methods=['GET'])
def get_upload_status(filename):
    """Get the processing status of an uploaded file."""
    try:
        audio_handler = get_audio_handler()
        status = audio_handler.get_upload_status(filename)
        
        if status is None:
            return jsonify({'error': 'File not found'}), 404
            
        return jsonify(status), 200
        
    except Exception as e:
        error_logger.error(f"Error getting upload status: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500
@audio_bp.route('/api/recordings')
def get_recordings():
    audio_handler = get_audio_handler()
    return jsonify(audio_handler.get_all_recordings() if audio_handler else [])


@audio_bp.route('/api/channel/<int:channel_id>/recordings')
def get_channel_recordings(channel_id):
    audio_handler = get_audio_handler()
    return jsonify(audio_handler.get_channel_recordings(channel_id) if audio_handler else [])

@audio_bp.route('/api/channels')
def get_channels():
    """Fetch and return all channels with default values for missing fields."""
    if os.path.exists(CHANNELS_JSON_PATH):
        with open(CHANNELS_JSON_PATH, 'r') as f:
            channels_data = json.load(f)
        
        # Add default values for model and language if not present
        for channel in channels_data:
            channel.setdefault('model', 'medium.en')  # Default model
            channel.setdefault('src_language', 'english')  # Default language
        
        return jsonify(channels_data)
    
    return jsonify([])
@audio_bp.route('/api/channel/<int:channel_id>', methods=['PUT'])
def update_channel(channel_id):
    """Update a channel's data."""
    data = request.get_json()

    if not data:
        return jsonify({'error': 'Request body is missing or invalid'}), 400

    # Load existing channel data
    if os.path.exists(CHANNELS_JSON_PATH):
        with open(CHANNELS_JSON_PATH, 'r') as f:
            channels_data = json.load(f)

        # Find the channel by ID
        channel = next((c for c in channels_data if c['id'] == channel_id), None)
        if not channel:
            return jsonify({'error': 'Channel not found'}), 404

        # Validate required fields if they're provided
        if 'name' in data and not data['name']:
            return jsonify({'error': 'Name cannot be empty'}), 400
        if 'status' in data and not data['status']:
            return jsonify({'error': 'Status cannot be empty'}), 400

        # Validate color formats if they're provided
        hex_color_pattern = r'^#[0-9A-Fa-f]{6}$'
        colors_to_validate = [
            ('color', data.get('color')),
            ('background_color', data.get('background_color')),
            ('team_color', data.get('team_color'))
        ]
        for color_field, color_value in colors_to_validate:
            if color_value and not re.match(hex_color_pattern, color_value):
                return jsonify({'error': f'Invalid {color_field} format. Use a hex color code (e.g., #RRGGBB).'}), 400

        # Validate audio settings if they're provided
        audio_validations = [
            ('sensitivity', data.get('sensitivity'), lambda x: 0 <= float(x) <= 100, "Sensitivity must be between 0 and 100."),
            ('silence', data.get('silence'), lambda x: 500 <= float(x) <= 5000, "Silence must be between 500 and 5000 milliseconds."),
            ('min_rec', data.get('min_rec'), lambda x: 1000 <= float(x) <= 5000, "Min recording time must be between 1000 and 5000 milliseconds."),
            ('max_rec', data.get('max_rec'), lambda x: 10000 <= float(x) <= 30000, "Max recording time must be between 10000 and 30000 milliseconds."),
            ('audio_gain', data.get('audio_gain'), lambda x: 0 <= float(x) <= 5, "Audio gain must be between 0 and 5.")
        ]

        for field, value, validation_func, error_msg in audio_validations:
            if value is not None:  # Only validate if the field is provided
                try:
                    float_value = float(value)
                    if not validation_func(float_value):
                        return jsonify({'error': error_msg}), 400
                except ValueError:
                    return jsonify({'error': f'Invalid {field} value. Must be a number.'}), 400

        # Update only the fields that were provided in the request
        fields_to_update = [
            'name', 'status', 'model', 'color', 'background_color', 'team_color',
            'src_language', 'target_language', 'sensitivity', 'silence', 'min_rec',
            'max_rec', 'audio_gain', 'driver', 'mac', 'person', 'tag', 'car',
            'frequency', 'tone', 'type'
        ]

        for field in fields_to_update:
            if field in data:
                channel[field] = data[field]

        # Save updated data back to the file
        with open(CHANNELS_JSON_PATH, 'w') as f:
            json.dump(channels_data, f, indent=4)

        return jsonify({'message': 'Channel updated successfully'}), 200

    return jsonify({'error': 'Channels file not found'}), 500
@audio_bp.route('/api/channel', methods=['POST'])
def create_channel():
    """
    Create a new channel with the provided data.
    """
    data = request.get_json()

    if not data:
        return jsonify({'error': 'Request body is missing or invalid'}), 400

    # Extract data from request, using defaults for optional fields
    name = data.get('name')
    status = data.get('status', "enabled")
    model = data.get('model', 'medium.en')
    src_language = data.get('src_language', 'english')
    target_language = data.get('target_language', 'english')
    color = data.get('color', '#000000')
    background_color = data.get('background_color', '#FFFFFF')
    team_color = data.get('team_color', '#FFFFFF')
    car = data.get('car', 'car name')
    driver = data.get('driver', 'driver name')
    person = data.get('person', 'person name')
    tag = data.get('tag', 'tag')
    mac = data.get('mac', 'mac address')
    
    # New audio settings with default values
    sensitivity = data.get('sensitivity', '10')
    silence = data.get('silence', '1000')
    min_rec = data.get('min_rec', '1000')
    max_rec = data.get('max_rec', '10000')
    audio_gain = data.get('audio_gain', '0')

    # Validate required fields
    if not name:
        return jsonify({'error': 'Missing required field: name'}), 400

    # Validate color formats
    hex_color_pattern = r'^#[0-9A-Fa-f]{6}$'
    if not all(re.match(hex_color_pattern, c) for c in [color, background_color, team_color]):
        return jsonify({'error': 'Invalid color format. Use a hex color code (e.g., #RRGGBB).'}), 400

    # Validate audio settings
    try:
        float_sensitivity = float(sensitivity)
        float_silence = float(silence)
        float_min_rec = float(min_rec)
        float_max_rec = float(max_rec)
        float_audio_gain = float(audio_gain)

        if not (0 <= float_sensitivity <= 100):
            raise ValueError("Sensitivity must be between 0 and 100.")
        if not (500 <= float_silence <= 5000):
            raise ValueError("Silence must be between 500 and 5000 milliseconds.")
        if not (1000 <= float_min_rec <= 5000):
            raise ValueError("Min recording time must be between 1000 and 5000 milliseconds.")
        if not (10000 <= float_max_rec <= 30000):
            raise ValueError("Max recording time must be between 10000 and 30000 milliseconds.")
        if not (0 <= float_audio_gain <= 5):
            raise ValueError("Audio gain must be between 0 and 5.")
    except ValueError as e:
        return jsonify({'error': str(e)}), 400

    # Load existing channels or initialize an empty list
    channels_data = []
    if os.path.exists(CHANNELS_JSON_PATH):
        with open(CHANNELS_JSON_PATH, 'r') as f:
            channels_data = json.load(f)

    # Determine the next ID for the new channel
    new_id = max([channel['id'] for channel in channels_data], default=0) + 1

    # Create new channel entry
    new_channel = {
        'id': new_id,
        'name': name,
        'status': status,
        'model': model,
        'src_language': src_language,
        'target_language': target_language,
        'color': color,
        'background_color': background_color,
        'team_color': team_color,
        'car': car,
        'driver': driver,
        'person': person,
        'tag': tag,
        'mac': mac,
        'sensitivity': sensitivity,
        'silence': silence,
        'min_rec': min_rec,
        'max_rec': max_rec,
        'audio_gain': audio_gain
    }

    channels_data.append(new_channel)

    # Save the updated data back to the file
    with open(CHANNELS_JSON_PATH, 'w') as f:
        json.dump(channels_data, f, indent=4)

    return jsonify({'message': 'Channel created successfully', 'channel_id': new_id}), 201
@audio_bp.route('/api/recordings/<path:filename>')
def serve_audio(filename):
    # Construct the full file path
    file_path = os.path.join(RECORDINGS_DIR, filename)
    
    # Check if the file exists
    if os.path.exists(file_path) and os.path.isfile(file_path):
        return send_from_directory(RECORDINGS_DIR, filename)
    
    # If the file doesn't exist, return a 404 error
    return abort(404, description="Audio file not found")


# settings 

def init_settings():
    """Initialize settings file if it doesn't exist"""
    try:
        # Ensure directory exists
        os.makedirs(os.path.dirname(SETTINGS_JSON_PATH), exist_ok=True)
        
        # Default settings structure
        default_settings = {
            "global_model": "medium.en",
            "global_target_language": "english",
            "global_hallucination": "False",
            "global_timezone": "UTC",
            "keywords": []
        }
        
        # Create or validate settings file
        if not os.path.exists(SETTINGS_JSON_PATH):
            with open(SETTINGS_JSON_PATH, 'w') as f:
                json.dump(default_settings, f, indent=4)
            return default_settings
        
        # Read and validate existing settings
        try:
            with open(SETTINGS_JSON_PATH, 'r') as f:
                settings = json.load(f)
            
            # Ensure all required keys exist
            missing_keys = False
            for key in default_settings:
                if key not in settings:
                    settings[key] = default_settings[key]
                    missing_keys = True
            
            # If any keys were missing, update the file
            if missing_keys:
                with open(SETTINGS_JSON_PATH, 'w') as f:
                    json.dump(settings, f, indent=4)
            
            return settings
            
        except json.JSONDecodeError:
            # If file is corrupted, recreate it
            with open(SETTINGS_JSON_PATH, 'w') as f:
                json.dump(default_settings, f, indent=4)
            return default_settings
            
    except Exception as e:
        logging.error(f"Error initializing settings: {str(e)}")
        raise
def init_users():
    """Initialize settings file if it doesn't exist"""
    try:
        # Ensure directory exists
        os.makedirs(os.path.dirname(USERS_JSON_PATH), exist_ok=True)
        
        # Default settings structure
        default_users = {
            "admin1": {
               "password": "admin@123"
                   },
            "admin2": {
                "password": "admin@123"
            }
        }
        
        # Create or validate settings file
        if not os.path.exists(USERS_JSON_PATH):
            with open(USERS_JSON_PATH, 'w') as f:
                json.dump(default_users, f, indent=4)
            return default_users
        
        # Read and validate existing settings
        try:
            with open(USERS_JSON_PATH, 'r') as f:
                settings = json.load(f)
            
            # Ensure all required keys exist
            missing_keys = False
            for key in default_users:
                if key not in settings:
                    settings[key] = default_users[key]
                    missing_keys = True
            
            # If any keys were missing, update the file
            if missing_keys:
                with open(USERS_JSON_PATH, 'w') as f:
                    json.dump(settings, f, indent=4)
            
            return settings
            
        except json.JSONDecodeError:
            # If file is corrupted, recreate it
            with open(USERS_JSON_PATH, 'w') as f:
                json.dump(default_users, f, indent=4)
            return default_users
            
    except Exception as e:
        logging.error(f"Error initializing users: {str(e)}")
        raise

@settings_bp.route('/api/settings/keywords', methods=['POST'])
def add_keyword():
    """Add a new keyword"""
    try:
        # Validate request data
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400
            
        if 'keyword' not in data:
            return jsonify({'error': 'Keyword is required'}), 400
            
        keyword = data.get('keyword')
        if not isinstance(keyword, str):
            return jsonify({'error': 'Keyword must be a string'}), 400
            
        keyword = keyword.strip()
        if not keyword:
            return jsonify({'error': 'Keyword cannot be empty'}), 400
        
        # Initialize or get current settings
        try:
            settings = init_settings()
            
            # Ensure keywords is a list
            if not isinstance(settings.get('keywords', []), list):
                settings['keywords'] = []
            
            # Add keyword if not already present
            if keyword not in settings['keywords']:
                settings['keywords'].append(keyword)
                
                # Write updated settings
                with open(SETTINGS_JSON_PATH, 'w') as f:
                    json.dump(settings, f, indent=4)
            
            return jsonify({
                'message': 'Keyword added successfully',
                'keywords': settings['keywords']
            })
            
        except Exception as e:
            logging.error(f"Error processing settings: {str(e)}")
            return jsonify({'error': f'Settings error: {str(e)}'}), 500
        
    except Exception as e:
        logging.error(f"Error adding keyword: {str(e)}")
        return jsonify({'error': str(e)}), 500

@settings_bp.route('/api/settings/keywords/<keyword>', methods=['DELETE'])
def remove_keyword(keyword):
    """Remove a keyword"""
    try:
        # Get current settings
        settings = init_settings()
        
        # Ensure keywords exists and is a list
        if not isinstance(settings.get('keywords', []), list):
            settings['keywords'] = []
        
        # Remove keyword if it exists
        if keyword in settings['keywords']:
            settings['keywords'].remove(keyword)
            
            # Save updated settings
            with open(SETTINGS_JSON_PATH, 'w') as f:
                json.dump(settings, f, indent=4)
            
        return jsonify({
            'message': 'Keyword removed successfully',
            'keywords': settings['keywords']
        })
        
    except Exception as e:
        logging.error(f"Error removing keyword: {str(e)}")
        return jsonify({'error': str(e)}), 500
    
@settings_bp.route('/api/settings', methods=['GET'])
def get_settings():
            """Fetch all settings"""
            init_settings()
            try:
                with open(SETTINGS_JSON_PATH, 'r') as f:
                    settings = json.load(f)
                return jsonify(settings)
            except Exception as e:
                return jsonify({'error': str(e)}), 500
def init_users():
    """Initialize users.json if it doesn't exist"""
    try:
        with open(USERS_JSON_PATH, 'r') as f:
            json.load(f)
    except FileNotFoundError:
        with open(USERS_JSON_PATH, 'w') as f:
            # Create with default admin user
            default_users = {
                "admin@example.com": {
                    "name": "Admin User",
                    "password": "admin123",
                    "role": "admin",
                    "status": "Active",
                    # "lastActive": "Just now",
                    "accessLevel": "Level 3"
                }
            }
            json.dump(default_users, f, indent=4)

def init_users():
    """Initialize users.json if it doesn't exist"""
    if not os.path.exists(USERS_JSON_PATH):
        with open(USERS_JSON_PATH, 'w') as f:
            json.dump({}, f)

@settings_bp.route('/api/users', methods=['GET'])
def get_users():
    """Fetch all users"""
    init_users()
    try:
        with open(USERS_JSON_PATH, 'r') as f:
            users = json.load(f)
        return jsonify(users)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@settings_bp.route('/api/users', methods=['POST'])
def create_user():
    """Create a new user"""
    try:
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['email', 'password', 'name', 'role']
        if not all(field in data for field in required_fields):
            return jsonify({'error': 'Missing required fields'}), 400
            
        # Validate role
        if data['role'] not in ['admin', 'member']:
            return jsonify({'error': 'Invalid role'}), 400
            
        with open(USERS_JSON_PATH, 'r') as f:
            users = json.load(f)
            
        # Check if email already exists
        if data['email'] in users:
            return jsonify({'error': 'Email already exists'}), 409
        
        # Create new user object
        new_user = {
            'name': data['name'],
            'password': data['password'],
            'role': data['role'],
            'status': 'Active',
            # 'lastActive': 'Just now',
            'accessLevel': 'Level 3' if data['role'] == 'admin' else 'Level 1'
        }
        
        # Save to JSON file
        users[data['email']] = new_user
        with open(USERS_JSON_PATH, 'w') as f:
            json.dump(users, f, indent=4)
            
        return jsonify({'message': 'User created successfully', 'user': {**new_user, 'email': data['email']}}), 201
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@settings_bp.route('/api/users/<email>', methods=['PUT'])
def update_user(email):
    """Update an existing user"""
    try:
        data = request.get_json()
        
        with open(USERS_JSON_PATH, 'r') as f:
            users = json.load(f)
            
        if email not in users:
            return jsonify({'error': 'User not found'}), 404
            
        # Update allowed fields
        if 'name' in data:
            users[email]['name'] = data['name']
        if 'role' in data:
            if data['role'] not in ['admin', 'member']:
                return jsonify({'error': 'Invalid role'}), 400
            users[email]['role'] = data['role']
            users[email]['accessLevel'] = "Level 3" if data['role'] == 'admin' else "Level 1"
        if 'password' in data and data['password']:
            users[email]['password'] = data['password']
            
        with open(USERS_JSON_PATH, 'w') as f:
            json.dump(users, f, indent=4)
            
        return jsonify({
            'message': 'User updated successfully',
            'user': {**users[email], 'email': email}
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@settings_bp.route('/api/users/<email>', methods=['DELETE'])
def delete_user(email):
    """Delete a user"""
    try:
        with open(USERS_JSON_PATH, 'r') as f:
            users = json.load(f)
            
        if email not in users:
            return jsonify({'error': 'User not found'}), 404
            
        # Prevent deleting the last admin
        # remaining_admins = sum(1 for u in users.values() if u['role'] == 'admin')
        # if users[email]['role'] == 'admin' and remaining_admins <= 1:
        #     return jsonify({'error': 'Cannot delete the last admin user'}), 400
            
        del users[email]
        
        with open(USERS_JSON_PATH, 'w') as f:
            json.dump(users, f, indent=4)
            
        return jsonify({'message': 'User deleted successfully'})
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500
@settings_bp.route('/api/settings', methods=['PUT'])
def update_settings():
    """Update settings"""
    init_settings()
    try:
        data = request.get_json()
        
        # Validate required fields
        if not isinstance(data, dict):
            return jsonify({'error': 'Invalid data format'}), 400

        with open(SETTINGS_JSON_PATH, 'r') as f:
            current_settings = json.load(f)
        
        # Update fields if provided
        updateable_fields = [
            'global_model',
            'global_target_language',
            'global_transcribe_local',
            'global_transcribe_openai',
            'global_hallucination',
            'global_timezone',
            'global_transcribe_node'
        ]
        
        for field in updateable_fields:
            if field in data:
                current_settings[field] = data[field]
        
        with open(SETTINGS_JSON_PATH, 'w') as f:
            json.dump(current_settings, f, indent=4)
        
        return jsonify({'message': 'Settings updated successfully'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500
def parse_log_line(line):
    try:
        # Expected format: '2024-01-07 10:30:45 - logger_name - LEVEL - Message'
        parts = line.split(' - ', 3)
        if len(parts) == 4:
            timestamp_str, logger_name, level, message = parts
            return {
                'timestamp': timestamp_str.strip(),
                'logger': logger_name.strip(),
                'level': level.strip(),
                'message': message.strip()
            }
    except Exception:
        pass
    return None

@logs_bp.route('/api/logs', methods=['GET'])
def get_all_logs():
    all_logs = {}
    
    for log_type, log_path in LOG_TYPES.items():
        try:
            if os.path.exists(log_path):
                with open(log_path, 'r') as f:
                    logs = [parse_log_line(line) for line in f.readlines()]
                    all_logs[log_type] = [log for log in logs if log is not None]
            else:
                all_logs[log_type] = []
        except Exception as e:
            all_logs[log_type] = []
    
    return jsonify(all_logs)

@logs_bp.route('/api/logs/<log_type>', methods=['GET'])
def get_logs_by_type(log_type):
    if log_type not in LOG_TYPES:
        return jsonify({'error': 'Invalid log type'}), 400
        
    try:
        log_path = LOG_TYPES[log_type]
        if os.path.exists(log_path):
            with open(log_path, 'r') as f:
                logs = [parse_log_line(line) for line in f.readlines()]
                return jsonify([log for log in logs if log is not None])
        return jsonify([])
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    
@logs_bp.route('/api/logs/<log_type>', methods=['DELETE'])
def clear_logs(log_type):
    if log_type not in LOG_TYPES:
        return jsonify({'error': 'Invalid log type'}), 400
    
    try:
        log_path = LOG_TYPES[log_type]
        if os.path.exists(log_path):
            with open(log_path, 'w') as f:
                f.write('')  # Clear the content of the log file
        return jsonify({'message': f'{log_type} logs cleared successfully'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@logs_bp.route('/api/logs_clear', methods=['POST'])
def clear_all_logs():
    """
    Clears all logs across all log types.
    """
    try:
        cleared_logs = []

        for log_type, log_path in LOG_TYPES.items():
            if os.path.exists(log_path):
                with open(log_path, 'w') as f:
                    f.write('')  # Clear the content of the log file
                cleared_logs.append(log_type)

        return jsonify({
            'message': 'All logs cleared successfully',
            'cleared_logs': cleared_logs
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@settings_bp.route('/api/time', methods=['GET'])
def get_gmt_time():
    """
    API endpoint to return the current GMT time in ISO 8601 format.
    """
    current_gmt_time = datetime.now(timezone.utc).isoformat()
    return jsonify({"gmt_time": current_gmt_time})


@settings_bp.route('/api/truncate_recordings', methods=['POST'])
def truncate_recordings():
    """API route to truncate the recordings table."""
    with db_lock:
        conn = sqlite3.connect(DB_PATH)
        try:
            cursor = conn.cursor()
            cursor.execute('DELETE FROM recordings')  # Deletes all rows from the table
            conn.commit()
            return jsonify({"message": "Recordings table truncated successfully."}), 200
        except sqlite3.Error as e:
            return jsonify({"error": f"Failed to truncate recordings table: {str(e)}"}), 500
        finally:
            conn.close()
 
 
@settings_bp.route('/api/event', methods=['POST'])
def handle_event():
    try:
        # Extract MAC address from query parameters
        mac = request.args.get('mac')
        if not mac:
            error_logger.error("MAC address is missing in query parameters.")
            return jsonify({'error': 'MAC address is required in query parameters'}), 400

        mac = mac.upper()
        # event_logger.info(f"Processing event for MAC: {mac}")

        # Parse JSON body (optional)
        data = request.get_json(silent=True)

        # Use lock for thread-safe access
        with channels_json_lock:
            # Load the latest CHANNELS data from the file
            with open(CHANNELS_JSON_PATH, 'r') as f:
                CHANNELS = json.load(f)

            # Check if channel with given MAC exists
            existing_channel = next((channel for channel in CHANNELS if channel['mac'] == mac), None)

            # Default channel attributes
            default_channel = {
                "id": None,
                "mac": mac,
                "name": None,
                "status": "enabled",
                "model": "small.en",
                "src_language": "english",
                "sensitivity": "10",
                "silence": "1000",
                "min_rec": "1000",
                "max_rec": "10000",
                "audio_gain": "0",
                "color": "#000000",
                "background_color": "#ffffff",
                "team_color": "#b54f4f",
                "target_language": "english",
                "driver": "driver name",
                "person": "person name",
                "tag": "tag",
                "car": "car name",
                "state": "resume"
            }

            # If no JSON body is provided (ping request)
            if data is None:
                if existing_channel:
                    event_logger.info(f"Ping received for MAC: {mac}. Returning latest channel data.")
                    return jsonify({
                        "message": "Channel exists",
                        "channel": {
                            "audio_gain": existing_channel.get("audio_gain"),
                            "max_rec": existing_channel.get("max_rec"),
                            "min_rec": existing_channel.get("min_rec"),
                            "silence": existing_channel.get("silence"),
                            "sensitivity": existing_channel.get("sensitivity"),
                            "state": "stop" if existing_channel.get("status") == "disabled" else existing_channel.get("state", "resume"),
                        }
                    }), 200
                else:
                    # Create a new channel if none exists
                    new_channel_id = max([channel.get('id', 0) for channel in CHANNELS], default=0) + 1
                    default_channel["id"] = new_channel_id
                    default_channel["name"] = f"channel{new_channel_id}"
                    CHANNELS.append(default_channel)

                    # Save new channel to file
                    with open(CHANNELS_JSON_PATH, 'w') as f:
                        json.dump(CHANNELS, f, indent=4)

                    event_logger.info(f"Ping received for MAC: {mac}. No channel found, created new channel: {default_channel}")
                    return jsonify({
                        "message": "New channel created due to ping request",
                        "channel": {
                            "audio_gain": default_channel.get("audio_gain"),
                            "max_rec": default_channel.get("max_rec"),
                            "min_rec": default_channel.get("min_rec"),
                            "silence": default_channel.get("silence"),
                            "sensitivity": default_channel.get("sensitivity"),
                            "state": default_channel.get("state", "resume"),
                        }
                    }), 201

            # If JSON body is provided and channel exists, update only if changes are needed
            if existing_channel:
                # Check for changes
                changes_needed = False
                updated_fields = {}
                for key, value in data.items():
                    if key in existing_channel and existing_channel[key] != value:
                        changes_needed = True
                        updated_fields[key] = value

                if changes_needed:
                    # Update existing channel with provided data
                    index = CHANNELS.index(existing_channel)
                    existing_channel.update(updated_fields)
                    CHANNELS[index] = existing_channel

                    # Save updates to the file
                    with open(CHANNELS_JSON_PATH, 'w') as f:
                        json.dump(CHANNELS, f, indent=4)

                    event_logger.info(f"Updated channel for MAC: {mac}. Changes: {updated_fields}")
                else:
                    event_logger.info(f"No changes needed for MAC: {mac}. Current data matches: {data}")

                return jsonify({
                    "message": "Channel processed successfully" if changes_needed else "No update needed",
                    "channel": {
                        "audio_gain": existing_channel.get("audio_gain"),
                        "max_rec": existing_channel.get("max_rec"),
                        "min_rec": existing_channel.get("min_rec"),
                        "silence": existing_channel.get("silence"),
                        "sensitivity": existing_channel.get("sensitivity"),
                        "state": "stop" if existing_channel.get("status") == "disabled" else existing_channel.get("state", "resume"),
                    }
                }), 200

            # If MAC is new and JSON body is provided, create a new channel
            new_channel_id = max([channel.get('id', 0) for channel in CHANNELS], default=0) + 1
            default_channel["id"] = new_channel_id
            default_channel["name"] = f"channel{new_channel_id}"
            default_channel.update(data)
            CHANNELS.append(default_channel)

            # Save new channel to file
            with open(CHANNELS_JSON_PATH, 'w') as f:
                json.dump(CHANNELS, f, indent=4)

            event_logger.info(f"New channel added for MAC: {mac}. Details: {default_channel}")
            return jsonify({
                "message": "New channel added successfully",
                "channel": {
                    "audio_gain": default_channel.get("audio_gain"),
                    "max_rec": default_channel.get("max_rec"),
                    "min_rec": default_channel.get("min_rec"),
                    "silence": default_channel.get("silence"),
                    "sensitivity": default_channel.get("sensitivity"),
                    "state": default_channel.get("state", "resume"),
                }
            }), 201

    except Exception as e:
        error_logger.error(f"Error in handle_event: {str(e)}")
        return jsonify({"error": "Internal server error"}), 500
    
    
def ensure_json_file():
    """Ensure the JSON file exists with proper structure."""
    if not os.path.exists(FREQUENCIES_JSON_PATH):
        with open(FREQUENCIES_JSON_PATH, 'w') as f:
            json.dump([], f)

@audio_bp.route('/api/frequencies', methods=['GET'])
def get_frequencies():
    """Get all frequency entries."""
    ensure_json_file()
    with open(FREQUENCIES_JSON_PATH, 'r') as f:
        frequencies_data = json.load(f)
    return jsonify(frequencies_data)

@audio_bp.route('/api/frequencies', methods=['POST'])
def add_frequency():
    """Add a new frequency entry."""
    try:
        new_freq = request.json
        required_fields = ['name', 'frequency', 'type', 'tone', 'tag', 'person', 'status']
        
        # Validate required fields
        for field in required_fields:
            if field not in new_freq:
                return jsonify({'error': f'Missing required field: {field}'}), 400

        ensure_json_file()
        with open(FREQUENCIES_JSON_PATH, 'r') as f:
            frequencies_data = json.load(f)

        # Generate new ID
        new_id = max([freq.get('id', 0) for freq in frequencies_data], default=0) + 1
        new_freq['id'] = new_id
        
        # Ensure proper data types and defaults
        new_freq['frequency'] = float(new_freq['frequency'])
        new_freq['status'] = new_freq.get('status', 'active')
        
        frequencies_data.append(new_freq)

        with open(FREQUENCIES_JSON_PATH, 'w') as f:
            json.dump(frequencies_data, f, indent=4)

        return jsonify(new_freq), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@audio_bp.route('/api/frequencies/<int:freq_id>', methods=['PUT'])
def update_frequency(freq_id):
    """Update an existing frequency by ID."""
    try:
        update_data = request.json
        ensure_json_file()
        
        with open(FREQUENCIES_JSON_PATH, 'r') as f:
            frequencies_data = json.load(f)

        for freq in frequencies_data:
            if freq.get('id') == freq_id:
                # Update only provided fields
                for key, value in update_data.items():
                    if key in ['name', 'frequency', 'type', 'tone', 'tag', 'person', 'status']:
                        freq[key] = value
                
                # Ensure frequency is stored as float
                if 'frequency' in update_data:
                    freq['frequency'] = float(freq['frequency'])

                with open(FREQUENCIES_JSON_PATH, 'w') as f:
                    json.dump(frequencies_data, f, indent=4)
                    
                return jsonify(freq)

        return jsonify({'error': 'Frequency not found'}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@audio_bp.route('/api/frequencies/<int:freq_id>', methods=['DELETE'])
def delete_frequency(freq_id):
    """Delete a frequency entry by ID."""
    try:
        ensure_json_file()
        
        with open(FREQUENCIES_JSON_PATH, 'r') as f:
            frequencies_data = json.load(f)

        original_length = len(frequencies_data)
        frequencies_data = [freq for freq in frequencies_data if freq.get('id') != freq_id]

        if len(frequencies_data) == original_length:
            return jsonify({'error': 'Frequency not found'}), 404

        with open(FREQUENCIES_JSON_PATH, 'w') as f:
            json.dump(frequencies_data, f, indent=4)

        return jsonify({'message': 'Frequency deleted successfully'})
    except Exception as e:
        return jsonify({'error': str(e)}), 400
 # Create uploads directory if it doesn't exist
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@branding_bp.route('/api/branding', methods=['GET'])
def get_branding():
    """Fetch and return branding settings."""
    if os.path.exists(BRANDING_JSON_PATH):
        with open(BRANDING_JSON_PATH, 'r') as f:
            branding_data = json.load(f)
        
        # Set default values if missing
        branding_data.setdefault('organization_name', '')
        branding_data.setdefault('tagline', '')
        branding_data.setdefault('brand_colors', {
            'primary': '#2563eb',
            'secondary': '#4f46e5',
            'accent': '#ec4899'
        })
        branding_data.setdefault('font', 'inter')
        branding_data.setdefault('assets', {
            'logo': None,
            'favicon': None,
            'loader': None
        })
        
        return jsonify(branding_data)
    
    return jsonify({
        'organization_name': '',
        'tagline': '',
        'brand_colors': {
            'primary': '#2563eb',
            'secondary': '#4f46e5',
            'accent': '#ec4899'
        },
        'font': 'inter',
        'assets': {
            'logo': None,
            'favicon': None,
            'loader': None
        }
    })

# @branding_bp.route('/api/branding/upload/<asset_type>', methods=['POST'])
# def upload_asset(asset_type):
#     """Handle file uploads for branding assets."""
#     if asset_type not in ['logo', 'favicon', 'loader']:
#         return jsonify({'error': 'Invalid asset type'}), 400

#     if 'file' not in request.files:
#         return jsonify({'error': 'No file provided'}), 400

#     file = request.files['file']
#     if file.filename == '':
#         return jsonify({'error': 'No file selected'}), 400

#     if file and allowed_file(file.filename):
#         # Generate unique filename
#         filename = secure_filename(f"{asset_type}_{uuid.uuid4()}_{file.filename}")
#         filepath = os.path.join(UPLOAD_FOLDER, filename)
#         file.save(filepath)

#         # Update branding.json with new asset path
#         if os.path.exists(BRANDING_JSON_PATH):
#             with open(BRANDING_JSON_PATH, 'r') as f:
#                 branding_data = json.load(f)
#         else:
#             branding_data = {
#                 'organization_name': '',
#                 'tagline': '',
#                 'brand_colors': {
#                     'primary': '#2563eb',
#                     'secondary': '#4f46e5',
#                     'accent': '#ec4899'
#                 },
#                 'font': 'inter',
#                 'assets': {}
#             }

#         # Update the asset URL
#         if 'assets' not in branding_data:
#             branding_data['assets'] = {}
#         branding_data['assets'][asset_type] = f'/api/branding/assets/{filename}'

#         with open(BRANDING_JSON_PATH, 'w') as f:
#             json.dump(branding_data, f, indent=4)

#         return jsonify({
#             'message': 'File uploaded successfully',
#             'url': f'/api/branding/assets/{filename}'
#         })

#     return jsonify({'error': 'Invalid file type'}), 400

# @branding_bp.route('/api/branding/assets/<filename>')
# def get_asset(filename):
#     """Serve uploaded assets."""
#     try:
#         return send_file(
#             os.path.join(UPLOAD_FOLDER, filename),
#             as_attachment=False
#         )
#     except FileNotFoundError:
#         return jsonify({'error': 'File not found'}), 404

@branding_bp.route('/api/branding', methods=['PUT'])
def update_branding():
    """Update branding settings in the JSON file."""
    if not request.is_json:
        return jsonify({'error': 'Invalid request format. JSON expected'}), 400
    
    branding_data = request.get_json()

    updated_branding = {
        'organization_name': branding_data.get('organization_name', ''),
        'tagline': branding_data.get('tagline', ''),
        'brand_colors': branding_data.get('brand_colors', {
            'primary': '#2563eb',
            'secondary': '#4f46e5',
            'accent': '#ec4899'
        }),
        'font': branding_data.get('font', 'inter'),
        'assets': {
            'logo': branding_data['assets'].get('logo', None),
            'favicon': branding_data['assets'].get('favicon', None),
            'loader': branding_data['assets'].get('loader', None)
        }
    }
    
    with open(BRANDING_JSON_PATH, 'w') as f:
        json.dump(updated_branding, f, indent=4)
    
    return jsonify({'message': 'Branding settings updated successfully'}), 200


@audio_bp.route('/api/recordings/<int:recording_id>', methods=['DELETE'])
def delete_recording(recording_id):

    """Delete a specific recording by ID."""
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()

        # Get filename before deleting to remove associated audio file
        cursor.execute("SELECT filename FROM recordings WHERE id = ?", (recording_id,))
        result = cursor.fetchone()
        if not result:
            return jsonify({"error": "Recording not found"}), 404

        filename = result[0]

        # Delete the recording from the database
        cursor.execute("DELETE FROM recordings WHERE id = ?", (recording_id,))
        conn.commit()

        # Optionally, delete the audio file
        # file_path = os.path.join("path/to/recordings", filename)  # Adjust as needed
        # if os.path.exists(file_path):
        #     os.remove(file_path)

        return jsonify({"message": "Recording deleted successfully"}), 200
    except sqlite3.Error as e:
        return jsonify({"error": f"Database error: {str(e)}"}), 500
    finally:
        conn.close()
 