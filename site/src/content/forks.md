---
title: Asius Forks
description: Install Asius openpilot or sunnypilot fork on your device
---

# Asius Forks

Our modified [openpilot](https://github.com/asiusai/openpilot) and [sunnypilot](https://github.com/asiusai/sunnypilot) forks add remote control features that aren't available in stock openpilot.

## Features

- **Remote video streaming** - Watch your car's cameras live from anywhere
- **Remote joystick control** - Control your car from your phone
- **Remote params editing** - Change device settings without SSH
- **Model switching** - Switch driving models from the web interface
- **Navigation** - Basic navigation support (alpha feature, sunnypilot only)

After installing, you'll find an **Asius** tab in your device settings to configure these features.

## Installation

### Easy Install (Recommended)

1. Go to **Settings > Software** on your device and tap **Uninstall**
2. After reboot, select **Custom Software**
3. Enter one of these URLs:
   - `openpilot.asius.ai` - for openpilot
   - `sunnypilot.asius.ai` - for sunnypilot

**Custom branches:** Use `sunnypilot.asius.ai/USERNAME/BRANCH` to install from `github.com/USERNAME/sunnypilot/tree/BRANCH`. Defaults to `asiusai/master`.

### SSH Install

[SSH into your device](/ssh) and run:

**openpilot:**
```bash
cd /data && rm -rf openpilot && git clone https://github.com/asiusai/openpilot && cd openpilot && git submodule update --init --recursive && sudo reboot
```

**sunnypilot:**
```bash
cd /data && rm -rf openpilot && git clone https://github.com/asiusai/sunnypilot openpilot && cd openpilot && git submodule update --init --recursive && sudo reboot
```

## Remote Streaming

Watch your car's cameras live from anywhere in the world.

- **Dual camera view** - Wide road and driver cameras displayed side by side
- **Two-way audio** - Hear your car's microphone and hold to speak through the speakers
- **Disabled by default** - Enable in Asius settings when needed

## Joystick Control

Remote vehicle control for testing and debugging purposes.

**Setup:**
1. Enable **Remote Streaming** in Asius settings
2. Enable **Joystick Debug Mode** in Developer settings on your device
3. Open the Sentry page in Connect and tap **Joystick**

**Controls:**
- Drag to steer and accelerate/brake
- Adjust sensitivity with the slider at the bottom

**Warning:** For debugging only. Not suitable for regular driving.

## Remote Params Editing

Modify device parameters remotely without SSH. You can edit all params except SSH keys.

**Common use cases:**
- Switch driving models
- Set navigation favorites and start navigation
- Reboot or shutdown the device
- Change hidden settings (screen timeout, etc.)
- Toggle remote streaming on/off

