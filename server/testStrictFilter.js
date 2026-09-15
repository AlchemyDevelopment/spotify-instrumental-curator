import fs from 'fs';
import { getValidAccessToken } from './getFreshToken.js';

const targetId = '13QpzsnVTLjv7jTmy8j1yd'; // Instrumental Haven

const STRICT_TITLE_KEYWORDS = [
  'instrumental',
  'piano version',
  'piano cover',
  'piano arrangement',
  'piano solo',
  'acoustic guitar version',
  'acoustic guitar cover',
  'guitar cover',
  'guitar version',
  'orchestral version',
  'orchestral cover',
  'orchestral mix',
  'symphonic version',
  'saxophone version',
  'trumpet version',
  'flute version',
  'violin version',
  'cello version',
  'harp version',
  'original score',
  'score from',
  'theme - instrumental',
  'karaoke version',
  'backing track',
  'without vocals',
  'no vocals'
];

const STRICT_SCORE_OR_SOUNDTRACK = [
  'original soundtrack',
  'original game soundtrack',
  'game & jazz',
  'video game variations',
  'skyrim sessions',
  'film score',
  'soundtrack score',
  'original score'
];

const PURE_INSTRUMENTAL_ARTISTS = [
  'hans zimmer',
  'ludovico einaudi',
  'john williams',
  'max richter',
  'yiruma',
  'joe hisaishi',
  'ennio morricone',
  'two steps from hell',
  'chilly gonzales',
  'alexandre desplat',
  'howard shore',
  'marcin',
  'polyphia',
  'plini',
  'chon',
  'animals as leaders',
  'intervals',
  'covet',
  'aphex twin',
  'tycho',
  'kiasmos',
  'brian eno',
  'michael mccann',
  'jack wall',
  'the consouls',
  '8-bit & the single players',
  'saxophone rufus',
  'milo grande',
  'bobby g',
  'feather fall',
  'geek music',
  'michael tai',
  'david karsten',
  'jonathan aldrich',
  'laurence manning',
  'samuel solís',
  'chilled teddy',
  'insaneintherainmusic',
  'braxton burks',
  'potsu'
];

export function isDefinitiveInstrumental(track) {
  const name = (track.name || '').toLowerCase();
  const album = (track.album?.name || '').toLowerCase();
  const artists = (track.artists || []).map(a => (a.name || '').toLowerCase()).join(', ');

  // Disqualifier: Featured vocalists
  if (/\(feat\.|\bft\.|\bvocals?\b|\bacapella\b/i.test(name)) {
    return { isInst: false, reason: 'Has featured vocalist' };
  }

  // 1. Explicit title cue
  for (const kw of STRICT_TITLE_KEYWORDS) {
    if (name.includes(kw)) {
      return { isInst: true, reason: `Title contains "${kw}"` };
    }
  }

  // 2. Pure instrumental artist
  for (const artist of PURE_INSTRUMENTAL_ARTISTS) {
    if (artists.includes(artist)) {
      return { isInst: true, reason: `Instrumental artist: "${artist}"` };
    }
  }

  // 3. Soundtracks / Game themes with no vocal markers
  for (const ost of STRICT_SCORE_OR_SOUNDTRACK) {
    if (album.includes(ost) || name.includes(ost)) {
      return { isInst: true, reason: `Soundtrack/OST: "${ost}"` };
    }
  }

  // 4. Game theme marker: (From "Game Name")
  if (/\(from\s*["'«]?[^)"'»]+["'»]?\)/i.test(name)) {
    return { isInst: true, reason: 'Game theme marker' };
  }

  return { isInst: false, reason: 'Unverified / No definitive instrumental marker' };
}

async function run() {
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

  console.log(`Total songs in "Instrumental Haven": ${allTracks.length}`);

  const keepList = [];
  const removeList = [];

  for (const t of allTracks) {
    const res = isDefinitiveInstrumental(t);
    if (res.isInst) {
      keepList.push({ track: t, reason: res.reason });
    } else {
      removeList.push({ track: t, reason: res.reason });
    }
  }

  console.log(`\n--- Strict Filter Results ---`);
  console.log(`✅ Definitive Pure Instrumentals to KEEP: ${keepList.length}`);
  console.log(`❌ Songs to REMOVE (vocals or unverified): ${removeList.length}\n`);

  console.log('Sample of songs to KEEP:');
  keepList.slice(0, 10).forEach((k, i) => console.log(`  ${i + 1}. "${k.track.name}" by ${k.track.artists[0]?.name} [${k.reason}]`));

  console.log('\nSample of songs that had vocals / will be REMOVED:');
  removeList.slice(0, 10).forEach((r, i) => console.log(`  ${i + 1}. "${r.track.name}" by ${r.track.artists[0]?.name}`));
}

run().catch(err => console.error(err));
