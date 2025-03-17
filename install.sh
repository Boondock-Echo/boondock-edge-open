#!/bin/bash

# Define variables
APP_NAME="boondockedge"
INSTALL_DIR="/opt/$APP_NAME"
VENV_DIR="$INSTALL_DIR/venv"
PYTHON_BIN="python3"
SRC_DIR="./src"
REQUIREMENTS_FILE="requirements.txt"
SERVICE_FILE="/etc/systemd/system/$APP_NAME.service"

# Exit on any error
set -e

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo "Please run this script as root (using sudo)"
    exit 1
fi

# Create installation directory
echo "Creating installation directory..."
mkdir -p "$INSTALL_DIR"

# Create Python virtual environment
echo "Creating Python virtual environment..."
$PYTHON_BIN -m venv "$VENV_DIR"

# Copy source files
echo "Copying source files..."
cp -r "$SRC_DIR"/* "$INSTALL_DIR/"

# Install requirements
echo "Installing Python dependencies..."
"$VENV_DIR/bin/pip" install --upgrade pip
"$VENV_DIR/bin/pip" install -r "$REQUIREMENTS_FILE"

# Create systemd service file
echo "Creating systemd service..."
cat > "$SERVICE_FILE" << EOL
[Unit]
Description=Boondock Edge Service
After=network.target

[Service]
ExecStart=$VENV_DIR/bin/python $INSTALL_DIR/run.py
WorkingDirectory=$INSTALL_DIR
Restart=always
User=pi
Group=pi

[Install]
WantedBy=multi-user.target
EOL

# Set permissions
echo "Setting permissions..."
chown -R pi:pi "$INSTALL_DIR"
chmod 644 "$SERVICE_FILE"

# Enable and start the service
echo "Enabling and starting service..."
systemctl daemon-reload
systemctl enable "$APP_NAME.service"
systemctl start "$APP_NAME.service"

echo "Installation completed successfully!"
echo "To check service status: systemctl status $APP_NAME.service"
echo "To view logs: journalctl -u $APP_NAME.service"