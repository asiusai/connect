---
title: Install Openpilot Fork
description: How to install Asius openpilot or sunnypilot forks on your comma device
order: 1
---

Install our openpilot forks on your comma device to unlock extra features like video streaming, joystick control, and more.

## Choose Your Fork

| Fork | Best For |
|------|----------|
| **Openpilot** | Stock openpilot + Asius features |
| **Sunnypilot** | All sunnypilot features + Asius extras (navigation editing, etc.) |

## Option 1: URL Install

On your comma device, enter one of these URLs in the installer:

**Openpilot:**
```
https://openpilot.asius.ai
```

**Sunnypilot:**
```
https://sunnypilot.asius.ai
```

## Option 2: Git Clone

Or clone directly from GitHub:

**Openpilot:**
```bash
git clone https://github.com/asiusai/openpilot
```

**Sunnypilot:**
```bash
git clone https://github.com/asiusai/sunnypilot
```

## After Installation

Once installed, you can access your device at:

1. [comma.asius.ai](https://comma.asius.ai) - if using Comma API (default)
2. [connect.asius.ai](https://connect.asius.ai) - if using Asius API (premium)

## Sunnypilot Extras

The sunnypilot fork includes additional features:

- Edit navigation favourites from the app
- Navigate to destinations from the app

## CLI on Existing Device

```bash
echo -n "http://10.93.51.50:8080" > /data/params/d/APIHost
echo -n "ws://10.93.51.50:8080" > /data/params/d/AthenaHost
rm /data/params/d/DongleId
./system/athena/registration.py # for testing
find /data/media/0/realdata -type f -exec setfattr -x user.upload {} + 2>/dev/null && echo "Done"
sudo reboot
```
