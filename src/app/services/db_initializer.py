import sqlite3
import os
import json

DB_FILE_NAME = 'default.db'

# Path to settings.json
SETTINGS_JSON_PATH = os.path.join('db', 'settings.json')
try:
    with open(SETTINGS_JSON_PATH, 'r') as f:
        settings = json.load(f)

    DB_FILE_NAME = settings.get("event_name" , "default") + ".db"

except Exception as e:
    print("Error creating new database")

# Define the path for your SQLite database

DB_PATH = os.path.join('db', DB_FILE_NAME)

def initialize_db():
    """Initialize the SQLite database and create tables."""
    if not os.path.exists('db'):
        os.makedirs('db')
    
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Create the recordings table
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
    conn.commit()
    conn.close()
