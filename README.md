# Boondock edge Open Source
Boondock Edge Open Source is a free to use solution for personal usage. It uses Raspberry Pi, to record and transcribe radio communications. You can run Boondock Edge Open in two modes. 

## Headless mode
headless mode is useful when you want to use a raspberyr pi, and access it using a web browser on a different machine.


## Stand-alone mode
Standalone mode lets you attach a speaker and a display and you can use without a second computer or browser.


### What you need

#### Headless mode
- Raspberry Pi

#### Stand-alone mode
- 5 Inch LCD ( Or you can use any LCD for Raspberry Pi.)
- USB Speakers ( )
- Geekworm UPS ( Gives you battery power for hours of operation)
- Li-ion 16520 rechargable batteries 
- Boondock Tango 

Note: Boondock Tango is an open-source project by Boondock Technologies, that lets you connect BC125AT scanner, with an ESP-32 Audiokit. the Audiokit will record the audio, and you can control your Scanner over USB.


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