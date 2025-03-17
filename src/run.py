#!/usr/bin/env python3
import os
import logging
from waitress import serve
from app import create_app
from app.services.audio_handler import init_audio_handler
from config import Config
from flask_cors import CORS
from app.routes.audio_routes import settings_bp
from app.services.db_initializer import initialize_db
from app.routes.audio_routes import logs_bp
from app.routes.react import react_bp
from app.routes.radio_routes import radio_bp, initialize_scanner_inventory
import threading
from zeroconf import Zeroconf, ServiceInfo
import socket
import uuid

import platform
from zeroconf import Zeroconf, ServiceInfo
try:
    import netifaces  # Only required on Linux/Raspberry Pi
except ImportError:
    netifaces = None  # Allow running on Windows without netifaces


# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler('app.log')
    ]
)
logger = logging.getLogger(__name__)

def get_mac_address():
    # Get the MAC address as a 12-character hex string
    mac = hex(uuid.getnode())[2:].zfill(12)
    return mac.upper()


# mdns is useful in auto-discovering the Boondock Edge server on a local network.
def register_mdns_service():
    zeroconf = None
    try:
        mac_address = get_mac_address()
        mac_suffix = mac_address[-6:]
        
        service_type = "_boondock-edge._tcp.local."
        service_name = f"BoondockEdgeServer_{mac_suffix}.{service_type.strip('.local.')}.local."
        port = Config.FLASK_PORT  # Ensure Config is imported or defined

        ip_addresses = set()
        is_linux = platform.system() == "Linux"  # Detect Raspberry Pi/Linux

        if is_linux and netifaces:
            # Raspberry Pi/Linux: Use netifaces
            logger.info("Detected Linux, using netifaces for IP detection")
            for interface in netifaces.interfaces():
                if interface == "lo":  # Skip loopback
                    continue
                addrs = netifaces.ifaddresses(interface).get(netifaces.AF_INET, [])
                for addr in addrs:
                    ip = addr.get("addr")
                    if ip and ip != "127.0.0.1" and ip != "127.0.1.1":
                        ip_addresses.add(ip)
        else:
            # Windows: Use original socket.getaddrinfo method
            logger.info("Detected non-Linux OS, using socket.getaddrinfo for IP detection")
            hostname = socket.gethostname()
            for info in socket.getaddrinfo(hostname, None, socket.AF_INET, socket.SOCK_STREAM):
                ip = info[4][0]
                if ip != "127.0.0.1" and ip != "127.0.1.1":
                    ip_addresses.add(ip)

        if not ip_addresses:
            raise Exception("No valid IP addresses found")

        ip_addresses = list(ip_addresses)
        logger.info(f"Found IP addresses: {', '.join(ip_addresses)}")

        addresses = [socket.inet_aton(ip) for ip in ip_addresses]

        service_info = ServiceInfo(
            type_=service_type,
            name=service_name,
            addresses=addresses,
            port=port,
            properties={
                "description": "Boondock Edge Server for Boondock Echo Audio",
                "mac": mac_address
            },
            server=f"boondock-edge_{mac_suffix}.local."
        )

        zeroconf = Zeroconf()
        logger.info(f"Registering mDNS service: {service_name} on port {port}")
        zeroconf.register_service(service_info)
        
        while True:
            threading.Event().wait(1)
        
    except Exception as e:
        logger.error(f"Error registering mDNS service: {e}")
    finally:
        if zeroconf:
            zeroconf.unregister_service(service_info)
            zeroconf.close()
            logger.info("mDNS service unregistered")

def main():
    try:
        # Initialize the DB
        initialize_db()
        logger.info("Database initialized successfully")
    except Exception as e:
        logger.error(f"Error initializing database: {e}")
        raise

    try:
        # Create Flask app instance
        app = create_app(Config)
        logger.info("Flask app created")

        # Register blueprints
        app.register_blueprint(react_bp)
        app.register_blueprint(settings_bp)
        app.register_blueprint(logs_bp)
        app.register_blueprint(radio_bp)
        logger.info("Blueprints registered")
    except Exception as e:
        logger.error(f"Error registering routes & blueprints: {e}")
        raise

    try:
        def initialize_scanners_in_background():
            print("Starting background scanner initialization...")
            summary = initialize_scanner_inventory()
            print(f"Scanner inventory initialized {summary}")

        # Start scanner initialization in a background thread
        scanner_thread = threading.Thread(target=initialize_scanners_in_background)
        scanner_thread.start()
    except Exception as e:
        logger.error(f"Error trying to initialize scanners: {e}")
        raise

    try:
        # Enable CORS globally
        CORS(app, resources={r"/api/*": {"origins": "*"}})
        logger.info("CORS enabled")

        # Initialize audio handler
        # audio_handler = init_audio_handler(
        #     host=Config.UDP_HOST,
        #     base_port=Config.UDP_PORT,
        #     num_channels=Config.CHANNELS
        # )
        # logger.info(f"Audio handler initialized with {Config.CHANNELS} channels")
    except Exception as e:
        logger.error(f"Error starting audio handler: {e}")
        raise

    try:
        # Start mDNS service in a background thread
        mdns_thread = threading.Thread(target=register_mdns_service, daemon=True)
        mdns_thread.start()
        logger.info("mDNS service thread started")
    except Exception as e:
        logger.error(f"Error starting mDNS service thread: {e}")
        raise

    try:
        # Run the app with Waitress
        logger.info(f"Starting production server on {Config.FLASK_HOST}:{Config.FLASK_PORT}")
        serve(
            app,
            host=Config.FLASK_HOST,  # Should be "0.0.0.0" to bind to all interfaces
            port=Config.FLASK_PORT,
            threads=4
        )
    except Exception as e:
        logger.error(f"Error starting application: {e}")
        raise

if __name__ == '__main__':
    main()