import axios from 'axios';

/**
 * Positive keywords in track name, album name, or genre tags
 */
const INSTRUMENTAL_TITLE_KEYWORDS = [
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
  'theme - instrumental',
  'saxophone version',
  'trumpet version',
  'guitar version',
  'flute version',
  'violin version',
  'cello version',
  'harp version',
  'reprise',
  'slowed',
  'sped up',
  'dark fantasy',
  'overture',
  'concerto',
  'sonata',
  'nocturne',
  'prelude',
  'waltz',
  'etude',
  'symphony',
  'intermezzo',
  'rhapsody',
  'lofi',
  'lo-fi'
];

const SOUNDTRACK_OR_OST_KEYWORDS = [
  'soundtrack',
  'original soundtrack',
  'ost',
  'original game soundtrack',
  'game & jazz',
  'video game',
  'game theme',
  'music from',
  'motion picture soundtrack',
  'score from',
  'anime soundtrack',
  'film score',
  'sessions',
  'ambient',
  'chill beats',
  'relaxing piano',
  'smooth sax',
  'soft rock sax',
  'saxophone chill',
  'piano works',
  'instrumental works',
  'lofi remix',
  'guitar cover',
  'sax cover',
  'piano cover'
];

/**
 * Common instrumental artists, arrangers, composers, or OST producers
 */
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
  'dominant',
  'daniel.mp3',
  'cormill',
  'nato kitch',
  'piero umiliani'
];

const lyricsCache = new Map();

/**
 * Check LRCLIB public lyrics registry
 */
export async function checkLrclib(trackName, artistName, albumName, durationMs) {
  const cacheKey = `${trackName.toLowerCase()}_${artistName.toLowerCase()}`;
  if (lyricsCache.has(cacheKey)) {
    return lyricsCache.get(cacheKey);
  }

  // Clean track name (remove feat., parenthetical remasters, etc.)
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
      const hasActualLyrics = !!(response.data.plainLyrics && response.data.plainLyrics.trim().length > 30);

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
    // Exact match failed, try fast search
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
        const hasActualLyrics = !!(topMatch.plainLyrics && topMatch.plainLyrics.trim().length > 30);

        const result = {
          found: true,
          isInstrumental: isInst,
          hasLyrics: hasActualLyrics,
          lyricsText: topMatch.plainLyrics || ''
        };
        lyricsCache.set(cacheKey, result);
        return result;
      }
    } catch (searchErr) {
      // Not found in lyrics database
    }
  }

  // NOT FOUND: 404 in lyrics DB indicates no vocal lyrics registered
  const notFound = {
    found: false,
    isInstrumental: null,
    hasLyrics: false,
    noLyricsFoundInDatabase: true
  };
  lyricsCache.set(cacheKey, notFound);
  return notFound;
}

/**
 * Multi-Signal Instrumental Analyzer
 */
export async function analyzeTrackInstrumental(track, audioFeatures = null, options = {}) {
  const threshold = options.threshold !== undefined ? options.threshold : 0.5;
  const trustSourcePlaylist = options.trustSourcePlaylist === true;
  const source = options.source || '';

  // If user enabled "Trust Source Playlist" and track came from a source playlist, instant 100%
  if (trustSourcePlaylist && source === 'Playlist') {
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
      spotifyScore: null,
      confidenceScore: 100,
      isInstrumental: true,
      statusLabel: 'Source Playlist Track',
      reasons: ['From your selected instrumental playlist']
    };
  }

  const name = track.name || '';
  const lowerName = name.toLowerCase();
  const artists = (track.artists || []).map(a => a.name).join(', ');
  const lowerArtists = artists.toLowerCase();
  const albumName = track.album?.name || '';
  const lowerAlbum = albumName.toLowerCase();

  let confidence = 0;
  let reasons = [];
  let isInstrumental = false;

  // Signal 1: Spotify Audio Features (if available)
  let spotifyScore = null;
  if (audioFeatures && typeof audioFeatures.instrumentalness === 'number') {
    spotifyScore = audioFeatures.instrumentalness;
    if (spotifyScore >= threshold) {
      confidence = Math.max(confidence, Math.round(spotifyScore * 100));
      isInstrumental = true;
      reasons.push(`Spotify Audio Feature: ${Math.round(spotifyScore * 100)}%`);
    } else if (spotifyScore < 0.15) {
      confidence = Math.min(confidence, 15);
      reasons.push(`Spotify Audio Feature: low instrumentalness (${Math.round(spotifyScore * 100)}%)`);
    }
  }

  // Signal 2: Title keyword match (Saxophone Version, Piano Cover, Instrumental, etc.)
  for (const kw of INSTRUMENTAL_TITLE_KEYWORDS) {
    if (lowerName.includes(kw)) {
      confidence = Math.max(confidence, 95);
      isInstrumental = true;
      reasons.push(`Title cue: "${kw}"`);
      break;
    }
  }

  // Signal 3: Album is Soundtrack, OST, Score, or Instrumental Session
  for (const ostKw of SOUNDTRACK_OR_OST_KEYWORDS) {
    if (lowerAlbum.includes(ostKw) || lowerName.includes(ostKw)) {
      confidence = Math.max(confidence, 90);
      isInstrumental = true;
      reasons.push(`Soundtrack/OST album cue: "${ostKw}"`);
      break;
    }
  }

  // Signal 4: Known Instrumental Artist / Arranger / Composer
  for (const artistCue of INSTRUMENTAL_ARTIST_CUES) {
    if (lowerArtists.includes(artistCue)) {
      confidence = Math.max(confidence, 90);
      isInstrumental = true;
      reasons.push(`Instrumental artist/composer: "${artistCue}"`);
      break;
    }
  }

  // Signal 5: Gaming & Theme Cues in title: (From "Zelda...", "Metroid...", "Pokemon...", etc.)
  const gameMatch = lowerName.match(/\((?:from|theme from)\s*["'«]?([^)"'»]+)["'»]?\)/i);
  if (gameMatch) {
    confidence = Math.max(confidence, 88);
    isInstrumental = true;
    reasons.push(`Game / Movie theme marker: "${gameMatch[0]}"`);
  }

  // Signal 6: Lyrics Registry Check (LRCLIB)
  if (options.checkLyrics !== false) {
    try {
      const primaryArtist = track.artists?.[0]?.name || artists;
      const lrclibRes = await checkLrclib(name, primaryArtist, albumName, track.duration_ms);

      if (lrclibRes.found) {
        if (lrclibRes.isInstrumental) {
          confidence = Math.max(confidence, 95);
          isInstrumental = true;
          reasons.push('Verified instrumental in lyrics registry (0 vocals)');
        } else if (lrclibRes.hasLyrics) {
          // If actual lyrics were found and confidence wasn't already 95+ from title
          if (confidence < 90) {
            isInstrumental = false;
            confidence = Math.min(confidence, 15);
            reasons.push('Vocals detected: Song lyrics found in database');
          }
        }
      } else if (lrclibRes.noLyricsFoundInDatabase) {
        // No lyrics exist in registry!
        // If there's already ANY cue (soundtrack, game, lo-fi, artist, or instrumental), boost to 92%
        if (isInstrumental || confidence >= 50) {
          confidence = Math.max(confidence, 92);
          reasons.push('No lyrics in database (Consistent with instrumental track)');
        } else {
          // Ambient / unlisted track with 0 lyrics registered
          confidence = Math.max(confidence, 65);
          isInstrumental = true;
          reasons.push('No vocal lyrics found in database');
        }
      }
    } catch (e) {
      // Network lookup error, keep existing cues
    }
  }

  // Final check against threshold
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
