---
title: SSH Remote Access
description: How to SSH into your comma device remotely
---

# SSH Remote Access

SSH into your comma device from anywhere. Works with any openpilot fork and any API, completely free.

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

## Browser

The connect app includes a browser-based terminal. To enable it, set `SSH Keys` on your device to `ouasius`. Then you can go to the terminal page in our connect.

**Security note:** Browser SSH relies only on JWT authentication. If someone obtains your JWT token, they can access your device. We recommend removing the `ouasius` key when you're done. Best used for quick access on mobile when CLI isn't available.
