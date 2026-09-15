# 🎵 Spotify Instrumental Playlist Curator

An intelligent application that connects to your Spotify account, scans tracks across chosen source playlists and listening activity (recently played, top tracks, liked songs), analyzes them using multi-signal instrumental detection, and curates qualifying instrumental songs into a designated target playlist with automatic duplicate prevention.

---

## ⚡ Features

- 🎧 **Multi-Source Ingestion**:
  - Scan any number of your existing Spotify playlists.
  - Scan your **Recently Played** listening history.
  - Scan your **Top Tracks** & **Liked Songs** library.
- 🔬 **Multi-Signal Instrumental Detection**:
  - Spotify Audio Features analysis (`instrumentalness` score).
  - Open LRCLIB lyrics registry check (confirms absence of vocal lyrics).
  - Acoustic, soundtrack, score, and title keyword heuristics.
  - Customizable confidence threshold slider (0% to 100%).
- 🛡️ **Intelligent Deduplication**:
  - Automatically compares against songs already in the target playlist so duplicate entries are never created.
- 🔊 **Live Preview Audio Player**:
  - Built-in 30-second audio snippet player for previewing songs before adding them.
- ✨ **Instant Playlist Creation & Sync**:
  - Create a new instrumental playlist directly from the UI or select an existing one.
  - Add qualifying tracks in batch with one click.
- 💎 **Modern Dark UI**:
  - Spotify-themed OLED aesthetic, glassmorphism panels, and smooth micro-animations.

---

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Start the Application
```bash
npm run dev
```
This runs both the Express backend API (`http://localhost:3001`) and the Vite React frontend (`http://localhost:5173`).

---

## 🔑 Spotify Developer Setup (1 Minute)

1. Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard) and log in.
2. Click **Create App**:
   - **App Name**: `Spotify Instrumental Curator`
   - **Redirect URI**: `http://127.0.0.1:5173/callback`
   - **APIs**: Select **Web API**
3. Open your app's **Settings** tab in the dashboard and copy the **Client ID** and **Client Secret**.
4. In the application, click **Settings** (or follow the built-in **Setup Guide**), paste your credentials, and click **Connect Spotify**!
