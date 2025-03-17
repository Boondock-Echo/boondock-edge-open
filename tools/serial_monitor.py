import serial
import threading
import queue
import sys
import re
from datetime import datetime

class SerialMonitor:
    def __init__(self):
        self.ports = []
        self.running = True
        self.input_queue = queue.Queue()
        self.port_channel_mapping = {}  # Dictionary to store port -> channel mapping
        
        # MAC to Channel mapping
        self.mac_channel_mapping = {
            "B8D61A5AC534": 1,
            "B8D61A5ACCD4": 2,
            "B8D61A59B2C4": 3,
            "B8D61A59B2C0": 4,
            "B8D61A582E40": 5,
            "B8D61A5ACB48": 6
        }
        
        # Channel to Port mapping (for reference)
        self.channel_port_mapping = {
            1: "6001",
            2: "6002",
            3: "6003",
            4: "6004",
            5: "6005",
            6: "6006"
        }
        
    def connect_ports(self):
        # Try to connect to USB0 through USB5
        for i in range(6):
            port_name = f"/dev/ttyUSB{i}"
            try:
                ser = serial.Serial(
                    port=port_name,
                    baudrate=115200,
                    timeout=0.1
                )
                self.ports.append(ser)
                print(f"Successfully connected to {port_name}")
            except serial.SerialException as e:
                print(f"Could not connect to {port_name}: {str(e)}")
        
        if not self.ports:
            print("No ports connected. Exiting...")
            sys.exit(1)
    
    def extract_mac_address(self, line):
        """Extract MAC address from the message if present"""
        mac_match = re.search(r"Boondock MAC\s*=\s*([0-9A-Fa-f]{12})", line)
        if mac_match:
            return mac_match.group(1)
        return None
    
    def get_port_identifier(self, port):
        """Get the channel number if available, otherwise return port name"""
        if port.port in self.port_channel_mapping:
            return f"[Channel {self.port_channel_mapping[port.port]}]"
        return f"[{port.port}]"
    
    def read_port(self, port):
        """Thread function to read from a single port"""
        while self.running:
            if port.in_waiting:
                try:
                    data = port.readline().decode('utf-8').strip()
                    if data:
                        # Check for MAC address in the message
                        mac = self.extract_mac_address(data)
                        if mac and mac in self.mac_channel_mapping:
                            channel = self.mac_channel_mapping[mac]
                            self.port_channel_mapping[port.port] = channel
                            print(f"\nIdentified Channel {channel} on {port.port} (MAC: {mac})")
                        
                        timestamp = datetime.now().strftime('%H:%M:%S.%f')[:-3]
                        port_id = self.get_port_identifier(port)
                        print(f"[{timestamp}] {port_id}: {data}")
                except Exception as e:
                    print(f"Error reading from {port.port}: {str(e)}")
    
    def write_to_ports(self):
        """Thread function to write input to all ports"""
        while self.running:
            try:
                message = self.input_queue.get()
                if message:
                    if not message.endswith('\n'):
                        message += '\n'
                    for port in self.ports:
                        try:
                            port.write(message.encode('utf-8'))
                            port_id = self.get_port_identifier(port)
                            print(f"Sent to {port_id}: {message.strip()}")
                        except Exception as e:
                            print(f"Error writing to {port.port}: {str(e)}")
            except queue.Empty:
                continue
    
    def input_handler(self):
        """Thread function to handle user input"""
        while self.running:
            try:
                user_input = input()
                if user_input.lower() == 'exit':
                    self.running = False
                    break
                self.input_queue.put(user_input)
            except EOFError:
                self.running = False
                break
    
    def print_channel_mapping(self):
        """Print the channel mapping information"""
        print("\nChannel Mapping:")
        print("Channel | MAC Address  | Port")
        print("-" * 35)
        for channel in range(1, 7):
            mac = next(mac for mac, ch in self.mac_channel_mapping.items() if ch == channel)
            port = self.channel_port_mapping[channel]
            print(f"{channel:7d} | {mac} | {port}")
        print("")
    
    def run(self):
        # Connect to all available ports
        self.connect_ports()
        
        # Print channel mapping information
        self.print_channel_mapping()
        
        # Create and start reader threads for each port
        reader_threads = []
        for port in self.ports:
            thread = threading.Thread(target=self.read_port, args=(port,))
            thread.daemon = True
            thread.start()
            reader_threads.append(thread)
        
        # Create and start writer thread
        writer_thread = threading.Thread(target=self.write_to_ports)
        writer_thread.daemon = True
        writer_thread.start()
        
        print("\nSerial Monitor Running")
        print("Type 'exit' to quit")
        print("Enter text to send to all ports")
        print("Messages will be displayed with channel numbers once devices are identified\n")
        
        # Start input handler in main thread
        self.input_handler()
        
        # Cleanup
        self.running = False
        for port in self.ports:
            port.close()
        
        print("\nClosing all ports and exiting...")

if __name__ == "__main__":
    monitor = SerialMonitor()
    try:
        monitor.run()
    except KeyboardInterrupt:
        print("\nReceived keyboard interrupt")
        monitor.running = False
