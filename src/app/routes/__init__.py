# app/routes/__init__.py
from app.routes.react import react_bp
from app.routes.audio_routes import audio_bp, settings_bp, logs_bp ,branding_bp

def init_routes(app):
    # Register API blueprints with /api prefix
    app.register_blueprint(audio_bp, url_prefix='/api')
    app.register_blueprint(settings_bp, url_prefix='/api')
    app.register_blueprint(logs_bp, url_prefix='/api')
    app.register_blueprint(branding_bp, url_prefix='/api')
    
    # Register React blueprint last to handle all other routes
    app.register_blueprint(react_bp)
