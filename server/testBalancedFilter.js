import fs from 'fs';
import { getValidAccessToken } from './getFreshToken.js';
import { checkLrclib } from './instrumentalDetector.js';

export async function isBalancedInstrumental(track, playlists = []) {
  const name = (track.name || '').toLowerCase();
  const album = (track.album?.name || '').toLowerCase();
  const artists = (track.artists || []).map(a => (a.name || '').toLowerCase()).join(', ');
  const playlistStr = playlists.join(' ').toLowerCase();

  // 0. EXPLICITLY DESIGNATED 100% INSTRUMENTAL PLAYLISTS (User Rule)
  if (/pok[eé]mon\s*jazz|developer\s*focus|coding\s*-\s*epic\s*instrumentals|the\s*fall\s*of\s*26|jazz\s*vibes|clench\s*my\s*fists|chosic|answer\s*me/i.test(playlistStr)) {
    return { isInst: true, reason: 'From designated 100% instrumental playlist' };
  }

  // 1. HARD DISQUALIFIERS
  if (track.explicit && !name.includes('instrumental')) {
    return { isInst: false, reason: 'Explicit content tag (Rap/Rock vocal indicator)' };
  }

  if (/\(feat\.|\bft\.|\bvocals?\b|\bacapella\b/i.test(name)) {
    return { isInst: false, reason: 'Featured vocalist tag' };
  }

  // Vocal rock/metal/rap/country/pop playlist context
  if (/metal|beartooth|bad omens|shinedown|rap|rock|golf|fat kid|lion the witch|dances|ceremony|karaoke|80s/i.test(playlistStr) && !name.includes('instrumental')) {
    return { isInst: false, reason: 'From vocal rock/metal/rap/pop playlist' };
  }

  // 2. EXPLICIT INSTRUMENTAL DECLARATIONS
  if (/instrumental|piano version|piano cover|saxophone version|trumpet version|guitar cover|guitar version|orchestral version|without vocals|no vocals|minus one/i.test(name)) {
    return { isInst: true, reason: 'Title explicitly declares instrumental' };
  }

  // 3. SOUNDTRACKS / ORIGINAL GAME SCORES
  if (/original soundtrack|original game soundtrack|game & jazz|video game|skyrim sessions|film score/i.test(album) ||
      /\(from\s*["'«]?[^)"'»]+["'»]?\)/i.test(name)) {
    return { isInst: true, reason: 'Soundtrack / Game score theme' };
  }

  // 4. KNOWN PURE INSTRUMENTAL / LO-FI / BEATMAKERS
  const knownArtists = [
    'hans zimmer', 'ludovico einaudi', 'polyphia', 'the consouls', 'insaneintherainmusic',
    '8-bit & the single players', 'saxophone rufus', 'milo grande', 'bobby g', 'potsu',
    'flawed mangoes', 'daniel.mp3', 'nato kitch', 'silo', 'txmy', 'braxton burks',
    'feather fall', 'geek music', 'michael tai', 'david karsten', 'jonathan aldrich',
    'laurence manning', 'samuel solís', 'chilled teddy', 'ludwig göransson', 'jesper kyd',
    'daniel pemberton', 'aphex twin', 'tycho', 'kiasmos', 'brian eno', 'plini', 'chon',
    'animals as leaders', 'intervals', 'covet', 'yiruma', 'joe hisaishi', 'tony mottola',
    'si zentner', 'dick hyman', 'lester lanin', 'hugo winterhalter', 'eddie heywood',
    'artie shaw', 'pete fountain', 'henry mancini', 'glenn miller'
  ];
  for (const a of knownArtists) {
    if (artists.includes(a)) {
      return { isInst: true, reason: `Instrumental/Jazz/Lo-Fi artist: ${a}` };
    }
  }

  // 5. LO-FI / AMBIENT / CHILL PLAYLIST SONGS
  const isFromChillLoFiPlaylist = /coding|focus|lo-fi|lofi|ambient|resonance|stormy|tavern|chill gaming/i.test(playlistStr);

  if (isFromChillLoFiPlaylist) {
    // Check if lyrics exist
    try {
      const primaryArtist = track.artists?.[0]?.name || artists;
      const lrclibRes = await checkLrclib(track.name, primaryArtist, track.album?.name, track.duration_ms);
      if (lrclibRes.hasLyrics) {
        return { isInst: false, reason: 'Vocals found in lyrics database' };
      }
      return { isInst: true, reason: 'From Chill/Lo-Fi/Ambient playlist (No vocal lyrics)' };
    } catch (e) {
      return { isInst: true, reason: 'From verified Chill/Lo-Fi/Ambient playlist' };
    }
  }

  return { isInst: false, reason: 'Unverified / Likely vocal track' };
}

async function run() {
  const { accessToken, spotify } = await getValidAccessToken();
  const client = spotify.createClient(accessToken);
  const me = await client.get('/me');

  console.log('Gathering tracks across user playlists...');
  const playlists = await spotify.getUserPlaylists(accessToken, 50);
  const targetId = '13QpzsnVTLjv7jTmy8j1yd';
  const myPlaylists = playlists.filter(p => p.id !== targetId && p.owner.id === me.data.id);

  const trackMap = new Map();

  for (const pl of myPlaylists) {
    try {
      const tracks = await spotify.getPlaylistTracks(accessToken, pl.id);
      for (const t of tracks) {
        if (t && t.id) {
          if (!trackMap.has(t.id)) {
            trackMap.set(t.id, { track: t, playlists: [pl.name] });
          } else {
            trackMap.get(t.id).playlists.push(pl.name);
          }
        }
      }
    } catch (e) {}
  }

  console.log(`Total unique tracks to evaluate: ${trackMap.size}`);
  console.log('Running BALANCED Filter (Excluding Rock/Rap, Keeping True Lo-Fi, Soundtracks, Jazz, Ambient, Instrumentals)...');

  const keep = [];
  const rockRapRemoved = [];
  const entries = Array.from(trackMap.values());
  const chunkSize = 30;

  for (let i = 0; i < entries.length; i += chunkSize) {
    const chunk = entries.slice(i, i + chunkSize);
    const results = await Promise.all(chunk.map(item => isBalancedInstrumental(item.track, item.playlists)));
    for (let j = 0; j < chunk.length; j++) {
      const item = chunk[j];
      const res = results[j];
      if (res.isInst) {
        keep.push({ track: item.track, reason: res.reason, playlists: item.playlists });
      } else {
        rockRapRemoved.push({ track: item.track, reason: res.reason });
      }
    }
    process.stdout.write(`Processed ${Math.min(i + chunkSize, entries.length)} / ${entries.length}...\r`);
  }

  console.log(`\n\n--- Balanced Filter Results ---`);
  console.log(`✅ Genuine Instrumentals Discovered: ${keep.length}`);
  console.log(`❌ Vocal / Rock / Rap Excluded: ${rockRapRemoved.length}\n`);

  console.log('Sample of GENUINE INSTRUMENTALS to be included:');
  keep.slice(0, 20).forEach((k, i) => {
    console.log(`  ${i + 1}. "${k.track.name}" by ${k.track.artists[0]?.name} [${k.reason}]`);
  });

  console.log('\nSample of ROCK / RAP / VOCAL songs filtered out:');
  rockRapRemoved.slice(0, 15).forEach((r, i) => {
    console.log(`  ${i + 1}. "${r.track.name}" by ${r.track.artists[0]?.name} [${r.reason}]`);
  });

  // Save keep list into server/balancedTracks.json
  fs.writeFileSync('./server/balancedTracks.json', JSON.stringify(keep, null, 2), 'utf-8');
  console.log('\nSaved balanced track list to server/balancedTracks.json');
}

if (process.argv[1]?.endsWith('testBalancedFilter.js')) {
  run().catch(err => console.error(err));
}
