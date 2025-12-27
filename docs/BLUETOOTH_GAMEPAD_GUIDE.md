# Bluetooth Gamepad Setup for Comma Devices

This guide explains how to set up Bluetooth gamepad (PS5 DualSense) controls on comma 3X devices running AGNOS with a custom Bluetooth-enabled kernel.

## Overview

The stock AGNOS kernel doesn't have Bluetooth support enabled. This guide covers:
1. Building a Bluetooth-enabled kernel
2. Flashing the kernel to your device
3. Pairing a PS5 DualSense controller
4. Using joystick controls with openpilot

## Prerequisites

- macOS with Docker (OrbStack recommended)
- Case-sensitive APFS volume for kernel building
- SSH access to your comma device
- PS5 DualSense controller

## Part 1: Building the Bluetooth Kernel

### Setup (macOS)

Create a case-sensitive volume for kernel building:
```bash
diskutil apfs addVolume disk3 "Case-sensitive APFS" agnos
cd /Volumes/agnos
git clone https://github.com/commaai/agnos-builder.git builder
cd builder
git submodule update --init agnos-kernel-sdm845
./tools/extract_tools.sh
```

### Kernel Configuration

The kernel needs these Bluetooth options enabled in `agnos-kernel-sdm845/arch/arm64/configs/tici_defconfig`:
```
CONFIG_BT=y
CONFIG_BT_BREDR=y
CONFIG_BT_RFCOMM=y
CONFIG_BT_BNEP=y
CONFIG_BT_HIDP=y
CONFIG_BT_HS=y
CONFIG_BT_LE=y
CONFIG_BT_QCA=y
CONFIG_BT_HCIUART=y
CONFIG_BT_HCIUART_QCA=y
```

The device tree also needs Bluetooth UART enabled in `comma_common.dtsi`:
```c
/* Bluetooth UART */
&qupv3_se6_4uart {
  status = "ok";
};
```

### Build the Kernel

```bash
cd /Volumes/agnos/builder
./build_kernel.sh
```

The output will be at `output/boot.img`.

## Part 2: Flashing the Kernel

### Option A: Flash via SSH (Recommended)

Copy the boot image to your device and flash:
```bash
# Copy boot.img to device
scp /Volumes/agnos/builder/output/boot.img comma:/tmp/

# SSH into device
ssh comma

# Find current boot slot
SLOT=$(cat /proc/cmdline | grep -o 'androidboot.slot_suffix=_[ab]' | cut -d'_' -f2)
echo "Current slot: $SLOT"

# Flash to current slot
sudo dd if=/tmp/boot.img of=/dev/disk/by-partlabel/boot_$SLOT bs=4M
sync

# Reboot
sudo reboot
```

### Option B: Flash via QDL/EDL

Put device in QDL mode and run:
```bash
cd /Volumes/agnos/builder
./flash_kernel.sh
```

## Part 3: Bluetooth Setup on Device

### Install PiBorg Gamepad Library

SSH into your device and install the Gamepad library:
```bash
ssh comma
cd /data/openpilot/tools/joystick
git clone https://github.com/piborg/Gamepad
cp Gamepad/Gamepad.py .
cp Gamepad/Controllers.py .
```

### Configure Bluetooth

Edit the Bluetooth input configuration to allow non-bonded HID connections:
```bash
sudo nano /etc/bluetooth/input.conf
```

Add or modify:
```ini
[General]
ClassicBondedOnly=false
```

### Initialize Bluetooth

```bash
# Attach Bluetooth UART
sudo hciattach /dev/ttyHS1 any 115200 flow

# Verify Bluetooth is up
hciconfig
# Should show hci0 with UP RUNNING
```

### Pair the Controller

```bash
bluetoothctl
```

In bluetoothctl:
```
power on
agent on
default-agent
scan on
```

Put your DualSense in pairing mode (hold PS + Create buttons until light flashes).

When you see the controller (e.g., `Wireless Controller`):
```
scan off
pair XX:XX:XX:XX:XX:XX
trust XX:XX:XX:XX:XX:XX
connect XX:XX:XX:XX:XX:XX
exit
```

### Verify Controller

```bash
# Check for joystick device
ls /dev/input/js*

# Test input (optional)
cat /dev/input/js0 | xxd
```

## Part 4: Using Joystick Controls

### Run Joystick Control

Make sure openpilot is offroad, then:
```bash
cd /data/openpilot
python tools/joystick/joystick_control.py --bluetooth
```

### Controls

| Control | Action |
|---------|--------|
| Left Stick X | Steering |
| R2 Trigger | Accelerate |
| L2 Trigger | Brake |
| D-pad Up/Down | Speed mode (1/3, 2/3, 3/3) |
| Triangle | Cancel cruise |

### Speed Modes

- **Mode 1 (33%)**: Gentle inputs for parking/low speed
- **Mode 2 (66%)**: Normal driving (default)
- **Mode 3 (100%)**: Full range for testing

## Troubleshooting

### Bluetooth not initializing
```bash
# Check if UART is available
ls -la /dev/ttyHS*

# Check kernel Bluetooth support
zcat /proc/config.gz | grep CONFIG_BT
```

### Controller won't connect
- Make sure `ClassicBondedOnly=false` is set in `/etc/bluetooth/input.conf`
- Restart Bluetooth: `sudo systemctl restart bluetooth`
- Re-attach HCI: `sudo hciattach /dev/ttyHS1 any 115200 flow`

### No /dev/input/js0
- Check if HIDP module is loaded: `lsmod | grep hidp`
- Verify controller is connected: `bluetoothctl info XX:XX:XX:XX:XX:XX`

### Joystick values incorrect
- The DualSense over Bluetooth uses different axis mappings than USB
- The `BluetoothGamepad` class in `joystick_control.py` handles this automatically

## Files Modified

### Kernel (agnos-kernel-sdm845)
- `arch/arm64/configs/tici_defconfig` - Bluetooth config options
- `arch/arm64/boot/dts/qcom/comma_common.dtsi` - Bluetooth UART enable
- `arch/arm64/boot/dts/qcom/sdm845.dtsi` - UART aliases

### openpilot/sunnypilot
- `tools/joystick/joystick_control.py` - BluetoothGamepad class with `--bluetooth` flag

## Credits

- Bluetooth kernel patch by jyoung8607
- PiBorg Gamepad library: https://github.com/piborg/Gamepad
