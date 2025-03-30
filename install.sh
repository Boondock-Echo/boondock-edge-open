#!/usr/bin/env bash

# Boondock Edge Open Installer
# Description: Installs and configures Boondock Edge services with detailed feedback.

# Define ANSI color codes for pretty output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Define variables
APP_NAME="boondockedge"
AUDIO_APP_NAME="boondockAudio"
INSTALL_DIR="/opt/$APP_NAME"
VENV_DIR="$INSTALL_DIR/venv"
PYTHON_BIN="python3"
SRC_DIR="./src"
REQUIREMENTS_FILE="requirements.txt"
FRONTEND_SERVICE_FILE="/etc/systemd/system/$APP_NAME.service"
AUDIO_SERVICE_FILE="/etc/systemd/system/$AUDIO_APP_NAME.service"
USERNAME="boondock"

# Exit on any error
set -e

# Function to display a simple progress bar
progress_bar() {
    local duration=$1
    local width=30
    for ((i = 0; i <= width; i++)); do
        printf "\r${BLUE}[%-${width}s]${NC} %d%%" "$(printf '=%.0s' $(seq 1 $i))" $((i * 100 / width))
        sleep "$(echo "$duration / $width" | bc -l)"
    done
    echo -e "\r${GREEN}[================================] 100%${NC}"
}

# Function to print status messages
status() {
    echo -e "${BLUE}==> $1${NC}"
}

# Function to print errors and exit
error() {
    echo -e "${RED}ERROR: $1${NC}" >&2
    exit 1
}

# Function to print success
success() {
    echo -e "${GREEN}SUCCESS: $1${NC}"
}

# Header
echo -e "${YELLOW}=====================================${NC}"
echo -e "${YELLOW}   Boondock Edge Open Installer      ${NC}"
echo -e "${YELLOW}=====================================${NC}"
echo "This script will install and configure the Boondock Edge services."
echo "Current date: $(date)"
echo ""

# Check if running as root
status "Checking for root privileges..."
if [ "$EUID" -ne 0 ]; then
    error "Please run this script as root (using sudo)"
fi
success "Root privileges confirmed."

# Check prerequisites
status "Verifying source directory and requirements file..."
[ -d "$SRC_DIR" ] || error "Source directory '$SRC_DIR' not found."
[ -f "$REQUIREMENTS_FILE" ] || error "Requirements file '$REQUIREMENTS_FILE' not found."
success "Source files and requirements found."

# Create user if it doesn't exist
status "Setting up user '$USERNAME'..."
if ! id "$USERNAME" >/dev/null 2>&1; then
    echo "Creating user '$USERNAME' with home directory and bash shell..."
    useradd -m -s /bin/bash "$USERNAME" || error "Failed to create user '$USERNAME'."
    echo "Please set a password for '$USERNAME' (you will be prompted):"
    passwd "$USERNAME" || error "Failed to set password for '$USERNAME'."
    usermod -aG sudo "$USERNAME" || error "Failed to add '$USERNAME' to sudo group."
    success "User '$USERNAME' created and added to sudo group."
else
    success "User '$USERNAME' already exists."
fi

# Add user to dialout group for serial port access
status "Granting serial port access to '$USERNAME'..."
usermod -aG dialout "$USERNAME" || error "Failed to add '$USERNAME' to dialout group."
success "Serial port access granted."

# Clean up existing installation
status "Checking for existing installation at '$INSTALL_DIR'..."
if [ -d "$INSTALL_DIR" ]; then
    echo "Removing old installation..."
    progress_bar 2
    rm -rf "$INSTALL_DIR" || error "Failed to remove existing directory '$INSTALL_DIR'."
    success "Old installation removed."
else
    success "No existing installation found."
fi

# Create installation directory
status "Creating new installation directory at '$INSTALL_DIR'..."
mkdir -p "$INSTALL_DIR" || error "Failed to create directory '$INSTALL_DIR'."
success "Installation directory created."

# Copy source files
status "Copying source files from '$SRC_DIR' to '$INSTALL_DIR'..."
progress_bar 3
cp -r "$SRC_DIR"/* "$INSTALL_DIR/" || error "Failed to copy source files."
success "Source files copied successfully."

# Set ownership
status "Setting ownership of '$INSTALL_DIR' to '$USERNAME'..."
chown -R "$USERNAME:$USERNAME" "$INSTALL_DIR" || error "Failed to set ownership."
success "Ownership set."

# Create Python virtual environment
status "Creating Python virtual environment in '$VENV_DIR'..."
progress_bar 2
"$PYTHON_BIN" -m venv "$VENV_DIR" || error "Failed to create virtual environment."
success "Virtual environment created."

# Install dependencies
status "Installing Python dependencies from '$REQUIREMENTS_FILE'..."
echo "Upgrading pip..."
"$VENV_DIR/bin/pip" install --upgrade pip >/dev/null 2>&1 || error "Failed to upgrade pip."
echo "Installing requirements (this may take a few minutes)..."
progress_bar 10
"$VENV_DIR/bin/pip" install -r "$REQUIREMENTS_FILE" >/dev/null 2>&1 || error "Failed to install dependencies from '$REQUIREMENTS_FILE'."
success "Dependencies installed successfully."

# Create frontend service
status "Creating systemd service for '$APP_NAME'..."
cat > "$FRONTEND_SERVICE_FILE" << EOL
[Unit]
Description=Boondock Edge Frontend Service
After=network.target

[Service]
ExecStart=$VENV_DIR/bin/python $INSTALL_DIR/run.py
WorkingDirectory=$INSTALL_DIR
Restart=always
RestartSec=5
User=$USERNAME
Group=$USERNAME

[Install]
WantedBy=multi-user.target
EOL
chown root:root "$FRONTEND_SERVICE_FILE" || error "Failed to set ownership of '$FRONTEND_SERVICE_FILE'."
chmod 644 "$FRONTEND_SERVICE_FILE" || error "Failed to set permissions on '$FRONTEND_SERVICE_FILE'."
success "Frontend service file created."

# Create audio service
status "Creating systemd service for '$AUDIO_APP_NAME'..."
cat > "$AUDIO_SERVICE_FILE" << EOL
[Unit]
Description=Boondock Edge Audio Service
After=network.target

[Service]
ExecStart=$VENV_DIR/bin/python $INSTALL_DIR/upload_service.py
WorkingDirectory=$INSTALL_DIR
Restart=always
RestartSec=5
User=$USERNAME
Group=$USERNAME

[Install]
WantedBy=multi-user.target
EOL
chown root:root "$AUDIO_SERVICE_FILE" || error "Failed to set ownership of '$AUDIO_SERVICE_FILE'."
chmod 644 "$AUDIO_SERVICE_FILE" || error "Failed to set permissions on '$AUDIO_SERVICE_FILE'."
success "Audio service file created."

# Reload systemd and enable/start services
status "Reloading systemd and configuring services..."
systemctl daemon-reload || error "Failed to reload systemd."
systemctl enable "$APP_NAME.service" "$AUDIO_APP_NAME.service" >/dev/null 2>&1 || error "Failed to enable services."
progress_bar 2
systemctl start "$APP_NAME.service" || error "Failed to start '$APP_NAME' service."
systemctl start "$AUDIO_APP_NAME.service" || error "Failed to start '$AUDIO_APP_NAME' service."
success "Services enabled and started."

# Verify services
status "Verifying service status..."
sleep 2 # Give services a moment to stabilize
if systemctl is-active "$APP_NAME.service" >/dev/null 2>&1; then
    success "'$APP_NAME.service' is running."
else
    error "'$APP_NAME.service' failed to start. Check logs with: journalctl -u $APP_NAME.service"
fi
if systemctl is-active "$AUDIO_APP_NAME.service" >/dev/null 2>&1; then
    success "'$AUDIO_APP_NAME.service' is running."
else
    error "'$AUDIO_APP_NAME.service' failed to start. Check logs with: journalctl -u $AUDIO_APP_NAME.service"
fi

# Final message
echo -e "${YELLOW}=====================================${NC}"
echo -e "${GREEN}Boondock Edge Open Installer Completed Successfully!${NC}"
echo "Services are up and running."
echo "To check status:"
echo "  sudo systemctl status $APP_NAME.service"
echo "  sudo systemctl status $AUDIO_APP_NAME.service"
echo "To view logs:"
echo "  sudo journalctl -u $APP_NAME.service"
echo "  sudo journalctl -u $AUDIO_APP_NAME.service"
echo -e "${YELLOW}=====================================${NC}"