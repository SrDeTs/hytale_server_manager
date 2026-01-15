---
title: Your First Server
description: A complete guide to setting up your first Hytale server.
category: guides
order: 1
---

## Introduction

This guide walks you through setting up your first Hytale server from scratch, including installation, configuration, and basic management.

## Prerequisites

Before you begin, ensure you have:

- Hytale Server Manager installed ([Installation Guide](/hytale_server_manager/docs/getting-started/installation))
- Admin access to the panel
- At least 2 GB of available RAM for the server

## Step 1: Log In

1. Open your browser and navigate to your panel URL (default: `http://localhost:3001`)
2. Log in with your admin credentials
3. You'll be taken to the Dashboard

## Step 2: Create the Server

1. Click **Servers** in the sidebar
2. Click the **Create Server** button
3. Fill in the details:
   - **Name**: Give your server a memorable name (e.g., "My First Server")
   - **Port**: Use the default or choose a custom port
   - **Max Players**: Set based on your hardware (start with 10-20)
4. Click **Create**

## Step 3: Configure Server Settings

After creation, click on your server to access settings:

### Memory Allocation

1. Go to **Settings** tab
2. Set **Minimum Memory** to at least 1024 MB
3. Set **Maximum Memory** based on available RAM (2048-4096 MB recommended)
4. Save changes

### Server Properties

Configure basic gameplay settings:

- Game mode (survival, creative, etc.)
- Difficulty level
- PvP settings
- World spawn settings

## Step 4: Start the Server

1. Return to the server overview
2. Click the **Start** button
3. Watch the console for startup messages
4. Wait for "Server started" message

## Step 5: Connect and Play

Once the server is running:

1. Note the server's IP address and port
2. Open Hytale
3. Connect to `your-ip:port`
4. Enjoy your server!

## Step 6: Set Up Basic Protection

### Enable Backups

1. Go to **Backups** in the sidebar
2. Click **Create Backup** to make your first backup
3. Consider setting up automated backups in **Automation**

### Create Additional Users

If others will help manage the server:

1. Go to **Settings** > **Users**
2. Create moderator accounts with appropriate permissions

## Troubleshooting

### Server Won't Start

- Check the console for error messages
- Verify sufficient memory is allocated
- Ensure the port isn't already in use

### Can't Connect

- Verify the server is running
- Check firewall settings
- Confirm you're using the correct IP and port

## Next Steps

- [Install Mods](/hytale_server_manager/docs/guides/installing-mods) - Add content to your server
- [Set Up Automation](/hytale_server_manager/docs/features/automation) - Schedule backups and restarts
- [Configure Backups](/hytale_server_manager/docs/features/backups) - Protect your server data
