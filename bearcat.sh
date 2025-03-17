#!/bin/bash

# Script to force BC125AT to use usbserial instead of cdc_acm

# Check if script is run as root
if [ "$EUID" -ne 0 ]; then
    echo "Please run this script as root (use sudo)."
    exit 1
fi

# Define vendor and product IDs for BC125AT
VENDOR_ID="0x1965"
PRODUCT_ID="0x0017"

echo "Removing cdc_acm module..."
modprobe -r cdc_acm
if [ $? -eq 0 ]; then
    echo "cdc_acm removed successfully."
else
    echo "Failed to remove cdc_acm or it was not loaded."
fi

echo "Loading usbserial with vendor=$VENDOR_ID product=$PRODUCT_ID..."
modprobe usbserial vendor=$VENDOR_ID product=$PRODUCT_ID
if [ $? -eq 0 ]; then
    echo "usbserial loaded successfully."
else
    echo "Failed to load usbserial. Check if module exists or IDs are correct."
    exit 1
fi

echo "Checking for device registration..."
sleep 2  # Give the system a moment to register the device
dmesg | tail -n 10

echo "Listing available ttyUSB devices:"
ls /dev/ttyUSB* 2>/dev/null || echo "No ttyUSB devices found."

echo "Setup complete. Test your device on /dev/ttyUSB0 (or similar)."