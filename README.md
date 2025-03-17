# Boondock edge Open Source
Boondock Edge Open Source is a free to use solution for personal usage. It uses Raspberry Pi, to record and transcribe radio communications.

### What you need


- Raspberry Pi
- Geekworm UPS
- 5 Inch LCD
- Li-ion 16520 rechargable batteries
- Boondock Tango


### Installation

Setup Raspberry Pi 5 with Lite OS, on a 64GB Micro SD card.


#### install Git
```
sudo apt update && sudo apt upgrade -y
sudo apt install git python3-pip
```

#### Clone the repo and install the application

```
git clone https://github.com/Boondock-Echo/boondock-edge-open.git
```

```
cd boondock-edge-open
sudo chmod +x install.sh
sudo sh install.sh
```

###