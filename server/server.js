import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { SpotifyService } from './spotifyService.js';
import { analyzeTrackInstrumental } from './instrumentalDetector.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CONFIG_FILE = path.join(__dirname, 'config.json');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3001;

// Load stored config or fallback to process.env
function loadConfig() {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const data = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
      return {
        clientId: data.clientId || process.env.SPOTIFY_CLIENT_ID || '',
        clientSecret: data.clientSecret || process.env.SPOTIFY_CLIENT_SECRET || '',
        redirectUri: data.redirectUri || process.env.SPOTIFY_REDIRECT_URI || 'http://127.0.0.1:5173/callback',
        targetPlaylistId: data.targetPlaylistId || '',
        instrumentalThreshold: data.instrumentalThreshold || 0.5,
        autoSyncIntervalMins: data.autoSyncIntervalMins || 0
      };
    }
  } catch (err) {
    console.error('Error reading config file:', err);
  }
  return {
    clientId: process.env.SPOTIFY_CLIENT_ID || '',
    clientSecret: process.env.SPOTIFY_CLIENT_SECRET || '',
    redirectUri: process.env.SPOTIFY_REDIRECT_URI || 'http://127.0.0.1:5173/callback',
    targetPlaylistId: '',
    instrumentalThreshold: 0.5,
    autoSyncIntervalMins: 0
  };
}

function saveConfig(newConfig) {
  try {
    const current = loadConfig();
    const updated = { ...current, ...newConfig };
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(updated, null, 2), 'utf-8');
    return updated;
  } catch (err) {
    console.error('Error writing config file:', err);
    throw err;
  }
}

let appConfig = loadConfig();

function getSpotifyService() {
  return new SpotifyService(appConfig.clientId, appConfig.clientSecret, appConfig.redirectUri);
}

// ================= API ROUTES =================

// Config endpoints
app.get('/api/config', (req, res) => {
  res.json({
    clientId: appConfig.clientId ? `${appConfig.clientId.substring(0, 6)}...` : '',
    hasClientSecret: !!appConfig.clientSecret,
    redirectUri: appConfig.redirectUri,
    targetPlaylistId: appConfig.targetPlaylistId,
    instrumentalThreshold: appConfig.instrumentalThreshold,
    autoSyncIntervalMins: appConfig.autoSyncIntervalMins
  });
});

app.post('/api/config', (req, res) => {
  const { clientId, clientSecret, redirectUri, targetPlaylistId, instrumentalThreshold, autoSyncIntervalMins } = req.body;
  const updates = {};
  if (clientId !== undefined) updates.clientId = clientId.trim();
  if (clientSecret !== undefined) updates.clientSecret = clientSecret.trim();
  if (redirectUri !== undefined) updates.redirectUri = redirectUri.trim();
  if (targetPlaylistId !== undefined) updates.targetPlaylistId = targetPlaylistId;
  if (instrumentalThreshold !== undefined) updates.instrumentalThreshold = Number(instrumentalThreshold);
  if (autoSyncIntervalMins !== undefined) updates.autoSyncIntervalMins = Number(autoSyncIntervalMins);

  appConfig = saveConfig(updates);
  res.json({ success: true, message: 'Settings saved successfully' });
});

// OAuth Login
app.get('/api/auth/login', (req, res) => {
  if (!appConfig.clientId) {
    return res.status(400).json({ error: 'Spotify Client ID is not configured. Please enter it in Settings.' });
  }
  const customRedirect = req.query.redirect_uri || appConfig.redirectUri;
  const spotify = new SpotifyService(appConfig.clientId, appConfig.clientSecret, customRedirect);
  const authUrl = spotify.getAuthorizationUrl('spotify_curator_auth');
  res.json({ url: authUrl });
});

// OAuth Callback & Code Exchange
app.post('/api/auth/callback', async (req, res) => {
  const { code, redirectUri } = req.body;
  if (!code) {
    return res.status(400).json({ error: 'Missing authorization code' });
  }

  try {
    const customRedirect = redirectUri || appConfig.redirectUri;
    const spotify = new SpotifyService(appConfig.clientId, appConfig.clientSecret, customRedirect);
    const tokenData = await spotify.exchangeCode(code);
    res.json(tokenData);
  } catch (err) {
    console.error('Token exchange error:', err.response?.data || err.message);
    res.status(500).json({
      error: 'Failed to exchange authorization code',
      details: err.response?.data || err.message
    });
  }
});

// Token Refresh
app.post('/api/auth/refresh', async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) {
    return res.status(400).json({ error: 'Missing refresh token' });
  }

  try {
    const spotify = getSpotifyService();
    const tokenData = await spotify.refreshToken(refreshToken);
    res.json(tokenData);
  } catch (err) {
    console.error('Token refresh error:', err.response?.data || err.message);
    res.status(500).json({
      error: 'Failed to refresh token',
      details: err.response?.data || err.message
    });
  }
});

// Current User Profile
app.get('/api/user/me', async (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'No token provided' });

  try {
    const spotify = getSpotifyService();
    const user = await spotify.getCurrentUser(token);
    res.json(user);
  } catch (err) {
    res.status(err.response?.status || 500).json({ error: err.response?.data || err.message });
  }
});

// User Playlists
app.get('/api/playlists', async (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'No token provided' });

  try {
    const spotify = getSpotifyService();
    const playlists = await spotify.getUserPlaylists(token);
    res.json(playlists);
  } catch (err) {
    res.status(err.response?.status || 500).json({ error: err.response?.data || err.message });
  }
});

// Target Playlist Creation
app.post('/api/target/create', async (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  const { name, description, userId } = req.body;
  if (!token) return res.status(401).json({ error: 'No token provided' });

  try {
    const spotify = getSpotifyService();
    const playlist = await spotify.createPlaylist(token, userId, name || 'Instrumental Collection', description);
    res.json(playlist);
  } catch (err) {
    res.status(err.response?.status || 500).json({ error: err.response?.data || err.message });
  }
});

// Track Scanner & Instrumental Analyzer
app.post('/api/scan', async (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'No token provided' });

  const {
    sourcePlaylistIds = [],
    includeRecentlyPlayed = false,
    includeTopTracks = false,
    includeLikedSongs = false,
    targetPlaylistId = '',
    threshold = 0.5,
    checkLyrics = true
  } = req.body;

  try {
    const spotify = getSpotifyService();
    const rawTracksMap = new Map(); // id -> { track, source }

    // 1. Fetch from Selected Source Playlists
    for (const playlistId of sourcePlaylistIds) {
      try {
        const tracks = await spotify.getPlaylistTracks(token, playlistId);
        for (const track of tracks) {
          if (track && track.id && !rawTracksMap.has(track.id)) {
            rawTracksMap.set(track.id, { track, source: 'Playlist' });
          }
        }
      } catch (err) {
        console.error(`Error fetching playlist ${playlistId}:`, err.message);
      }
    }

    // 2. Fetch from Recently Played
    if (includeRecentlyPlayed) {
      const recentTracks = await spotify.getRecentlyPlayedTracks(token, 50);
      for (const track of recentTracks) {
        if (track && track.id && !rawTracksMap.has(track.id)) {
          rawTracksMap.set(track.id, { track, source: 'Recently Played' });
        }
      }
    }

    // 3. Fetch from Top Tracks
    if (includeTopTracks) {
      const topTracks = await spotify.getTopTracks(token, 'short_term', 50);
      for (const track of topTracks) {
        if (track && track.id && !rawTracksMap.has(track.id)) {
          rawTracksMap.set(track.id, { track, source: 'Top Listened' });
        }
      }
    }

    // 4. Fetch from Liked Songs
    if (includeLikedSongs) {
      const likedTracks = await spotify.getSavedTracks(token, 50);
      for (const track of likedTracks) {
        if (track && track.id && !rawTracksMap.has(track.id)) {
          rawTracksMap.set(track.id, { track, source: 'Liked Songs' });
        }
      }
    }

    const allTracks = Array.from(rawTracksMap.values());
    const trackIds = allTracks.map(t => t.track.id);

    // 5. Fetch Audio Features in batch
    let audioFeaturesMap = {};
    try {
      audioFeaturesMap = await spotify.getAudioFeaturesBatch(token, trackIds);
    } catch (featErr) {
      console.warn('Audio features batch fetch skipped/unavailable');
    }

    // 6. Check existing tracks in Target Playlist for deduplication
    let existingTargetUris = new Set();
    if (targetPlaylistId) {
      try {
        existingTargetUris = await spotify.getTargetPlaylistTrackUris(token, targetPlaylistId);
      } catch (targetErr) {
        console.warn('Could not fetch existing target playlist tracks:', targetErr.message);
      }
    }

    // 7. Run Instrumental Evaluation Pipeline
    const evaluatedTracks = [];
    for (const item of allTracks) {
      const track = item.track;
      const audioFeat = audioFeaturesMap[track.id] || null;
      
      const analysis = await analyzeTrackInstrumental(track, audioFeat, {
        threshold: Number(threshold),
        checkLyrics: !!checkLyrics
      });

      const isAlreadyInTarget = existingTargetUris.has(track.uri);

      evaluatedTracks.push({
        ...analysis,
        source: item.source,
        alreadyInTarget: isAlreadyInTarget,
        selected: analysis.isInstrumental && !isAlreadyInTarget
      });
    }

    // Sort tracks: Instrumental candidates first (highest confidence first), then non-instrumentals
    evaluatedTracks.sort((a, b) => {
      if (a.isInstrumental && !b.isInstrumental) return -1;
      if (!a.isInstrumental && b.isInstrumental) return 1;
      return b.confidenceScore - a.confidenceScore;
    });

    res.json({
      totalScanned: evaluatedTracks.length,
      instrumentalCount: evaluatedTracks.filter(t => t.isInstrumental).length,
      newToAddCount: evaluatedTracks.filter(t => t.isInstrumental && !t.alreadyInTarget).length,
      tracks: evaluatedTracks
    });

  } catch (err) {
    console.error('Scan error:', err);
    res.status(500).json({ error: 'Failed to complete scan', details: err.message });
  }
});

// Target Playlist Sync (Add selected songs)
app.post('/api/target/sync', async (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'No token provided' });

  const { targetPlaylistId, trackUris = [] } = req.body;
  if (!targetPlaylistId) {
    return res.status(400).json({ error: 'Target playlist ID is required' });
  }
  if (!trackUris.length) {
    return res.status(400).json({ error: 'No tracks selected to add' });
  }

  try {
    const spotify = getSpotifyService();
    // Verify & Deduplicate against target
    const existingUris = await spotify.getTargetPlaylistTrackUris(token, targetPlaylistId);
    const newUris = trackUris.filter(uri => !existingUris.has(uri));

    if (newUris.length === 0) {
      return res.json({ addedCount: 0, message: 'All selected tracks already exist in target playlist.' });
    }

    const result = await spotify.addTracksToPlaylist(token, targetPlaylistId, newUris);
    res.json({
      success: true,
      addedCount: result.added,
      totalRequested: trackUris.length,
      skippedDuplicates: trackUris.length - result.added
    });
  } catch (err) {
    console.error('Sync error:', err.response?.data || err.message);
    res.status(500).json({ error: 'Failed to add tracks to playlist', details: err.response?.data || err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
