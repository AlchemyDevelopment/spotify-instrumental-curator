import axios from 'axios';

/**
 * Positive keywords in track name, album name, or genre tags
 */
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
  'potsu',
  'ludwig göransson',
  'jesper kyd',
  'daniel pemberton'
];

const lyricsCache = new Map();

export async function checkLrclib(trackName, artistName, albumName, durationMs) {
  const cacheKey = `${trackName.toLowerCase()}_${artistName.toLowerCase()}`;
  if (lyricsCache.has(cacheKey)) {
    return lyricsCache.get(cacheKey);
  }

  const cleanTrackName = trackName
    .replace(/\s*-\s*\d{4}\s*digital\s*remaster/gi, '')
    .replace(/\s*\(feat\..*?\)/gi, '')
    .trim();

  try {
    const durationSec = durationMs ? Math.round(durationMs / 1000) : undefined;
    const response = await axios.get('https://lrclib.net/api/get', {
      params: {
        track_name: cleanTrackName,
        artist_name: artistName,
        album_name: albumName,
        duration: durationSec
      },
      timeout: 2500
    });

    if (response.data) {
      const isInst = response.data.instrumental === true ||
        (!response.data.plainLyrics && !response.data.syncedLyrics);
      const hasActualLyrics = !!(response.data.plainLyrics && response.data.plainLyrics.trim().length > 20);

      const result = {
        found: true,
        isInstrumental: isInst,
        hasLyrics: hasActualLyrics,
        lyricsText: response.data.plainLyrics || ''
      };
      lyricsCache.set(cacheKey, result);
      return result;
    }
  } catch (err) {
    try {
      const searchRes = await axios.get('https://lrclib.net/api/search', {
        params: {
          q: `${artistName} ${cleanTrackName}`
        },
        timeout: 2000
      });

      if (searchRes.data && Array.isArray(searchRes.data) && searchRes.data.length > 0) {
        const topMatch = searchRes.data[0];
        const isInst = topMatch.instrumental === true ||
          (!topMatch.plainLyrics && !topMatch.syncedLyrics);
        const hasActualLyrics = !!(topMatch.plainLyrics && topMatch.plainLyrics.trim().length > 20);

        const result = {
          found: true,
          isInstrumental: isInst,
          hasLyrics: hasActualLyrics,
          lyricsText: topMatch.plainLyrics || ''
        };
        lyricsCache.set(cacheKey, result);
        return result;
      }
    } catch (searchErr) {}
  }

  const notFound = {
    found: false,
    isInstrumental: false,
    hasLyrics: false,
    noLyricsFoundInDatabase: true
  };
  lyricsCache.set(cacheKey, notFound);
  return notFound;
}

export async function analyzeTrackInstrumental(track, audioFeatures = null, options = {}) {
  const threshold = options.threshold !== undefined ? options.threshold : 0.5;
  const name = (track.name || '').toLowerCase();
  const album = (track.album?.name || '').toLowerCase();
  const artists = (track.artists || []).map(a => (a.name || '').toLowerCase()).join(', ');

  // Immediate disqualification: vocal features
  if (/\(feat\.|\bft\.|\bvocals?\b|\bacapella\b/i.test(name)) {
    return {
      id: track.id,
      uri: track.uri,
      name: track.name,
      artists: (track.artists || []).map(a => a.name).join(', '),
      album: track.album?.name,
      albumArt: track.album?.images?.[0]?.url || '',
      duration_ms: track.duration_ms,
      preview_url: track.preview_url,
      external_url: track.external_urls?.spotify,
      confidenceScore: 0,
      isInstrumental: false,
      statusLabel: 'Vocal Track',
      reasons: ['Contains featured vocalist / vocal marker']
    };
  }

  let confidence = 0;
  let reasons = [];
  let isInstrumental = false;

  // Signal 1: Title keyword match
  for (const kw of STRICT_TITLE_KEYWORDS) {
    if (name.includes(kw)) {
      confidence = 95;
      isInstrumental = true;
      reasons.push(`Title explicitly contains "${kw}"`);
      break;
    }
  }

  // Signal 2: Instrumental artist
  if (!isInstrumental) {
    for (const artist of PURE_INSTRUMENTAL_ARTISTS) {
      if (artists.includes(artist)) {
        confidence = 90;
        isInstrumental = true;
        reasons.push(`Pure instrumental artist/composer: "${artist}"`);
        break;
      }
    }
  }

  // Signal 3: Soundtrack / OST album
  if (!isInstrumental) {
    for (const ost of STRICT_SCORE_OR_SOUNDTRACK) {
      if (album.includes(ost) || name.includes(ost)) {
        confidence = 90;
        isInstrumental = true;
        reasons.push(`Soundtrack/Score marker: "${ost}"`);
        break;
      }
    }
  }

  // Signal 4: Game theme in title
  if (!isInstrumental && /\(from\s*["'«]?[^)"'»]+["'»]?\)/i.test(name)) {
    confidence = 88;
    isInstrumental = true;
    reasons.push('Game theme in title');
  }

  // Signal 5: Lyrics registry check (MUST have instrumental: true or explicit confirmation)
  if (options.checkLyrics !== false) {
    try {
      const primaryArtist = track.artists?.[0]?.name || artists;
      const lrclibRes = await checkLrclib(track.name, primaryArtist, track.album?.name, track.duration_ms);

      if (lrclibRes.hasLyrics) {
        // Definite vocals!
        confidence = 0;
        isInstrumental = false;
        reasons = ['Vocal lyrics found in registry'];
      } else if (lrclibRes.found && lrclibRes.isInstrumental) {
        confidence = Math.max(confidence, 95);
        isInstrumental = true;
        reasons.push('Verified instrumental in lyrics registry (instrumental: true)');
      }
    } catch (e) {}
  }

  // Check against threshold
  if (confidence >= Math.round(threshold * 100)) {
    isInstrumental = true;
  } else {
    isInstrumental = false;
  }

  let statusLabel = isInstrumental ? 'Confirmed Instrumental' : 'Vocal / Non-Instrumental';

  return {
    id: track.id,
    uri: track.uri,
    name: track.name,
    artists: (track.artists || []).map(a => a.name).join(', '),
    album: track.album?.name,
    albumArt: track.album?.images?.[0]?.url || '',
    duration_ms: track.duration_ms,
    preview_url: track.preview_url,
    external_url: track.external_urls?.spotify,
    confidenceScore: confidence,
    isInstrumental,
    statusLabel,
    reasons
  };
}
