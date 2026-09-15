import fs from 'fs';
import { SpotifyService } from './spotifyService.js';
import { analyzeTrackInstrumental } from './instrumentalDetector.js';

const config = JSON.parse(fs.readFileSync('./server/config.json', 'utf-8'));
let tokens = JSON.parse(fs.readFileSync('./server/tokens.json', 'utf-8'));
const spotify = new SpotifyService(config.clientId, config.clientSecret, config.redirectUri);

async function scanPlaylists() {
  const client = spotify.createClient(tokens.access_token);
  const me = await client.get('/me');
  console.log(`\n🎧 Scanning playlists for: ${me.data.display_name} (${me.data.id})\n`);

  // 1. Fetch user playlists
  const playlists = await spotify.getUserPlaylists(tokens.access_token, 50);
  const targetId = '13QpzsnVTLjv7jTmy8j1yd'; // "Instrumental Haven"
  const myPlaylists = playlists.filter(p => p.id !== targetId && p.owner.id === me.data.id);
  console.log(`Found ${myPlaylists.length} playlists created by you.`);

  // 2. Fetch tracks from user playlists
  console.log('Ingesting tracks from all playlists...');
  const allTracksMap = new Map(); // id -> { track, playlistNames: Set }

  for (const pl of myPlaylists) {
    try {
      const tracks = await spotify.getPlaylistTracks(tokens.access_token, pl.id);
      for (const track of tracks) {
        if (track && track.id) {
          if (!allTracksMap.has(track.id)) {
            allTracksMap.set(track.id, { track, playlists: new Set([pl.name]) });
          } else {
            allTracksMap.get(track.id).playlists.add(pl.name);
          }
        }
      }
    } catch (err) {
      // Skip empty or restricted playlists
    }
  }

  const trackEntries = Array.from(allTracksMap.values());
  console.log(`Total unique songs across all your playlists: ${trackEntries.length}`);

  // 3. Fast Parallel Multi-Signal Analysis
  console.log('\n--- Analyzing All Songs for Instrumentals (Fast Heuristics & Verification) ---');
  const evaluated = [];
  const chunkSize = 25;

  for (let i = 0; i < trackEntries.length; i += chunkSize) {
    const chunk = trackEntries.slice(i, i + chunkSize);
    const chunkPromises = chunk.map(async (item) => {
      const isFromInstrumentalNamedPlaylist = Array.from(item.playlists).some(name =>
        /instrumental|ambient|chill|bgm|ost|score|focus|no lyrics|soundtrack|lo-fi|jazz cover/i.test(name)
      );

      // Fast evaluation
      const analysis = await analyzeTrackInstrumental(item.track, null, {
        threshold: 0.5,
        checkLyrics: !isFromInstrumentalNamedPlaylist, // if already in an instrumental playlist, no need to query lyrics!
        trustSourcePlaylist: isFromInstrumentalNamedPlaylist,
        source: 'Playlist'
      });

      return {
        ...analysis,
        playlists: Array.from(item.playlists)
      };
    });

    const chunkResults = await Promise.all(chunkPromises);
    evaluated.push(...chunkResults);
    process.stdout.write(`Evaluated ${evaluated.length} / ${trackEntries.length} songs...\r`);
  }

  console.log('\n');
  const instrumentals = evaluated.filter(t => t.isInstrumental);
  const vocals = evaluated.filter(t => !t.isInstrumental);

  console.log(`\n✅ Instrumental Songs Detected: ${instrumentals.length}`);
  console.log(`❌ Vocal Songs Rejected: ${vocals.length}\n`);

  // 4. Compare with "Instrumental Haven"
  console.log('Comparing with "Instrumental Haven" for new songs...');
  const existingUris = await spotify.getTargetPlaylistTrackUris(tokens.access_token, targetId);
  const newInstrumentals = instrumentals.filter(t => !existingUris.has(t.uri));

  console.log(`Songs currently in "Instrumental Haven": ${existingUris.size}`);
  console.log(`Newly discovered instrumental songs: ${newInstrumentals.length}\n`);

  console.log('Sample of newly discovered instrumental tracks:');
  newInstrumentals.slice(0, 15).forEach((t, i) => {
    const fromPl = t.playlists.slice(0, 2).join(', ');
    console.log(`  ${i + 1}. "${t.name}" by ${t.artists} (${t.confidenceScore}%)`);
    console.log(`     └─ From playlist: "${fromPl}" | Reason: ${t.reasons[0] || 'Instrumental'}`);
  });

  // 5. Add to "Instrumental Haven"
  if (newInstrumentals.length > 0) {
    console.log(`\nAdding ${newInstrumentals.length} newly discovered songs to "Instrumental Haven"...`);
    const newUris = newInstrumentals.map(t => t.uri);
    const added = await spotify.addTracksToPlaylist(tokens.access_token, targetId, newUris);
    console.log(`🎉 Successfully added ${added.added} new instrumental songs to "Instrumental Haven"!`);
  } else {
    console.log('\nAll detected instrumentals are already in "Instrumental Haven"!');
  }
}

scanPlaylists().catch(err => console.error('Scan error:', err.response?.data || err.message));
