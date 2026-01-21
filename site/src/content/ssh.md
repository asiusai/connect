---
title: SSH Remote Access
description: How to SSH into your comma device remotely via Asius
order: 4
---

SSH into your comma device from anywhere using your GitHub SSH keys - free for everyone.

## Quick Start

One-liner to SSH into your device:

```bash
ssh -o ProxyCommand="ssh -W %h:%p -p 2222 %h@ssh.asius.ai" -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null comma@asius-DONGLE_ID
```

Replace `DONGLE_ID` with your device's dongle ID.

## Recommended Setup

Add this to your `~/.ssh/config` for easier access:

```
Host ssh.asius.ai
  Port 2222
  StrictHostKeyChecking no
  UserKnownHostsFile /dev/null

Host asius-*
  User comma
  ProxyCommand ssh -W %h:%p %h@ssh.asius.ai
  StrictHostKeyChecking no
  UserKnownHostsFile /dev/null
```

Then simply run:

```bash
ssh asius-DONGLE_ID
```

## Multi-Provider Support

Asius SSH proxy works with devices connected to **comma.ai**, **konik.ai**, or **asius.ai**. For comma and konik devices, you need to include your auth token in the connection.

### For comma.ai devices

Get your token from [comma connect](https://connect.comma.ai) settings, then:

```bash
ssh comma-DONGLE_ID-YOUR_JWT_TOKEN
```

Or add to `~/.ssh/config`:

```
Host comma-*
  User comma
  ProxyCommand ssh -W %h:%p %h@ssh.asius.ai
  StrictHostKeyChecking no
  UserKnownHostsFile /dev/null
```

### For konik.ai devices

Get your token from [konik connect](https://connect.konik.ai) settings, then:

```bash
ssh konik-DONGLE_ID-YOUR_JWT_TOKEN
```

Or add to `~/.ssh/config`:

```
Host konik-*
  User comma
  ProxyCommand ssh -W %h:%p %h@ssh.asius.ai
  StrictHostKeyChecking no
  UserKnownHostsFile /dev/null
```

## Prerequisites

- Device online (connected to athena)
- SSH enabled on your device with your GitHub SSH keys configured
- For asius: Device paired with your Asius account
- For comma/konik: Valid auth token from their connect app

## How It Works

1. You SSH to `ssh.asius.ai:2222` with your dongle ID (and token for comma/konik)
2. The server sends a `startLocalProxy` command to your device via athena
3. Your device opens a WebSocket connection back to the server
4. SSH traffic flows through the relay to your device
5. Your device authenticates you using your GitHub SSH keys

This works through firewalls and NAT without requiring port forwarding.

## Troubleshooting

### Device Offline

If you get a connection timeout, make sure your device is:
- Powered on
- Connected to the internet
- Running openpilot/sunnypilot with athena enabled

### Permission Denied

Make sure:
- Your GitHub SSH keys are configured on the device (Settings > SSH Keys > Add GitHub username)
- You're using the correct SSH key locally
- SSH is enabled on the device

### Token Expired (comma/konik)

If you get an authentication error, your token may have expired. Get a fresh token from the connect app settings.
