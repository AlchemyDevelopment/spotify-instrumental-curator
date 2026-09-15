import axios from 'axios';

const INSTRUMENTAL_POSITIVE_KEYWORDS = [
  'instrumental',
  'instrumental version',
  'instrumental mix',
  'karaoke',
  'backing track',
  'without vocals',
  'no vocals',
  'piano version',
  'piano cover',
  'piano arrangement',
  'acoustic guitar version',
  'orchestral version',
  'orchestral cover',
  'orchestral mix',
  'symphonic version',
  'lofi beat',
  'lo-fi beat',
  'ambient version',
  'synthwave instrumental',
  'chillhop',
  'score',
  'original score',
  'soundtrack version',
  'bgm',
  'soundtrack score',
  'theme - instrumental'
];

const INSTRUMENTAL_ARTIST_CUES = [
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
  'brian eno'
];

const lyricsCache = new Map();

export async function checkLrclib(trackName, artistName, albumName, durationMs) {
  const cacheKey = `${trackName.toLowerCase()}_${artistName.toLowerCase()}`;
  if (lyricsCache.has(cacheKey)) {
    return lyricsCache.get(cacheKey);
  }

  try {
    const durationSec = durationMs ? Math.round(durationMs / 1000) : undefined;
    const response = await axios.get('https://lrclib.net/api/get', {
      params: {
        track_name: trackName,
        artist_name: artistName,
        album_name: albumName,
        duration: durationSec
      },
      timeout: 3000
    });

    if (response.data) {
      const isInstrumental = response.data.instrumental === true || 
        (!response.data.plainLyrics && !response.data.syncedLyrics);
      const result = {
        found: true,
        isInstrumental,
        hasLyrics: !!(response.data.plainLyrics || response.data.syncedLyrics),
        raw: response.data
      };
      lyricsCache.set(cacheKey, result);
      return result;
    }
  } catch (err) {
    try {
      const searchRes = await axios.get('https://lrclib.net/api/search', {
        params: {
          q: `${artistName} ${trackName}`
        },
        timeout: 2500
      });

      if (searchRes.data && Array.isArray(searchRes.data) && searchRes.data.length > 0) {
        const topMatch = searchRes.data[0];
        const isInstrumental = topMatch.instrumental === true || 
          (!topMatch.plainLyrics && !topMatch.syncedLyrics);
        const result = {
          found: true,
          isInstrumental,
          hasLyrics: !!(topMatch.plainLyrics || topMatch.syncedLyrics),
          raw: topMatch
        };
        lyricsCache.set(cacheKey, result);
        return result;
      }
    } catch (searchErr) {
      // LRCLIB unavailable or 404
    }
  }

  const defaultNotFound = { found: false, isInstrumental: null, hasLyrics: null };
  lyricsCache.set(cacheKey, defaultNotFound);
  return defaultNotFound;
}

export async function analyzeTrackInstrumental(track, audioFeatures = null, options = {}) {
  const threshold = options.threshold !== undefined ? options.threshold : 0.5;
  const deepCheckLyrics = options.checkLyrics !== false;

  const name = track.name || '';
  const lowerName = name.toLowerCase();
  const artists = (track.artists || []).map(a => a.name).join(', ');
  const lowerArtists = artists.toLowerCase();
  const albumName = track.album?.name || '';
  const lowerAlbum = albumName.toLowerCase();

  let confidence = 0;
  let reasons = [];
  let isInstrumental = false;

  // Signal 1: Spotify Audio Features
  let spotifyScore = null;
  if (audioFeatures && typeof audioFeatures.instrumentalness === 'number') {
    spotifyScore = audioFeatures.instrumentalness;
    if (spotifyScore >= threshold) {
      confidence = Math.max(confidence, Math.round(spotifyScore * 100));
      isInstrumental = true;
      reasons.push(`Spotify Audio Feature: ${Math.round(spotifyScore * 100)}% instrumentalness`);
    } else if (spotifyScore < 0.15) {
      confidence = Math.min(confidence, 15);
      reasons.push(`Spotify Audio Feature: low instrumentalness (${Math.round(spotifyScore * 100)}%)`);
    }
  }

  // Signal 2: Title & Album Keyword Heuristics
  for (const kw of INSTRUMENTAL_POSITIVE_KEYWORDS) {
    if (lowerName.includes(kw) || lowerAlbum.includes(kw)) {
      confidence = Math.max(confidence, 95);
      isInstrumental = true;
      reasons.push(`Title/Album keyword match: "${kw}"`);
      break;
    }
  }

  // Signal 3: Artist Cues
  for (const artistCue of INSTRUMENTAL_ARTIST_CUES) {
    if (lowerArtists.includes(artistCue)) {
      confidence = Math.max(confidence, 85);
      isInstrumental = true;
      reasons.push(`Recognized instrumental artist/composer: "${artistCue}"`);
      break;
    }
  }

  // Signal 4: Lyrics database inspection (LRCLIB)
  if (deepCheckLyrics && (!audioFeatures || isInstrumental || confidence > 30)) {
    try {
      const primaryArtist = track.artists?.[0]?.name || artists;
      const lrclibRes = await checkLrclib(name, primaryArtist, albumName, track.duration_ms);
      
      if (lrclibRes.found) {
        if (lrclibRes.isInstrumental) {
          confidence = Math.max(confidence, 90);
          isInstrumental = true;
          reasons.push('Verified instrumental in lyrics database (No vocal lyrics registered)');
        } else if (lrclibRes.hasLyrics) {
          if (spotifyScore === null || spotifyScore < threshold) {
            isInstrumental = false;
            confidence = Math.min(confidence, 20);
            reasons.push('Vocals detected: Lyrics found in database');
          }
        }
      }
    } catch (e) {
      // Ignore network errors for lyrics check
    }
  }

  if (confidence >= Math.round(threshold * 100)) {
    isInstrumental = true;
  }

  let statusLabel = 'Vocal Track';
  if (confidence >= 80) statusLabel = 'Confirmed Instrumental';
  else if (confidence >= 50) statusLabel = 'Likely Instrumental';
  else if (confidence >= 30) statusLabel = 'Ambiguous / Needs Review';

  return {
    id: track.id,
    uri: track.uri,
    name: track.name,
    artists: (track.artists || []).map(a => a.name).join(', '),
    album: track.album?.name,
    albumArt: track.album?.images?.[0]?.url || track.album?.images?.[1]?.url || '',
    duration_ms: track.duration_ms,
    preview_url: track.preview_url,
    external_url: track.external_urls?.spotify,
    spotifyScore: spotifyScore,
    confidenceScore: confidence,
    isInstrumental,
    statusLabel,
    reasons
  };
}
