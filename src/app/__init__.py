# app/__init__.py
from flask import Flask
from config import Config

def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)
    
    # Import and register blueprints inside create_app to avoid circular imports
    from app.routes.audio_routes import audio_bp ,branding_bp
    app.register_blueprint(audio_bp)
    app.register_blueprint(branding_bp)
    
    return app