# app/routes/react.py
import os
from flask import Blueprint, send_from_directory, send_file

react_bp = Blueprint('react', __name__)

# Path to React build directory
BUILD_DIR = os.path.join(os.getcwd(), 'build')

@react_bp.route('/static/<path:filename>')
def serve_static(filename):
    """
    Serve static files from React build directory, handling nested folders
    """
    return send_from_directory(os.path.join(BUILD_DIR, 'static'), filename)

@react_bp.route('/assets/<path:filename>')
def serve_assets(filename):
    """
    Serve asset files from React build directory
    """
    return send_from_directory(os.path.join(BUILD_DIR, 'assets'), filename)

@react_bp.route('/<path:path>')
def serve_build_files(path):
    """Serve other build files (favicon, manifest, etc.)"""
    if os.path.exists(os.path.join(BUILD_DIR, path)):
        return send_from_directory(BUILD_DIR, path)
    return send_file(os.path.join(BUILD_DIR, 'index.html'))

@react_bp.route('/', defaults={'path': ''})
def serve_react(path):
    """Serve React app for root route"""
    return send_file(os.path.join(BUILD_DIR, 'index.html'))

# Additional catch-all route for client-side routing
@react_bp.route('/<path:path>')
def serve_react_routes(path):
    """Serve React app for all other routes"""
    return send_file(os.path.join(BUILD_DIR, 'index.html'))