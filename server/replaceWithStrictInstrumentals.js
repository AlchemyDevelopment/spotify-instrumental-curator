import fs from 'fs';
import { getValidAccessToken } from './getFreshToken.js';
import { isDefinitiveInstrumental } from './testStrictFilter.js';

const targetId = '13QpzsnVTLjv7jTmy8j1yd'; // Instrumental Haven

async function replaceWithStrict() {
  const { accessToken, spotify } = await getValidAccessToken();
  const client = spotify.createClient(accessToken);
  const me = await client.get('/me');

  console.log(`\n🎧 Filtering with STRICT instrumental criteria for: ${me.data.display_name}\n`);

  // Playlists owned by Jacob with instrumental content
  const candidatePlaylistIds = [
    '6xTdYtteotMuoXQPXOb4LU', // Coding - Epic Instrumentals Jacob P
    '6vSxIsP5OA4yAHOdD1qc69', // Pokémon Jazz Covers (2)
    '6lcUPLlXM6cXWzqNYhO1s7', // Resonance
    '4gr3LehGsmO8UmgnpULF2w'  // chill study anime lo-fi thursday
  ];

  const candidateMap = new Map();

  for (const plId of candidatePlaylistIds) {
    try {
      const tracks = await spotify.getPlaylistTracks(accessToken, plId);
      console.log(`Ingested ${tracks.length} tracks from playlist ID: ${plId}`);
      tracks.forEach(t => { if (t && t.id) candidateMap.set(t.id, t); });
    } catch (e) {
      console.warn(`Skipped playlist ${plId}:`, e.message);
    }
  }

  // Ingest listening history
  const recent = await spotify.getRecentlyPlayedTracks(accessToken, 50);
  const top = await spotify.getTopTracks(accessToken, 'short_term', 50);
  console.log(`Ingested ${recent.length} recently played tracks and ${top.length} top listened tracks.`);

  recent.forEach(t => { if (t && t.id) candidateMap.set(t.id, t); });
  top.forEach(t => { if (t && t.id) candidateMap.set(t.id, t); });

  console.log(`\nTotal candidates to evaluate: ${candidateMap.size}`);
  console.log('Evaluating against STRICT instrumental criteria (zero vocal tolerance)...');

  const verified = [];
  for (const track of candidateMap.values()) {
    const res = isDefinitiveInstrumental(track);
    if (res.isInst) {
      verified.push({ track, reason: res.reason });
    }
  }

  console.log(`\n✅ Verified Pure Instrumentals: ${verified.length}`);
  console.log(`❌ Filtered Out (Vocals / Non-Instrumentals): ${candidateMap.size - verified.length}\n`);

  console.log('Sample of verified instrumentals:');
  verified.slice(0, 15).forEach((v, i) => {
    console.log(`  ${i + 1}. "${v.track.name}" by ${v.track.artists.map(a => a.name).join(', ')} [${v.reason}]`);
  });

  const uris = verified.map(v => v.track.uri);
  if (uris.length > 0) {
    console.log(`\nSetting "Instrumental Haven" on Spotify to ONLY the ${uris.length} verified instrumentals...`);
    const firstBatch = uris.slice(0, 100);
    await client.put(`/playlists/${targetId}/items`, { uris: firstBatch });

    for (let i = 100; i < uris.length; i += 100) {
      const nextBatch = uris.slice(i, i + 100);
      await client.post(`/playlists/${targetId}/items`, { uris: nextBatch });
    }

    const check = await client.get(`/playlists/${targetId}/items?limit=1`);
    console.log(`\n🎉 Success! "Instrumental Haven" now contains ${check.data.total} strictly verified pure instrumentals.`);
  }
}

replaceWithStrict().catch(err => console.error('Error:', err.response?.data || err.message));
