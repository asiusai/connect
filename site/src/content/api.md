---
title: Asius API
description: Cloud backend with 1TB storage, fast video playback, and no device restrictions
---

# Asius API

Our cloud backend that replaces the comma API with better features and fewer restrictions.

## Features

- **No device blocking** - Clones, PCs, robots, and custom hardware all welcome
- **1TB storage per device** - Older files automatically deleted when full
- **Fast high-res video** - Server-side HEVC conversion for instant playback
- **Fast video rendering** - Render videos without waiting for client-side processing
- **Multiple auth options** - Sign in with Google or GitHub

## Pricing

**Free during alpha.** After launch, pricing will be around $10/month per device.

## Setup

### With Asius Fork (Recommended)

1. Install one of [our forks](/forks)
2. Go to **Settings > Asius** and enable **Use Asius API**
3. Device will reboot automatically
4. Log into [connect.asius.ai](https://connect.asius.ai) and pair your device

### With Any Fork (SSH)

[SSH into your device](/ssh) and edit `/data/continue.sh` to add the API configuration:

```bash
#!/usr/bin/bash

export API_HOST=https://api.asius.ai
export ATHENA_HOST=wss://api.asius.ai

cd /data/openpilot
exec ./launch_openpilot.sh
```

Then clear `DongleId` and reboot:

```bash
rm /data/params/d/DongleId 
sudo reboot
```

After reboot, go to [connect.asius.ai](https://connect.asius.ai) and pair your device using the QR code on your device screen.

## Re-uploading Existing Files

If your files were already uploaded to another API (like connect.comma.ai), they won't automatically re-upload to Asius. To force a re-upload, clear the upload markers:

```bash
python3 -c "import os; [os.removexattr(os.path.join(r,f),'user.upload') for r,_,fs in os.walk('/data/media/0/realdata') for f in fs if 'user.upload' in os.listxattr(os.path.join(r,f))]"
```

This removes the `user.upload` attribute from all files, allowing them to be uploaded again.
