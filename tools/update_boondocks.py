import serial
import serial.tools.list_ports
import requests
import subprocess
from pathlib import Path

class ESP32Updater:
    def __init__(self):
        self.firmware_path = Path("./firmware")
        self.firmware_base_url = "https://cdn.boondockecho.com/firmware/edge"
        self.files_to_download = ["firmware.bin", "partitions.bin", "bootloader.bin"]
        self.channel_map = {
            "1-1.2": 1, "1-1.4": 6, "1-1.1.1": 4,
            "1-1.1.2": 3, "1-1.1.3": 2, "1-1.1.4": 5
        }

    def list_devices(self):
        return [port for port in serial.tools.list_ports.comports() 
                if "10C4:EA60" in port.hwid.upper()]

    def get_channel_number(self, device):
        location = device.hwid.split("LOCATION=")[1].split(" ")[0]
        return self.channel_map.get(location, "Unknown")

    def download_firmware(self):
        print("Downloading firmware files...")
        self.firmware_path.mkdir(exist_ok=True)
        
        for file in self.files_to_download:
            try:
                response = requests.get(f"{self.firmware_base_url}/{file}", stream=True)
                response.raise_for_status()
                
                with open(self.firmware_path / file, 'wb') as f:
                    for chunk in response.iter_content(chunk_size=8192):
                        f.write(chunk)
                print(f"Downloaded {file}")
            except requests.exceptions.RequestException as e:
                print(f"Error downloading {file}: {e}")
                return False
        return True

    def flash_device(self, port):
        print(f"\nFlashing device on {port}")
        cmd = [
            "esptool.py", "--chip", "esp32", "--port", port,
            "--baud", "115200", "--before", "default_reset", # Mark 1736985247 Slowing Baud 460800 -> 115200
            "--after", "hard_reset", "write_flash", "-z",
            "--flash_mode", "dio", "--flash_freq", "40m",
            "--flash_size", "detect",
            "0x1000", str(self.firmware_path / "bootloader.bin"),
            "0x8000", str(self.firmware_path / "partitions.bin"),
            "0x10000", str(self.firmware_path / "firmware.bin")
        ]
        
        try:
            result = subprocess.run(cmd, capture_output=True, text=True)
            if result.returncode == 0:
                print("Flash successful!")
                return True
            print(f"Flash failed: {result.stderr}")
            return False
        except Exception as e:
            print(f"Error during flashing: {e}")
            return False

    def update_all(self):
        if not self.download_firmware():
            return

        devices = self.list_devices()
        if not devices:
            print("No devices found to update")
            return

        for device in devices:
            channel = self.get_channel_number(device)
            print(f"\nUpdating Channel {channel} - {device.device}")
            if self.flash_device(device.device):
                print(f"Channel {channel} updated successfully")
            else:
                print(f"Failed to update Channel {channel}")

if __name__ == "__main__":
    updater = ESP32Updater()
    updater.update_all()
