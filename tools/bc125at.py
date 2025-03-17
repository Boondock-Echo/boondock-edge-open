import sys
import os
import serial
import serial.tools.list_ports
import logging
import time

# Configure logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")

def list_com_ports():
    """List all available COM ports on the system."""
    return [port.device for port in serial.tools.list_ports.comports()]

def send_command(scanner, command, timeout=2):
    """
    Send a command to the scanner and return the response efficiently.
    :param scanner: Open Serial object
    :param command: Command string or bytes to send (e.g., 'PRG\r' or b'PRG\r')
    :param timeout: Maximum time to wait for a response in seconds
    :return: Response string or None if failed
    """
    try:
        # Ensure command ends with \r and is in bytes
        if isinstance(command, str):
            command = command.encode('utf-8')
        if not command.endswith(b'\r'):
            command += b'\r'

        logging.info(f"Sending command: {command.decode('utf-8').strip()}")
        scanner.write(command)
        
        # Read response until newline or timeout
        response = b""
        start_time = time.time()
        while True:
            if scanner.in_waiting > 0:
                char = scanner.read(1)
                response += char
                if char == b'\r':
                    break
            if time.time() - start_time > timeout:
                logging.error(f"Timeout waiting for response to {command.decode('utf-8').strip()}")
                return None
            time.sleep(0.01)  # Small sleep to prevent CPU hogging
        
        response_str = response.decode('utf-8').strip()
        logging.info(f"Received response: {response_str}")
        return response_str
    except serial.SerialException as e:
        logging.error(f"Serial error: {e}")
        return None
    except UnicodeDecodeError as e:
        logging.error(f"Decoding error: {e}")
        return None

def check_radio_connection(port):
    """Test if the device connected to the given COM port is a BC125AT scanner."""
    try:
        with serial.Serial(port, baudrate=9600, timeout=2) as scanner:
            # Check model
            model = send_command(scanner, b'MDL\r')
            if not model or not model.startswith("MDL,BC125AT"):
                logging.info(f"Port {port} is not a BC125AT (response: {model})")
                return None

            # Get firmware version
            version = send_command(scanner, b'VER\r')
            if not version:
                return None

            # Get current ID from channel 1
            channel_info = send_command(scanner, b'CIN,1\r')
            if channel_info:
                parts = channel_info.split(',')
                unique_id = parts[1] if len(parts) > 1 and parts[1] else "UNKNOWN"
            else:
                unique_id = "UNKNOWN"

            return {"port": port, "model": model, "version": version, "programmed_id": unique_id}
    except serial.SerialException as e:
        logging.error(f"Error accessing port {port}: {e}")
        return None

def validate_input(channel, frequency, modulation, channel_name):
    """Validate inputs for channel programming."""
    if not (1 <= channel <= 500):
        raise ValueError("Channel must be between 1 and 500.")
    if not (250000 <= frequency <= 5120000):
        raise ValueError("Frequency must be between 250000 and 5120000 Hz (25.0000 - 512.0000 MHz).")
    if modulation not in ["NFM", "AM", "FM"]:
        raise ValueError("Modulation must be 'NFM', 'AM', or 'FM'.")
    if not (1 <= len(channel_name) <= 16):
        raise ValueError("Channel name must be 1-16 alphanumeric characters.")

def read_channel(port, channel):
    """Read the current settings for a specific channel."""
    try:
        if not (1 <= channel <= 500):
            raise ValueError("Channel must be between 1 and 500.")
        with serial.Serial(port, baudrate=9600, timeout=2) as scanner:
            if send_command(scanner, b'PRG\r') != "PRG,OK":
                logging.error("Failed to enter program mode")
                return None
            command = f"CIN,{channel}\r"
            response = send_command(scanner, command)
            if not response or not response.startswith("CIN,"):
                logging.error(f"Failed to read channel {channel}")
                return None

            logging.info(f"Channel {channel} = {response}")

            parts = response.split(',')
            if len(parts) < 5:
                logging.error(f"Invalid response format for channel {channel}: {response}")
                return None
            channel_name = parts[2]
            frequency = int(parts[3])
            modulation = parts[4]
            ctcss = parts[5] if len(parts) > 4 and parts[5] else ""


            if send_command(scanner, b'EPG\r') != "EPG,OK":
                logging.warning("Failed to exit program mode")
            logging.info(f"Channel {channel} read: {channel_name}, {frequency} Hz, {modulation}")
            return {
                "channel_name": channel_name,
                "frequency": frequency,
                "modulation": modulation,
                "ctcss": ctcss
            }
    except ValueError as e:
        logging.error(f"Validation error: {e}")
        return None
    except serial.SerialException as e:
        logging.error(f"Serial error: {e}")
        return None

def write_channel(port, channel, frequency, modulation, channel_name="test", ctcss=""):
    """Set a frequency for a specific channel on the BC125AT."""
    try:
        validate_input(channel, frequency, modulation, channel_name)
        with serial.Serial(port, baudrate=9600, timeout=2) as scanner:
            # Enter programming mode
            if send_command(scanner, b'PRG\r') != "PRG,OK":
                logging.error("Failed to enter program mode")
                return False

            # Program the channel
            command = f"CIN,{channel},{channel_name},{frequency},{modulation},{ctcss},0,0,0\r"
            if send_command(scanner, command) != "CIN,OK":
                logging.error(f"Failed to program channel {channel}")
                return False

            # Exit programming mode
            if send_command(scanner, b'EPG\r') != "EPG,OK":
                logging.warning("Failed to exit program mode")
                return False

            logging.info(f"Channel {channel} programmed with {frequency} Hz, {modulation}")
            return True
    except ValueError as ve:
        logging.error(f"Validation error: {ve}")
        return False
    except serial.SerialException as e:
        logging.error(f"Serial error: {e}")
        return False

def clear_channel(port, channel):
    """Delete a specific channel using the DCH command in programming mode."""
    try:
        if not (1 <= channel <= 500):
            raise ValueError("Channel must be between 1 and 500.")
        with serial.Serial(port, baudrate=9600, timeout=2) as scanner:
            # Enter programming mode
            if send_command(scanner, b'PRG\r') != "PRG,OK":
                logging.error("Failed to enter program mode")
                return False

            # Delete the channel
            if send_command(scanner, f"DCH,{channel}\r") != "DCH,OK":
                logging.error(f"Failed to delete channel {channel}")
                return False

            # Exit programming mode
            if send_command(scanner, b'EPG\r') != "EPG,OK":
                logging.warning("Failed to exit program mode")
                return False

            logging.info(f"Channel {channel} deleted on {port}")
            return True
    except ValueError as e:
        logging.error(f"Invalid channel number: {e}")
        return False
    except serial.SerialException as e:
        logging.error(f"Serial error: {e}")
        return False

def set_volume(port, level):
    """Set the volume level (0-15) using the VOL command."""
    try:
        if not (0 <= level <= 15):
            raise ValueError("Volume level must be between 0 and 15.")
        with serial.Serial(port, baudrate=9600, timeout=2) as scanner:
            response = send_command(scanner, f"VOL,{level}\r")
            if response != "VOL,OK":
                logging.error(f"Failed to set volume to {level}")
                return False
            logging.info(f"Volume set to {level} on {port}")
            return True
    except ValueError as e:
        logging.error(f"Invalid volume level: {e}")
        return False
    except serial.SerialException as e:
        logging.error(f"Serial error: {e}")
        return False

def set_squelch(port, level):
    """Set the squelch level (0-15) using the SQL command."""
    try:
        if not (0 <= level <= 15):
            raise ValueError("Squelch level must be between 0 and 15.")
        with serial.Serial(port, baudrate=9600, timeout=2) as scanner:
            response = send_command(scanner, f"SQL,{level}\r")
            if response != "SQL,OK":
                logging.error(f"Failed to set squelch to {level}")
                return False
            logging.info(f"Squelch set to {level} on {port}")
            return True
    except ValueError as e:
        logging.error(f"Invalid squelch level: {e}")
        return False
    except serial.SerialException as e:
        logging.error(f"Serial error: {e}")
        return False

def set_backlight(port, mode):
    """Set the backlight mode using the BLT command (requires program mode)."""
    try:
        valid_modes = ["ON", "SQ", "OFF"]  # Assuming typical modes; adjust if different
        if mode not in valid_modes:
            raise ValueError(f"Backlight mode must be one of {valid_modes}.")
        with serial.Serial(port, baudrate=9600, timeout=2) as scanner:
            if send_command(scanner, b'PRG\r') != "PRG,OK":
                logging.error("Failed to enter program mode")
                return False
            response = send_command(scanner, f"BLT,{mode}\r")
            if response != "BLT,OK":
                logging.error(f"Failed to set backlight to {mode}")
                return False
            if send_command(scanner, b'EPG\r') != "EPG,OK":
                logging.warning("Failed to exit program mode")
                return False
            logging.info(f"Backlight set to {mode} on {port}")
            return True
    except ValueError as e:
        logging.error(f"Invalid backlight mode: {e}")
        return False
    except serial.SerialException as e:
        logging.error(f"Serial error: {e}")
        return False

def get_battery_info(port):
    """Get battery information using the BSV command (requires program mode)."""
    try:
        with serial.Serial(port, baudrate=9600, timeout=2) as scanner:
            if send_command(scanner, b'PRG\r') != "PRG,OK":
                logging.error("Failed to enter program mode")
                return None
            response = send_command(scanner, "BSV\r")
            if not response or not response.startswith("BSV,"):
                logging.error("Failed to get battery info")
                return None
            if send_command(scanner, b'EPG\r') != "EPG,OK":
                logging.warning("Failed to exit program mode")
            logging.info(f"Battery info retrieved: {response}")
            return response  # Format: "BSV,<voltage>,<status>" (adjust parsing as needed)
    except serial.SerialException as e:
        logging.error(f"Serial error: {e}")
        return None

def set_lcd_contrast(port, level):
    """Set the LCD contrast level using the CNT command (requires program mode)."""
    try:
        if not (1 <= level <= 15):  # Assuming typical range; adjust if different
            raise ValueError("LCD contrast level must be between 1 and 15.")
        with serial.Serial(port, baudrate=9600, timeout=2) as scanner:
            if send_command(scanner, b'PRG\r') != "PRG,OK":
                logging.error("Failed to enter program mode")
                return False
            response = send_command(scanner, f"CNT,{level}\r")
            if response != "CNT,OK":
                logging.error(f"Failed to set LCD contrast to {level}")
                return False
            if send_command(scanner, b'EPG\r') != "EPG,OK":
                logging.warning("Failed to exit program mode")
                return False
            logging.info(f"LCD contrast set to {level} on {port}")
            return True
    except ValueError as e:
        logging.error(f"Invalid LCD contrast level: {e}")
        return False
    except serial.SerialException as e:
        logging.error(f"Serial error: {e}")
        return False

# New Identify Function
def identify(port):
    """Read settings from Channel 500 and write them to Channel 1."""
    try:
        # Read settings from Channel 500
        settings = read_channel(port, 500)
        if not settings:
            logging.error(f"Failed to read channel 500 on {port}")
            return False

        # Write settings to Channel 1
        success = write_channel(
            port=port,
            channel=1,
            frequency=settings['frequency'],
            modulation=settings['modulation'],
            channel_name=settings['channel_name'],
            ctcss=settings['ctcss']
        )
        if not success:
            logging.error(f"Failed to copy Channel 500 settings to Channel 1 on {port}")
            return False

        logging.info(f"Successfully identified {port}: Copied Channel 500 to Channel 1")
        return True
    except Exception as e:
        logging.error(f"Error in identify function on {port}: {e}")
        return False

# New Test Function
def test(port):
    """Program Channel 1 with NOAA weather frequency, set volume to 5, and squelch to 0."""
    try:
        # Program Channel 1 with NOAA weather frequency (1624400 Hz)
        success = write_channel(
            port=port,
            channel=1,
            frequency=1624400,  # NOAA frequency in Hz
            modulation="NFM",
            channel_name="NOAA_1"
        )
        if not success:
            logging.error(f"Failed to program NOAA frequency to Channel 1 on {port}")
            return False


      # Program Channel 2 with NOAA weather frequency (1624250 Hz)
        success = write_channel(
            port=port,
            channel=2,
            frequency=1624250,  # NOAA frequency in Hz
            modulation="NFM",
            channel_name="NOAA_2"
        )
        if not success:
            logging.error(f"Failed to program NOAA frequency to Channel 2 on {port}")
            return False

      # Program Channel 3 with NOAA weather frequency (1624500 Hz)
        success = write_channel(
            port=port,
            channel=3,
            frequency=1624500,  # NOAA frequency in Hz
            modulation="NFM",
            channel_name="NOAA_3"
        )
        if not success:
            logging.error(f"Failed to program NOAA frequency to Channel 3 on {port}")
            return False

      # Program Channel 4 with NOAA weather frequency (1624750 Hz)
        success = write_channel(
            port=port,
            channel=4,
            frequency=1624750,  # NOAA frequency in Hz
            modulation="NFM",
            channel_name="NOAA_4"
        )
        if not success:
            logging.error(f"Failed to program NOAA frequency to Channel 4 on {port}")
            return False

      # Program Channel 5 with NOAA weather frequency (1625000 Hz)
        success = write_channel(
            port=port,
            channel=5,
            frequency=1625000,  # NOAA frequency in Hz
            modulation="NFM",
            channel_name="NOAA_5"
        )
        if not success:
            logging.error(f"Failed to program NOAA frequency to Channel 5 on {port}")
            return False

      # Program Channel 6 with NOAA weather frequency (1625250 Hz)
        success = write_channel(
            port=port,
            channel=6,
            frequency=1625250,  # NOAA frequency in Hz
            modulation="NFM",
            channel_name="NOAA_6"
        )
        if not success:
            logging.error(f"Failed to program NOAA frequency to Channel 6 on {port}")
            return False

      # Program Channel 7 with NOAA weather frequency ( 1625500 Hz)
        success = write_channel(
            port=port,
            channel=7,
            frequency=1625500,  # NOAA frequency in Hz
            modulation="NFM",
            channel_name="NOAA_7"
        )
        if not success:
            logging.error(f"Failed to program NOAA frequency to Channel 1 on {port}")
            return False


        # Set volume to 5
        success = set_volume(port, 5)
        if not success:
            logging.error(f"Failed to set volume to 5 on {port}")
            return False

        # Set squelch to 0
        success = set_squelch(port, 0)
        if not success:
            logging.error(f"Failed to set squelch to 0 on {port}")
            return False

        logging.info(f"Successfully tested {port}: NOAA frequency on Channel 1, volume 5, squelch 0")
        return True
    except Exception as e:
        logging.error(f"Error in test function on {port}: {e}")
        return False

def find_bc125at():
    """Scan all ports to find BC125AT scanners."""
    all_ports = list_com_ports()
    scanners = []
    for port in all_ports:
        logging.info(f"Testing port {port}...")
        result = check_radio_connection(port)
        if result:
            logging.info(f"BC125AT found on {port}!")
            scanners.append(result)
    if not scanners:
        logging.info("No BC125AT scanners found.")
    return scanners

def main():
    """Main script to interact with BC125AT scanners."""
    if sys.platform.startswith('win'):
        os.system('color')  # Enable ANSI color support on Windows if needed

    scanners = find_bc125at()
    if not scanners:
        print("No BC125AT scanners found.")
        return

    while True:
        os.system('cls' if os.name == 'nt' else 'clear')
        print("Detected BC125AT Scanners:")
        for i, scanner in enumerate(scanners, 1):
            print(f"{i}. Port: {scanner['port']}, Model: {scanner['model']}, "
                  f"Version: {scanner['version']}, ID: {scanner['programmed_id']}")

        print("\nOptions:")
        print("1. Clear channels 1 and 500")
        print("2. Program SCANNER_00X ID")
        print("3. Set Channel 1")
        print("4. Set Volume")
        print("5. Set Squelch")
        print("6. Set Backlight")
        print("7. Get Battery Info")
        print("8. Set LCD Contrast")
        print("9. Identify (Copy Channel 500 to Channel 1)")
        print("10. Test (NOAA on Channel 1, Volume 5, Squelch 0)")
        print("11. Exit")
        choice = input("Select an option (1-11): ").strip()

        if choice == '11':
            print("Exiting...")
            break

        if choice not in ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10']:
            print("Invalid choice. Please select 1-11.")
            input("Press Enter to continue...")
            continue

        # Select scanner by port
        if len(scanners) > 1:
            print("\nAvailable scanners:")
            for scanner in scanners:
                print(f"Port: {scanner['port']} (ID: {scanner['programmed_id']})")
            port = input("Enter the port of the scanner to use (e.g., COM3 or /dev/ttyUSB0): ").strip()
            selected_scanner = next((s for s in scanners if s['port'] == port), None)
            if not selected_scanner:
                print("Invalid port selected.")
                input("Press Enter to continue...")
                continue
        else:
            selected_scanner = scanners[0]
            port = selected_scanner['port']
            print(f"Using scanner on {port}")

        if choice == '1':
            print(f"Clearing channels 1 and 500 on {port}...")
            if clear_channel(port, 1) and clear_channel(port, 500):
                print("Channels cleared successfully.")
            else:
                print("Failed to clear channels.")
            input("Press Enter to continue...")

        elif choice == '2':
            while True:
                id_num = input("Enter the ID number (e.g., 001 for SCANNER_001): ").strip()
                if not id_num.isdigit():
                    print("ID number must be numeric (e.g., 001, 002, etc.).")
                    continue
                id_num_padded = id_num.zfill(3)
                new_id = f"SCANNER_{id_num_padded}"
                if len(new_id) > 16:
                    print("ID exceeds 16 characters. Use a shorter number.")
                    continue
                break

            print(f"Programming ID: {new_id} on {port}")
            if write_channel(port, 500, 1625500, "NFM", new_id):
                print(f"ID {new_id} programmed successfully on Channel 500.")
                selected_scanner['programmed_id'] = new_id
            if write_channel(port, 1, 1625500, "NFM", new_id):
                print("Set to NOAA Radio for testing on Channel 1")
            else:
                print("Failed to program ID.")
            input("Press Enter to continue...")

        elif choice == '3':

            while True:
                channel_name = input("Enter channel name (1-16 alphanumeric characters): ").strip()
                if not (1 <= len(channel_name) <= 16):
                    print("Channel name must be 1-16 characters.")
                    continue
                if not channel_name.isalnum():
                    print("Channel name must contain only letters and numbers (no spaces or special characters).")
                    continue
                break

            while True:
                freq_input = input("Enter frequency in Hz (e.g., 1465200 for 146.520 MHz): ").strip()
                if not freq_input.isdigit():
                    print("Frequency must be a whole number in Hz (e.g., 1465200).")
                    continue
                frequency = int(freq_input)
                if not (250000 <= frequency <= 5120000):
                    print("Frequency must be between 250000 Hz (25 MHz) and 5120000 Hz (512 MHz).")
                    continue
                break

            while True:
                mod_input = input("Enter modulation (AM, FM, NFM): ").strip().upper()
                if mod_input not in ["AM", "FM", "NFM"]:
                    print("Modulation must be AM, FM, or NFM.")
                    continue
                modulation = mod_input
                break


            freq_mhz = frequency / 1000000  # For display only
            print(f"Programming Channel 1 on {port} with {channel_name}, with {freq_mhz} MHz, {modulation}...")
            if write_channel(port, 1, frequency, modulation, channel_name):
                print(f"Channel 1 set to {freq_mhz} MHz, {modulation} successfully.")
            else:
                print("Failed to set Channel 1.")
            input("Press Enter to continue...")

        elif choice == '4':
            while True:
                level = input("Enter volume level (0-15): ").strip()
                if not level.isdigit() or not (0 <= int(level) <= 15):
                    print("Volume level must be a number between 0 and 15.")
                    continue
                break
            if set_volume(port, int(level)):
                print(f"Volume set to {level} successfully.")
            else:
                print("Failed to set volume.")
            input("Press Enter to continue...")

        elif choice == '5':
            while True:
                level = input("Enter squelch level (0-15): ").strip()
                if not level.isdigit() or not (0 <= int(level) <= 15):
                    print("Squelch level must be a number between 0 and 15.")
                    continue
                break
            if set_squelch(port, int(level)):
                print(f"Squelch set to {level} successfully.")
            else:
                print("Failed to set squelch.")
            input("Press Enter to continue...")

        elif choice == '6':
            while True:
                mode = input("Enter backlight mode (ON, SQ, OFF): ").strip().upper()
                if mode not in ["ON", "SQ", "OFF"]:
                    print("Backlight mode must be ON, SQ, or OFF.")
                    continue
                break
            if set_backlight(port, mode):
                print(f"Backlight set to {mode} successfully.")
            else:
                print("Failed to set backlight.")
            input("Press Enter to continue...")

        elif choice == '7':
            battery_info = get_battery_info(port)
            if battery_info:
                print(f"Battery Info: {battery_info}")
            else:
                print("Failed to retrieve battery info.")
            input("Press Enter to continue...")

        elif choice == '8':
            while True:
                level = input("Enter LCD contrast level (1-15): ").strip()
                if not level.isdigit() or not (1 <= int(level) <= 15):
                    print("LCD contrast level must be a number between 1 and 15.")
                    continue
                break
            if set_lcd_contrast(port, int(level)):
                print(f"LCD contrast set to {level} successfully.")
            else:
                print("Failed to set LCD contrast.")
            input("Press Enter to continue...")

        elif choice == '9':
            print(f"Identifying {port}: Copying Channel 500 to Channel 1...")
            if identify(port):
                print("Channel 500 settings copied to Channel 1 successfully.")
            else:
                print("Failed to identify scanner.")
            input("Press Enter to continue...")

        elif choice == '10':
            print(f"Testing {port}: Setting NOAA frequency, volume 5, squelch 0...")
            if test(port):
                print("NOAA frequencies set to Channels 1 through 5.")
            else:
                print("Failed to test scanner.")
            input("Press Enter to continue...")

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\nScript terminated by user.")
    except Exception as e:
        print(f"An unexpected error occurred: {e}")