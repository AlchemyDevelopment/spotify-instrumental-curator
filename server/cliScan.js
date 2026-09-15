import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { SpotifyService } from './spotifyService.js';
import { analyzeTrackInstrumental } from './instrumentalDetector.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TOKENS_FILE = path.join(__dirname, 'tokens.json');
const CONFIG_FILE = path.join(__dirname, 'config.json');

if (!fs.existsSync(TOKENS_FILE)) {
  console.error('No tokens found. Please run "node server/cliLogin.js" first.');
  process.exit(1);
}

const config = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
let tokens = JSON.parse(fs.readFileSync(TOKENS_FILE, 'utf-8'));
const spotify = new SpotifyService(config.clientId, config.clientSecret, config.redirectUri);

async function main() {
  let accessToken = tokens.access_token;

  // Refresh token check
  try {
    const user = await spotify.getCurrentUser(accessToken);
    console.log(`\n🎧 Logged in as: ${user.display_name} (${user.id})`);
  } catch (err) {
    if (tokens.refresh_token) {
      console.log('Refreshing expired access token...');
      tokens = await spotify.refreshToken(tokens.refresh_token);
      fs.writeFileSync(TOKENS_FILE, JSON.stringify(tokens, null, 2), 'utf-8');
      accessToken = tokens.access_token;
    } else {
      throw err;
    }
  }

  // 1. Fetch Playlists
  console.log('\nFetching your playlists...');
  const playlists = await spotify.getUserPlaylists(accessToken);
  console.log(`Found ${playlists.length} playlists:`);
  playlists.slice(0, 15).forEach((p, idx) => {
    console.log(`  [${idx + 1}] "${p.name}" (${p.tracks?.total || 0} tracks) - ID: ${p.id}`);
  });

  // 2. Fetch Recently Played
  console.log('\nFetching your recently played tracks...');
  const recentTracks = await spotify.getRecentlyPlayedTracks(accessToken, 50);
  console.log(`Retrieved ${recentTracks.length} recently played tracks.`);

  // 3. Fetch Top Tracks
  console.log('Fetching your top listened tracks...');
  const topTracks = await spotify.getTopTracks(accessToken, 'short_term', 50);
  console.log(`Retrieved ${topTracks.length} top listened tracks.`);

  // 4. Combine listening history
  const trackMap = new Map();
  recentTracks.forEach(t => { if (t && t.id) trackMap.set(t.id, { track: t, source: 'Recently Played' }); });
  topTracks.forEach(t => { if (t && t.id && !trackMap.has(t.id)) trackMap.set(t.id, { track: t, source: 'Top Tracks' }); });

  console.log(`\nTotal unique songs in listening history: ${trackMap.size}`);

  // 5. Analyze songs
  console.log('\n--- Analyzing Listening History for Instrumentals ---');
  const results = [];
  for (const item of trackMap.values()) {
    const analysis = await analyzeTrackInstrumental(item.track, null, { threshold: 0.5, checkLyrics: true });
    results.push({ ...analysis, source: item.source });
  }

  const instrumentals = results.filter(r => r.isInstrumental);
  console.log(`\nFound ${instrumentals.length} instrumental songs from your listening history:`);
  instrumentals.forEach((t, i) => {
    console.log(`  ${i + 1}. "${t.name}" by ${t.artists} (${t.confidenceScore}%) [${t.reasons.join('; ')}]`);
  });

  const vocals = results.filter(r => !r.isInstrumental);
  console.log(`\nRejected ${vocals.length} vocal songs (e.g. ${vocals.slice(0, 5).map(v => `"${v.name}"`).join(', ')}...)`);
}

main().catch(err => {
  console.error('Scan failed:', err.response?.data || err.message);
});
