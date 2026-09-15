import fs from 'fs';
import { getValidAccessToken } from './getFreshToken.js';
import { isDefinitiveInstrumental } from './testStrictFilter.js';

const targetId = '13QpzsnVTLjv7jTmy8j1yd'; // Instrumental Haven

async function clean() {
  const { accessToken, spotify } = await getValidAccessToken();
  const client = spotify.createClient(accessToken);

  console.log('Fetching all current songs in "Instrumental Haven"...');
  let allTracks = [];
  let url = `/playlists/${targetId}/items?limit=100`;

  while (url) {
    const res = await client.get(url);
    if (res.data.items) {
      for (const item of res.data.items) {
        const t = item.item || item.track;
        if (t && t.id) allTracks.push(t);
      }
    }
    url = res.data.next ? res.data.next.replace('https://api.spotify.com/v1', '') : null;
  }

  console.log(`Current songs in playlist: ${allTracks.length}`);

  const toRemoveUris = [];
  const keepTracks = [];

  for (const t of allTracks) {
    const check = isDefinitiveInstrumental(t);
    if (check.isInst) {
      keepTracks.push(t);
    } else {
      toRemoveUris.push(t.uri);
    }
  }

  console.log(`\nPreserving ${keepTracks.length} strictly verified pure instrumentals.`);
  console.log(`Purging ${toRemoveUris.length} vocal / non-instrumental songs from playlist...\n`);

  // Remove in batches of 100 using DELETE /items (or /tracks)
  for (let i = 0; i < toRemoveUris.length; i += 100) {
    const batch = toRemoveUris.slice(i, i + 100).map(uri => ({ uri }));
    try {
      await client.delete(`/playlists/${targetId}/items`, {
        data: { tracks: batch }
      });
    } catch (e) {
      // Fallback to /tracks
      await client.delete(`/playlists/${targetId}/tracks`, {
        data: { tracks: batch }
      });
    }
    process.stdout.write(`Removed ${Math.min(i + 100, toRemoveUris.length)} / ${toRemoveUris.length} songs...\r`);
  }

  console.log('\n\n✅ Cleanup complete!');
  const finalRes = await client.get(`/playlists/${targetId}/items?limit=1`);
  console.log(`"Instrumental Haven" now contains ${finalRes.data.total} pure instrumental songs.`);
}

clean().catch(err => console.error('Clean failed:', err.response?.data || err.message));
