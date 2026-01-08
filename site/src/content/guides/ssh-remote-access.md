---
title: SSH Remote Access
description: How to SSH into your comma device remotely via the Asius API
order: 4
---

With Asius, you can SSH into your comma device from anywhere using your GitHub SSH keys.

## Prerequisites

- Device paired with your Asius account
- Device online (connected to athena)
- SSH enabled on your device with your GitHub SSH keys configured
- `websocat` installed ([github.com/vi/websocat](https://github.com/vi/websocat))

## Quick Start

### 1. Install websocat

```bash
# macOS
brew install websocat

# Linux (download binary)
curl -L https://github.com/vi/websocat/releases/latest/download/websocat.x86_64-unknown-linux-musl -o websocat
chmod +x websocat
sudo mv websocat /usr/local/bin/
```

### 2. Install SSH Proxy Script

```bash
curl -fsSL https://asius.ai/asius-ssh-proxy -o asius-ssh-proxy
chmod +x asius-ssh-proxy
sudo mv asius-ssh-proxy /usr/local/bin/
```

### 3. Configure SSH

Add this to your `~/.ssh/config`:

```
Host asius-*
  User comma
  IdentityFile ~/.ssh/id_ed25519
  ProxyCommand asius-ssh-proxy %n
  StrictHostKeyChecking no
  UserKnownHostsFile /dev/null
```

### 4. Connect

Replace `ffffffffffffffff` with your dongle ID:

```bash
ssh asius-ffffffffffffffff
```

That's it! Your GitHub SSH key (configured on your device) handles authentication.

## One-off Connection

For a quick one-off connection without SSH config:

```bash
ssh -o ProxyCommand="asius-ssh-proxy ffffffffffffffff" comma@localhost
```

## Troubleshooting

### Device Offline

If you get "Device offline", make sure your device is:
- Powered on
- Connected to the internet
- Running openpilot/sunnypilot with athena enabled

### Connection Timeout

The SSH session has a 60-second window for the device to connect. If your device has slow connectivity, try again.

### Permission Denied

Make sure:
- Your GitHub SSH keys are configured on the device (Settings > SSH Keys > Add GitHub username)
- You're using the correct SSH key (`-i ~/.ssh/your_key`)
- SSH is enabled on the device

## How It Works

1. Your SSH client calls the proxy script with your dongle ID
2. The proxy connects to the Asius WebSocket relay at `wss://api.asius.ai/ssh/{dongle_id}`
3. The API tells your device to connect to the relay
4. SSH traffic flows through the WebSocket relay to your device
5. Your device authenticates you using your GitHub SSH keys

This works through firewalls and NAT without requiring port forwarding - just like comma's ssh.comma.ai, but using WebSocket relay.
