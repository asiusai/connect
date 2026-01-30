---
title: Bluetooth
description: Bluetooth connectivity for comma devices
---

# Bluetooth for Comma Devices

This guide covers Bluetooth connectivity on comma 3X devices running AGNOS, including:
1. Building a Bluetooth-enabled kernel
2. BLE GATT server for remote control without network
3. Network sharing over Bluetooth (PAN + WiFi)
4. Bluetooth gamepad support

## Overview

The stock AGNOS kernel doesn't have Bluetooth support enabled. This guide shows how to:
- Build and flash a custom kernel with Bluetooth
- Run a BLE GATT server that exposes device control APIs
- Connect from phones/browsers using Web Bluetooth

## Prerequisites

- macOS with Docker (OrbStack recommended)
- Case-sensitive APFS volume for kernel building
- SSH access to your comma device

---

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
/* Bluetooth UART - SE6 at 0x898000 */
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

---

## Part 2: Flashing the Kernel

### Flash via SSH (Recommended)

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

### Verify Bluetooth After Reboot

```bash
# Check kernel has BT support
zcat /proc/config.gz | grep CONFIG_BT=

# Check UART devices exist
ls -la /dev/ttyHS*

# Should show:
# /dev/ttyHS0 - GPS UART
# /dev/ttyHS1 - Bluetooth UART
```

---

## Part 3: Initializing Bluetooth

### Start Bluetooth Hardware

```bash
# Kill any existing btattach
sudo pkill btattach

# Attach Bluetooth UART
nohup sudo btattach -B /dev/ttyHS1 -S 115200 > /tmp/btattach.log 2>&1 &

# Wait a moment, then verify
sleep 2
sudo hciconfig -a
```

You should see output like:
```
hci0: Type: Primary  Bus: UART
      BD Address: 00:00:00:00:5A:AD  ACL MTU: 1024:7  SCO MTU: 60:8
      UP RUNNING
      ...
      <LE support> <LE and BR/EDR>
```

### Verify BLE Support

```bash
sudo hciconfig hci0 lestates
```

Should show "YES" for advertising and peripheral role states.

---

## Part 4: BLE GATT Server

The BLE GATT server exposes device control over Bluetooth Low Energy, allowing you to control your comma device from a phone without network connectivity.

### Service UUIDs

| Service/Characteristic | UUID |
|----------------------|------|
| Athena Service | `a51a5a10-0001-4c0d-b8e6-a51a5a100001` |
| RPC Request (Write) | `a51a5a10-0002-4c0d-b8e6-a51a5a100001` |
| RPC Response (Notify) | `a51a5a10-0003-4c0d-b8e6-a51a5a100001` |

### Available RPC Methods

| Method | Description |
|--------|-------------|
| `echo` | Echo back params (test) |
| `getVersion` | Get openpilot version info |
| `getAllParams` | Get all device params |
| `getParam` | Get specific param by key |
| `setParam` | Set a param value |
| `listDataDirectory` | List files in data directory |
| `getNetworkType` | Get current network type |
| `reboot` | Reboot the device |
| `shutdown` | Shutdown the device |
| `connectBluetoothPAN` | Connect to phone's BT tethering |
| `disconnectBluetoothPAN` | Disconnect from BT PAN |
| `getBluetoothPANStatus` | Check BT PAN connection status |
| `connectToWifi` | Connect to WiFi network/hotspot |

### Starting the BLE Server

```bash
# Ensure Bluetooth is initialized first
sudo btattach -B /dev/ttyHS1 -S 115200 &
sleep 2

# Start the BLE server
python3 /data/openpilot/system/athena/ble.py
```

Output:
```
[BLE] Starting BLE GATT Server...
[BLE] Device name: comma-XXXXXXXX
[BLE] Service UUID: a51a5a10-0001-4c0d-b8e6-a51a5a100001
[BLE] Using adapter: /org/bluez/hci0
[BLE] Server running. Press Ctrl+C to stop.
[BLE] GATT application registered successfully
[BLE] Advertisement registered - device is now discoverable
```

### Auto-start on Boot (Optional)

Create a systemd service at `/etc/systemd/system/ble-athena.service`:
```ini
[Unit]
Description=BLE Athena GATT Server
After=bluetooth.service
Requires=bluetooth.service

[Service]
Type=simple
ExecStartPre=/usr/bin/btattach -B /dev/ttyHS1 -S 115200
ExecStart=/usr/bin/python3 /data/openpilot/system/athena/ble.py
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
```

Enable with:
```bash
sudo systemctl enable ble-athena
sudo systemctl start ble-athena
```

---

## Part 5: Connecting from Browser (Web Bluetooth)

### Test Page

Visit `/ble-test.html` on your Connect site to test BLE connectivity.

Requirements:
- Chrome on desktop or Android
- Device must be advertising (BLE server running)
- Browser must have Bluetooth permissions

### Web Bluetooth API Example

```javascript
const SERVICE_UUID = 'a51a5a10-0001-4c0d-b8e6-a51a5a100001';
const RPC_REQUEST_UUID = 'a51a5a10-0002-4c0d-b8e6-a51a5a100001';
const RPC_RESPONSE_UUID = 'a51a5a10-0003-4c0d-b8e6-a51a5a100001';

// Connect
const device = await navigator.bluetooth.requestDevice({
  filters: [{ services: [SERVICE_UUID] }]
});
const server = await device.gatt.connect();
const service = await server.getPrimaryService(SERVICE_UUID);
const requestChar = await service.getCharacteristic(RPC_REQUEST_UUID);
const responseChar = await service.getCharacteristic(RPC_RESPONSE_UUID);

// Subscribe to responses
await responseChar.startNotifications();
responseChar.addEventListener('characteristicvaluechanged', (event) => {
  const chunk = new TextDecoder().decode(event.target.value);
  console.log('Response:', chunk);
});

// Send RPC request
const request = JSON.stringify({
  jsonrpc: '2.0',
  method: 'getVersion',
  params: {},
  id: 1
});
await requestChar.writeValue(new TextEncoder().encode(request));
```

---

## Part 6: Network Sharing over Bluetooth

Share your phone's internet with the comma device over Bluetooth, no WiFi hotspot needed.

### Option A: Bluetooth PAN (Recommended)

Uses classic Bluetooth PAN profile (BNEP) — the kernel already has `CONFIG_BT_BNEP=y`.

**Phone setup (one-time):**
1. Go to Android Settings > Connections > Mobile Hotspot and Tethering
2. Enable **Bluetooth tethering**
3. Note your phone's Bluetooth MAC address (Settings > About phone > Bluetooth address)

**Device side — add to `ble.py`:**

```python
import subprocess
import dbus

def handle_connect_bluetooth_pan(params):
    """Connect to phone's Bluetooth PAN for internet sharing."""
    phone_mac = params["phone_mac"]
    device_path = f"/org/bluez/hci0/dev_{phone_mac.replace(':', '_')}"

    bus = dbus.SystemBus()

    # Trust and pair with the phone
    device = dbus.Interface(
        bus.get_object("org.bluez", device_path),
        "org.bluez.Device1",
    )
    props = dbus.Interface(
        bus.get_object("org.bluez", device_path),
        "org.freedesktop.DBus.Properties",
    )
    props.Set("org.bluez.Device1", "Trusted", dbus.Boolean(True))

    try:
        device.Pair()
    except dbus.exceptions.DBusException as e:
        if "AlreadyExists" not in str(e):
            return {"success": False, "error": str(e)}

    # Connect to Network Access Point profile
    network = dbus.Interface(
        bus.get_object("org.bluez", device_path),
        "org.bluez.Network1",
    )
    interface = str(network.Connect("nap"))  # returns "bnep0"

    # Get IP via DHCP
    subprocess.run(["sudo", "dhclient", interface], timeout=15, check=True)

    # Read assigned IP
    result = subprocess.run(
        ["ip", "-4", "addr", "show", interface],
        capture_output=True, text=True,
    )
    ip = ""
    for line in result.stdout.split("\n"):
        if "inet " in line:
            ip = line.strip().split()[1].split("/")[0]

    return {"success": True, "interface": interface, "ip": ip}


def handle_disconnect_bluetooth_pan(_params):
    """Disconnect from Bluetooth PAN."""
    subprocess.run(["sudo", "ip", "link", "set", "bnep0", "down"], check=False)
    subprocess.run(["sudo", "dhclient", "-r", "bnep0"], check=False)
    return {"success": True}


def handle_get_bluetooth_pan_status(_params):
    """Check Bluetooth PAN connection status."""
    result = subprocess.run(
        ["ip", "-4", "addr", "show", "bnep0"],
        capture_output=True, text=True,
    )
    connected = result.returncode == 0 and "inet " in result.stdout
    ip = ""
    if connected:
        for line in result.stdout.split("\n"):
            if "inet " in line:
                ip = line.strip().split()[1].split("/")[0]
    return {"connected": connected, "interface": "bnep0" if connected else None, "ip": ip or None}
```

Register these handlers in your BLE RPC dispatch:
```python
METHOD_HANDLERS = {
    # ... existing handlers ...
    "connectBluetoothPAN": handle_connect_bluetooth_pan,
    "disconnectBluetoothPAN": handle_disconnect_bluetooth_pan,
    "getBluetoothPANStatus": handle_get_bluetooth_pan_status,
}
```

### Option B: WiFi Credential Sharing via BLE

Send hotspot credentials over BLE and the device connects to your WiFi hotspot.

**Device side — add to `ble.py`:**

```python
import subprocess

def handle_connect_to_wifi(params):
    """Connect to a WiFi network using NetworkManager."""
    ssid = params["ssid"]
    password = params["password"]

    # Delete existing connection with same SSID if any
    subprocess.run(
        ["sudo", "nmcli", "connection", "delete", ssid],
        capture_output=True, check=False,
    )

    result = subprocess.run(
        ["sudo", "nmcli", "device", "wifi", "connect", ssid, "password", password],
        capture_output=True, text=True,
    )

    if result.returncode == 0:
        return {"success": True}
    return {"success": False, "error": result.stderr.strip()}
```

### Usage from BLE Web Interface

1. Connect to your comma device via BLE
2. Under **Network Sharing**, click:
   - **Connect BT PAN** — enter your phone's Bluetooth MAC, device connects to your phone's BT tethering
   - **Connect WiFi** — enter hotspot SSID/password, device connects to your phone's WiFi hotspot

---

## Part 7: Bluetooth Gamepad (PS5 DualSense)

### Pairing the Controller

```bash
# Start Bluetooth scan
sudo hcitool scan
```

Put your DualSense in pairing mode (hold PS + Create buttons until light flashes).

When you see the controller MAC address, pair using Python:
```python
import dbus

bus = dbus.SystemBus()
MAC = "XX:XX:XX:XX:XX:XX"  # Your controller's MAC

device_path = f"/org/bluez/hci0/dev_{MAC.replace(':', '_')}"
device = dbus.Interface(
  bus.get_object("org.bluez", device_path),
  "org.bluez.Device1"
)
props = dbus.Interface(
  bus.get_object("org.bluez", device_path),
  "org.freedesktop.DBus.Properties"
)

props.Set("org.bluez.Device1", "Trusted", dbus.Boolean(True))
device.Pair()
device.Connect()
print("Connected!")
```

### Verify Controller

```bash
ls /dev/input/js*
cat /dev/input/js0 | xxd  # See input data
```

### Using Joystick Control

```bash
cd /data/openpilot
python tools/joystick/joystick_control.py --bluetooth
```

| Control | Action |
|---------|--------|
| Left Stick X | Steering |
| R2 Trigger | Accelerate |
| L2 Trigger | Brake |
| D-pad Up/Down | Speed mode |
| Triangle | Cancel cruise |

---

## Troubleshooting

### No /dev/ttyHS1
The Bluetooth UART is not enabled. Make sure you flashed the correct kernel with BT support.

### btattach hangs or fails
Try different baud rates:
```bash
sudo btattach -B /dev/ttyHS1 -S 115200 &  # Default
# or
sudo btattach -B /dev/ttyHS1 -S 3000000 &  # High speed
```

### hciconfig shows DOWN
```bash
sudo hciconfig hci0 up
```

### BLE server fails to register
Check if BlueZ daemon is running:
```bash
systemctl status bluetooth
# If not running:
sudo systemctl start bluetooth
```

### Web Bluetooth not working
- Only works in Chrome/Edge (not Safari/Firefox)
- Must be served over HTTPS or localhost
- Device must be advertising
- Try refreshing the page and re-scanning

### Controller not found
Use `hcitool scan` instead of `bluetoothctl scan` - it uses classic BR/EDR discovery which works better for gamepads.

---

## Files Reference

### Kernel Changes
- `agnos-kernel-sdm845/arch/arm64/configs/tici_defconfig` - Bluetooth kernel config
- `agnos-kernel-sdm845/arch/arm64/boot/dts/qcom/comma_common.dtsi` - Bluetooth UART enable

### openpilot Changes
- `system/athena/ble.py` - BLE GATT server for remote control

### Connect Site
- `public/ble-test.html` - Web Bluetooth test page
