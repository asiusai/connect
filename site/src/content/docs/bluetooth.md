---
title: Bluetooth
description: Bluetooth
---
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
git clone https://github.com/commaai/agnos-kernel-sdm845.git
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

The device tree also needs Bluetooth UART enabled in `agnos-kernel-sdm845/arch/arm64/boot/dts/qcom/comma_common.dtsi`:
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
cat /proc/cmdline | grep -o 'slot_suffix=_[ab]'

# Flash to current slot (use boot_a or boot_b based on above)
sudo dd if=/tmp/boot.img of=/dev/disk/by-partlabel/boot_a bs=4M
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

### Initialize Bluetooth

```bash
# Attach Bluetooth UART (use btattach, not hciattach)
sudo btattach -B /dev/ttyHS1 -S 115200 &

# Verify Bluetooth is up
hciconfig
# Should show hci0 with UP RUNNING and BD Address like 00:00:00:00:5A:AD
```

### Pair the Controller

Use `hcitool scan` for classic Bluetooth discovery (works better than bluetoothctl for gamepads):
```bash
sudo hcitool scan
```

Put your DualSense in pairing mode (hold PS + Create buttons until light flashes).

When you see the controller, pair using Python dbus:
```python
import dbus

bus = dbus.SystemBus()
MAC = "XX:XX:XX:XX:XX:XX"  # Replace with your controller's MAC

device_path = f"/org/bluez/hci0/dev_{MAC.replace(':', '_')}"
device = dbus.Interface(bus.get_object("org.bluez", device_path), "org.bluez.Device1")
props = dbus.Interface(bus.get_object("org.bluez", device_path), "org.freedesktop.DBus.Properties")

props.Set("org.bluez.Device1", "Trusted", dbus.Boolean(True))
device.Pair()
device.Connect()
print("Connected!")
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

### hciconfig shows DOWN
Use `btattach` instead of `hciattach`:
```bash
sudo pkill hciattach
sudo btattach -B /dev/ttyHS1 -S 115200 &
```

### Controller not found in bluetoothctl scan
Use `hcitool scan` instead - it uses classic BR/EDR discovery which works better for gamepads.

### No /dev/input/js0
- Check if HIDP module is loaded: `lsmod | grep hidp`
- Verify controller is connected: `hciconfig` should show connection activity

## Files Modified

### Kernel (agnos-kernel-sdm845)
- `arch/arm64/configs/tici_defconfig` - Bluetooth config options
- `arch/arm64/boot/dts/qcom/comma_common.dtsi` - Bluetooth UART enable

### openpilot/sunnypilot
- `tools/joystick/joystick_control.py` - BluetoothGamepad class with `--bluetooth` flag
