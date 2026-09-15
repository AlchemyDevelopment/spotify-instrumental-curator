import fs from 'fs';
import { SpotifyService } from './spotifyService.js';

const config = JSON.parse(fs.readFileSync('./server/config.json', 'utf-8'));
const tokens = JSON.parse(fs.readFileSync('./server/tokens.json', 'utf-8'));
const spotify = new SpotifyService(config.clientId, config.clientSecret, config.redirectUri);
const client = spotify.createClient(tokens.access_token);

async function view() {
  const res = await client.get('/playlists/13QpzsnVTLjv7jTmy8j1yd/items?limit=25');
  console.log(`\n🎵 "Instrumental Haven" Playlist Status:`);
  console.log(`Total songs in playlist: ${res.data.total}\n`);
  console.log('Sample of added instrumental tracks:');
  res.data.items.slice(0, 20).forEach((i, idx) => {
    const t = i.item || i.track;
    console.log(`  ${idx + 1}. "${t.name}" by ${t.artists.map(a => a.name).join(', ')}`);
  });
}

view().catch(err => console.error(err.response?.data || err.message));
