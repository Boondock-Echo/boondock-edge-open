import serial
import serial.tools.list_ports
import time
import sys
import threading

def list_com_ports():
    """List all available COM ports."""
    print("\nAvailable COM ports:")
    ports = serial.tools.list_ports.comports()
    if not ports:
        print("No COM ports found!")
        return []
    
    for i, port in enumerate(ports, 1):
        print(f"{i}. {port.device} - {port.description} (HWID: {port.hwid})")
    return ports

def select_com_port(ports):
    """Let user select a COM port from the list."""
    while True:
        try:
            choice = input("\nEnter the number of the COM port to connect to (or 'q' to quit): ")
            if choice.lower() == 'q':
                return None
            choice = int(choice)
            if 1 <= choice <= len(ports):
                return ports[choice - 1].device
            else:
                print(f"Please enter a number between 1 and {len(ports)}")
        except ValueError:
            print("Please enter a valid number or 'q'")

def read_serial(ser, stop_event):
    """Thread to continuously read and print serial data."""
    while not stop_event.is_set():
        try:
            if ser.in_waiting > 0:
                data = ser.read_all().decode('utf-8', errors='ignore').strip()
                if data:
                    print(f"RX: {data}")
            time.sleep(0.1)  # Small delay to prevent CPU hogging
        except serial.SerialException as e:
            print(f"Serial error: {e}")
            stop_event.set()
        except Exception as e:
            print(f"Error reading serial: {e}")

def main():
    print("ESP32 Serial Communication Tool")
    print("===============================")

    # List and select COM port
    ports = list_com_ports()
    if not ports:
        return
    
    selected_port = select_com_port(ports)
    if not selected_port:
        print("Exiting...")
        return

    # Connect to the selected port
    try:
        ser = serial.Serial(
            port=selected_port,
            baudrate=115200,
            bytesize=serial.EIGHTBITS,
            parity=serial.PARITY_NONE,
            stopbits=serial.STOPBITS_ONE,
            timeout=1
        )
        print(f"\nConnected to {selected_port} at 115200 baud")
    except serial.SerialException as e:
        print(f"Failed to connect to {selected_port}: {e}")
        return

    # Start a thread to read serial data
    stop_event = threading.Event()
    read_thread = threading.Thread(target=read_serial, args=(ser, stop_event))
    read_thread.daemon = True  # Thread will stop when main program exits
    read_thread.start()

    # Main loop for sending commands
    print("\nType commands to send (or 'exit' to quit):")
    try:
        while True:
            command = input("> ")
            if command.lower() == 'exit':
                break
            if command:
                try:
                    ser.write(f"{command}\n".encode('utf-8'))
                    print(f"TX: {command}")
                except serial.SerialException as e:
                    print(f"Error sending command: {e}")
                    break

    except KeyboardInterrupt:
        print("\nInterrupted by user")
    
    finally:
        # Cleanup
        stop_event.set()
        read_thread.join(timeout=1)
        if ser.is_open:
            ser.close()
            print(f"Disconnected from {selected_port}")

if __name__ == "__main__":
    main()