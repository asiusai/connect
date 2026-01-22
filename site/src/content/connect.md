---
title: Asius Connect
description: Better web interface for openpilot with high-res video, file management, and more
---

# Asius Connect

A modern web interface for openpilot with features not available in the stock connect app.

## Features

- **[High-res video playback](/videos#playback)** - Watch full-quality camera footage
- **[Video rendering](/videos#rendering)** - Create shareable videos with overlays
- **[File management](/videos#download)** - Browse, download, and delete files on your device
- **Detailed route info** - See engagement stats, alerts, and driving data
- **Share routes** - Generate signed links to share specific routes
- **[Progressive Web App](/pwa)** - Install as a native app on your phone
- **Quick actions** - One-tap buttons for common operations
- **[Remote SSH](/ssh)** - Terminal access from your browser

## Versions

We run three versions of Connect, each pointing to a different backend:

| Version | URL | Backend | Use if... |
| --- | --- | --- | --- |
| **Comma Connect** | [comma.asius.ai](https://comma.asius.ai) | Comma API | You bought from comma.ai (default) |
| **Konik Connect** | [konik.asius.ai](https://konik.asius.ai) | Konik API | You bought from konik.ai |
| **Asius Connect** | [connect.asius.ai](https://connect.asius.ai) | [Asius API](/api) | You enabled Asius API on your device |

All three versions have the same features - the only difference is which backend they connect to.

## Getting Started

1. Go to [comma.asius.ai](https://comma.asius.ai) (or your preferred version)
2. Log in with your Comma/Google/GitHub account
3. Select your device from the list

No device modifications needed - works with stock openpilot.
