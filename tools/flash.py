import serial.tools.list_ports
import subprocess
import requests
from pathlib import Path
import time
import sys

def find_and_flash_esp32():
    # Firmware download setup
    firmware_path = Path("./firmware")
    firmware_base_url = "https://cdn.boondockecho.com/build/edge/latest/firmware"
    files_to_download = ["firmware.bin", "partitions.bin", "bootloader.bin"]

    # Download firmware files
    print("Downloading firmware files...")
    firmware_path.mkdir(exist_ok=True)
    
    for file in files_to_download:
        url = f"{firmware_base_url}/{file}"
        target_path = firmware_path / file
        try:
            response = requests.get(url, stream=True)
            response.raise_for_status()
            with open(target_path, 'wb') as f:
                for chunk in response.iter_content(chunk_size=8192):
                    f.write(chunk)
            print(f"Downloaded {file} to {target_path}")
            if not target_path.exists():
                print(f"Error: {file} was downloaded but file not found!")
                return
        except requests.exceptions.RequestException as e:
            print(f"Error downloading {file}: {e}")
            return

    # Verify all files exist
    for file in files_to_download:
        if not (firmware_path / file).exists():
            print(f"Error: {file} not found at {firmware_path / file}")
            return

    # Find ESP32 devices
    print("\nSearching for ESP32 devices...")
    devices = []
    for port in serial.tools.list_ports.comports():
        if "10C4:EA60" in port.hwid.upper():  # CP210x USB to UART Bridge identifier
            devices.append(port.device)
    
    if not devices:
        print("No ESP32 devices found!")
        return

    # Flash each device
    for device in devices:
        print(f"\nFlashing device on {device}")
        try:
            cmd = [
                sys.executable,  # Uses the current Python interpreter
                "-m", "esptool",  # Runs esptool as a module
                "--chip", "esp32",
                "--port", device,
                "--baud", "460800",
                "--before", "default_reset",
                "--after", "hard_reset",
                "write_flash",
                "-z",
                "--flash_mode", "dio",
                "--flash_freq", "40m",
                "--flash_size", "detect",
                "0x1000", str(firmware_path / "bootloader.bin"),
                "0x8000", str(firmware_path / "partitions.bin"),
                "0x10000", str(firmware_path / "firmware.bin")
            ]
            
            print(f"Executing command: {' '.join(cmd)}")
            result = subprocess.run(cmd, capture_output=True, text=True)
            
            if result.returncode == 0:
                print(f"Successfully flashed {device}")
                print(f"Output: {result.stdout}")
            else:
                print(f"Failed to flash {device}")
                print(f"Error output: {result.stderr}")
                print(f"Return code: {result.returncode}")
            
            time.sleep(2)  # Wait between devices
            
        except Exception as e:
            print(f"Error during flashing {device}: {e}")
            print("Make sure esptool is installed (pip install esptool) and accessible")

if __name__ == "__main__":
    find_and_flash_esp32()