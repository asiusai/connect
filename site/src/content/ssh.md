---
title: Remote SSH for Comma Device - Free SSH Access from Anywhere
description: Free remote SSH access to your comma device from anywhere. Works with any openpilot fork, no Prime subscription needed. Browser and CLI options.
---

# Remote SSH for Comma Device

SSH into your comma device from anywhere, completely free. Works with any openpilot fork and any API - no Prime subscription needed.

## CLI

**Prerequisites:** Set `SSH Keys` on your device to a GitHub account where you own the private keys.

The easiest way is to use the copy-paste commands in our connect app. For manual setup, follow the instructions below.

Replace `DONGLE_ID` with your device's dongle ID and `JWT_TOKEN` with your API token. We recommend using an encrypted token - if your shell history or config file leaks, the encrypted token remains secure since only our API can decrypt it. Get your encrypted token from the connect app.

**API prefixes:** These examples use the comma API (`comma-`). For other APIs, use `konik-` or `asius-` instead.

### Quick command

```bash
ssh -o ProxyCommand="ssh -W %h:%p comma-DONGLE_ID-JWT_TOKEN@ssh.asius.ai -p 2222" comma@localhost
```

### SSH config (multiple devices)

Add to `~/.ssh/config`:

```bash
Host comma-*
  HostName localhost
  User comma
  ProxyCommand ssh -W %h:%p %n-JWT_TOKEN@ssh.asius.ai -p 2222
```

Then connect using your dongle ID:

```bash
ssh comma-DONGLE_ID
```

### SSH config (single device)

Add to `~/.ssh/config` (you can rename `comma3x` to anything):

```bash
Host comma3x
  HostName localhost
  User comma
  ProxyCommand ssh -W %h:%p comma-DONGLE_ID-JWT_TOKEN@ssh.asius.ai -p 2222
```

Then connect with:

```bash
ssh comma3x
```

### How it works

1. You connect to `ssh.asius.ai:2222` with username `PROVIDER-DONGLE_ID-TOKEN`
2. Our server decrypts the token (if encrypted) and calls the provider's Athena API with `getSshAuthorizedKeys`
3. Your SSH public key is verified against the device's authorized keys
4. If authorized, we call `startLocalProxy` on Athena with a WebSocket URL (`wss://ssh.asius.ai/ssh/SESSION_ID`)
5. Your device opens a WebSocket to that URL and starts proxying SSH traffic
6. You're connected - all traffic flows through the WebSocket tunnel

**Security:** We store nothing. Even if your encrypted token leaks (from shell history or config files), an attacker still can't connect - they'd also need your private SSH key. The encrypted token can only be decrypted by our server, so intercepting it is useless without the corresponding private key.

## Browser

The connect app includes a browser-based terminal. To enable it, set `SSH Keys` on your device to `ouasius`. Then you can go to the terminal page in our connect.

### How it works

1. Your browser opens a WebSocket to `wss://ssh.asius.ai/browser/PROVIDER-DONGLE_ID-TOKEN`
2. Our server spawns an SSH process using the `ouasius` private key (stored on our server)
3. This SSH process connects through the same proxy flow as CLI - calling `startLocalProxy` on your device
4. The WebSocket proxies terminal I/O between your browser and the SSH process

**Security:** Browser SSH relies only on your JWT token for authentication. If someone obtains your token, they can access your device as long as `ouasius` is in your authorized keys. Remove the `ouasius` key when you're done - treat browser SSH as temporary access for when CLI isn't available (like on mobile).