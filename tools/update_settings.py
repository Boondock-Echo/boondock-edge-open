import paho.mqtt.client as mqtt
import time

# MQTT Broker Configuration
MQTT_BROKER = "localhost"  # Replace with your broker address
MQTT_PORT = 1883
MQTT_USER = "echo"
MQTT_PASSWORD = "mqtt2025#strike"

# Device IDs and Commands
device_ids = [
    "B8D61A5AC534",
    "B8D61A5ACCD4",
    "B8D61A59B2C4",
    "B8D61A59B2C0",
    "B8D61A582E40",
    "B8D61A5ACB48"
]

# List of tuples containing (command, value)
commands = [
    ("sense", 97), # Mark 1736985247 Changing 90 -> 97
    ("min", 1000), 
    ("silence", 1200), #Mark 1736985247 Changing 1000 -> 1200 to differ from min.
    ("max",30000) 
]

def on_connect(client, userdata, flags, rc):
    """Callback for when the client connects to the broker"""
    connection_codes = {
        0: "Connected successfully",
        1: "Incorrect protocol version",
        2: "Invalid client ID",
        3: "Server unavailable",
        4: "Bad username or password",
        5: "Not authorized"
    }
    print(f"Connection result: {connection_codes.get(rc, 'Unknown error')}")

def on_publish(client, userdata, mid):
    """Callback for when a message is published"""
    print(f"Message {mid} published successfully")

def setup_mqtt_client():
    """Setup and return an MQTT client instance"""
    client = mqtt.Client()
    client.username_pw_set(MQTT_USER, MQTT_PASSWORD)
    client.on_connect = on_connect
    client.on_publish = on_publish
    
    try:
        client.connect(MQTT_BROKER, MQTT_PORT, 60)
        return client
    except Exception as e:
        print(f"Failed to connect to broker: {e}")
        return None

def send_commands():
    """Send commands to all devices"""
    client = setup_mqtt_client()
    if not client:
        return
    
    client.loop_start()
    
    try:
        for device_id in device_ids:
            print(f"\nProcessing device: {device_id}")
            
            for command, value in commands:
                # Construct topic
                topic = f"boondock/{device_id}/set/{command}"
                
                # Convert value to string for publishing
                message = str(value)
                
                # Publish message
                print(f"Sending command: {command} = {value}")
                client.publish(topic, message, qos=1)
                
                # Wait for 1 second between commands
                time.sleep(1)
            
            print(f"Completed commands for device: {device_id}")
    
    except Exception as e:
        print(f"Error during command transmission: {e}")
    
    finally:
        client.loop_stop()
        client.disconnect()
        print("\nDisconnected from broker")

if __name__ == "__main__":
    send_commands()
