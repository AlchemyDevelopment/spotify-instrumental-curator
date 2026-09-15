import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { SpotifyService } from './spotifyService.js';
import { analyzeTrackInstrumental } from './instrumentalDetector.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TOKENS_FILE = path.join(__dirname, 'tokens.json');
const CONFIG_FILE = path.join(__dirname, 'config.json');

const config = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
let tokens = JSON.parse(fs.readFileSync(TOKENS_FILE, 'utf-8'));
const spotify = new SpotifyService(config.clientId, config.clientSecret, config.redirectUri);

async function sync() {
  const accessToken = tokens.access_token;
  const targetPlaylistId = '13QpzsnVTLjv7jTmy8j1yd'; // "Instrumental Haven"

  console.log('Fetching recently played & top tracks...');
  const recent = await spotify.getRecentlyPlayedTracks(accessToken, 50);
  const top = await spotify.getTopTracks(accessToken, 'short_term', 50);

  const trackMap = new Map();
  recent.forEach(t => { if (t && t.id) trackMap.set(t.id, t); });
  top.forEach(t => { if (t && t.id && !trackMap.has(t.id)) trackMap.set(t.id, t); });

  console.log(`Analyzing ${trackMap.size} songs from listening history...`);
  const qualifyingUris = [];

  for (const track of trackMap.values()) {
    const analysis = await analyzeTrackInstrumental(track, null, { threshold: 0.5, checkLyrics: true });
    if (analysis.isInstrumental) {
      qualifyingUris.push(track.uri);
    }
  }

  console.log(`Found ${qualifyingUris.length} qualifying instrumentals.`);

  // Check existing tracks in target
  console.log('Checking existing songs in "Instrumental Haven"...');
  const existingUris = await spotify.getTargetPlaylistTrackUris(accessToken, targetPlaylistId);
  const newUris = qualifyingUris.filter(uri => !existingUris.has(uri));

  console.log(`${existingUris.size} songs already in playlist. ${newUris.length} new songs to add.`);

  if (newUris.length > 0) {
    console.log(`Adding ${newUris.length} songs to "Instrumental Haven"...`);
    const res = await spotify.addTracksToPlaylist(accessToken, targetPlaylistId, newUris);
    console.log(`✅ Successfully added ${res.added} new songs!`);
  } else {
    console.log('All songs are already in "Instrumental Haven".');
  }
}

sync().catch(err => {
  console.error('Sync failed:', err.response?.data || err.message);
});
