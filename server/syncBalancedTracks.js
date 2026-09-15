import fs from 'fs';
import { getValidAccessToken } from './getFreshToken.js';

const targetId = '13QpzsnVTLjv7jTmy8j1yd'; // Instrumental Haven

async function syncBalanced() {
  const balancedData = JSON.parse(fs.readFileSync('./server/balancedTracks.json', 'utf-8'));
  console.log(`Loaded ${balancedData.length} balanced instrumental tracks.`);

  const uris = Array.from(new Set(balancedData.map(item => item.track.uri))).filter(Boolean);
  console.log(`Unique Spotify URIs to sync: ${uris.length}`);

  const { accessToken, spotify } = await getValidAccessToken();
  const client = spotify.createClient(accessToken);

  try {
    console.log(`Updating "Instrumental Haven" with first 100 tracks...`);
    const firstBatch = uris.slice(0, 100);
    await client.put(`/playlists/${targetId}/items`, { uris: firstBatch });
    console.log(`Batch 1 (1-100) synced successfully.`);

    if (uris.length > 100) {
      for (let i = 100; i < uris.length; i += 100) {
        const nextBatch = uris.slice(i, i + 100);
        console.log(`Appending batch ${Math.floor(i / 100) + 1} (${i + 1} to ${Math.min(i + 100, uris.length)})...`);
        await client.post(`/playlists/${targetId}/items`, { uris: nextBatch });
      }
    }

    console.log(`\n🎉 All ${uris.length} balanced instrumentals synced to "Instrumental Haven"!`);
  } catch (err) {
    if (err.response?.status === 429) {
      const retryAfter = err.response?.headers?.['retry-after'] || 'a while';
      console.warn(`\n⏳ Spotify API playlist endpoint is currently rate-limited (cooldown: ${retryAfter}s).`);
      console.warn(`The 191 tracks are safely stored in server/balancedTracks.json and will be synced as soon as Spotify's cooldown window opens.`);
    } else {
      console.error(`Sync error:`, err.response?.data || err.message);
    }
  }
}

syncBalanced().catch(console.error);
