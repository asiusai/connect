---
title: SSH Remote Access
description: How to SSH into your comma device remotely via Asius
order: 4
---

SSH into your comma device from anywhere using your GitHub SSH keys - just like comma prime, but free.

## Quick Setup

Add this to your `~/.ssh/config`:

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

Then connect with your dongle ID:

```bash
ssh asius-ef639def5527ae76
```

That's it! Your GitHub SSH key (configured on your device) handles authentication.

## Prerequisites

- Device paired with your Asius account
- Device online (connected to athena)
- SSH enabled on your device with your GitHub SSH keys configured

## How It Works

1. You SSH to `ssh.asius.ai` with your dongle ID
2. The server tells your device to connect via athena
3. SSH traffic flows through the relay to your device
4. Your device authenticates you using your GitHub SSH keys

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
- You're using the correct SSH key
- SSH is enabled on the device
