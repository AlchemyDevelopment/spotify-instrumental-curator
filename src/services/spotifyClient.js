import axios from 'axios';

const SPOTIFY_ACCOUNTS_URL = 'https://accounts.spotify.com';
const SPOTIFY_API_BASE = 'https://api.spotify.com/v1';

// PKCE Helper Functions
function generateRandomString(length) {
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  const values = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(values).map(x => possible[x % possible.length]).join('');
}

async function sha256(plain) {
  const encoder = new TextEncoder();
  const data = encoder.encode(plain);
  return crypto.subtle.digest('SHA-256', data);
}

function base64encode(input) {
  return btoa(String.fromCharCode(...new Uint8Array(input)))
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

export class SpotifyClient {
  constructor(clientId, redirectUri) {
    this.clientId = clientId || 'eab865abfba448d5b3c51fb3b9a878d4';
    this.redirectUri = redirectUri || `${window.location.origin}${window.location.pathname}`;
  }

  async redirectToAuthorize() {
    const codeVerifier = generateRandomString(64);
    const hashed = await sha256(codeVerifier);
    const codeChallenge = base64encode(hashed);

    window.sessionStorage.setItem('spotify_code_verifier', codeVerifier);

    const scopes = [
      'user-read-private',
      'user-read-email',
      'playlist-read-private',
      'playlist-read-collaborative',
      'playlist-modify-public',
      'playlist-modify-private',
      'user-read-recently-played',
      'user-top-read',
      'user-library-read'
    ].join(' ');

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.clientId,
      scope: scopes,
      code_challenge_method: 'S256',
      code_challenge: codeChallenge,
      redirect_uri: this.redirectUri
    });

    window.location.href = `${SPOTIFY_ACCOUNTS_URL}/authorize?${params.toString()}`;
  }

  async exchangeCode(code) {
    const codeVerifier = window.sessionStorage.getItem('spotify_code_verifier');
    if (!codeVerifier) {
      throw new Error('Code verifier not found in session storage.');
    }

    const params = new URLSearchParams({
      client_id: this.clientId,
      grant_type: 'authorization_code',
      code: code,
      redirect_uri: this.redirectUri,
      code_verifier: codeVerifier
    });

    const res = await axios.post(`${SPOTIFY_ACCOUNTS_URL}/api/token`, params.toString(), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    window.sessionStorage.removeItem('spotify_code_verifier');
    return res.data;
  }

  async refreshToken(refreshToken) {
    const params = new URLSearchParams({
      client_id: this.clientId,
      grant_type: 'refresh_token',
      refresh_token: refreshToken
    });

    const res = await axios.post(`${SPOTIFY_ACCOUNTS_URL}/api/token`, params.toString(), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    return res.data;
  }

  createApiClient(token) {
    return axios.create({
      baseURL: SPOTIFY_API_BASE,
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
  }

  async getCurrentUser(token) {
    const client = this.createApiClient(token);
    const res = await client.get('/me');
    return res.data;
  }

  async getUserPlaylists(token, limit = 50) {
    const client = this.createApiClient(token);
    let playlists = [];
    let url = `/me/playlists?limit=${limit}`;

    while (url) {
      const res = await client.get(url);
      if (res.data.items) {
        playlists.push(...res.data.items);
      }
      url = res.data.next ? res.data.next.replace(SPOTIFY_API_BASE, '') : null;
      if (playlists.length >= 200) break;
    }

    return playlists;
  }

  async getPlaylistTracks(token, playlistId) {
    const client = this.createApiClient(token);
    let tracks = [];
    let url = `/playlists/${playlistId}/tracks?limit=100`;

    while (url) {
      const res = await client.get(url);
      if (res.data.items) {
        for (const item of res.data.items) {
          if (item && item.track && item.track.id && !item.track.is_local) {
            tracks.push(item.track);
          }
        }
      }
      url = res.data.next ? res.data.next.replace(SPOTIFY_API_BASE, '') : null;
      if (tracks.length >= 1000) break;
    }

    return tracks;
  }

  async getRecentlyPlayedTracks(token, limit = 50) {
    const client = this.createApiClient(token);
    try {
      const res = await client.get(`/me/player/recently-played?limit=${limit}`);
      const tracks = [];
      const seen = new Set();
      if (res.data.items) {
        for (const item of res.data.items) {
          if (item && item.track && item.track.id && !seen.has(item.track.id)) {
            seen.add(item.track.id);
            tracks.push(item.track);
          }
        }
      }
      return tracks;
    } catch (err) {
      console.warn('Recently played tracks not available:', err.message);
      return [];
    }
  }

  async getTopTracks(token, limit = 50) {
    const client = this.createApiClient(token);
    try {
      const res = await client.get(`/me/top/tracks?time_range=short_term&limit=${limit}`);
      return (res.data.items || []).filter(t => t && t.id && !t.is_local);
    } catch (err) {
      console.warn('Top tracks not available:', err.message);
      return [];
    }
  }

  async getSavedTracks(token, limit = 50) {
    const client = this.createApiClient(token);
    try {
      const res = await client.get(`/me/tracks?limit=${limit}`);
      return (res.data.items || []).map(i => i.track).filter(t => t && t.id && !t.is_local);
    } catch (err) {
      console.warn('Saved tracks not available:', err.message);
      return [];
    }
  }

  async getAudioFeaturesBatch(token, trackIds) {
    if (!trackIds || trackIds.length === 0) return {};
    const client = this.createApiClient(token);
    const resultMap = {};

    for (let i = 0; i < trackIds.length; i += 100) {
      const batch = trackIds.slice(i, i + 100);
      try {
        const res = await client.get(`/audio-features?ids=${batch.join(',')}`);
        if (res.data && res.data.audio_features) {
          for (const feat of res.data.audio_features) {
            if (feat && feat.id) {
              resultMap[feat.id] = feat;
            }
          }
        }
      } catch (err) {
        console.warn('Spotify Audio Features skipped:', err.message);
        break;
      }
    }

    return resultMap;
  }

  async getTargetPlaylistTrackUris(token, playlistId) {
    const client = this.createApiClient(token);
    const uris = new Set();
    let url = `/playlists/${playlistId}/tracks?limit=100&fields=items(track(uri)),next`;

    try {
      while (url) {
        const res = await client.get(url);
        if (res.data.items) {
          for (const item of res.data.items) {
            if (item && item.track && item.track.uri) {
              uris.add(item.track.uri);
            }
          }
        }
        url = res.data.next ? res.data.next.replace(SPOTIFY_API_BASE, '') : null;
      }
    } catch (err) {
      console.warn('Error reading target playlist tracks:', err.message);
    }

    return uris;
  }

  async createPlaylist(token, userId, name, description = 'Curated Instrumental Collection') {
    const client = this.createApiClient(token);
    try {
      const res = await client.post('/me/playlists', {
        name,
        description,
        public: false
      });
      return res.data;
    } catch (err) {
      if (userId) {
        const fallbackRes = await client.post(`/users/${userId}/playlists`, {
          name,
          description,
          public: false
        });
        return fallbackRes.data;
      }
      throw err;
    }
  }

  async addTracksToPlaylist(token, playlistId, trackUris) {
    if (!trackUris || trackUris.length === 0) return { added: 0 };
    const client = this.createApiClient(token);
    let addedCount = 0;

    for (let i = 0; i < trackUris.length; i += 100) {
      const batch = trackUris.slice(i, i + 100);
      await client.post(`/playlists/${playlistId}/tracks`, {
        uris: batch
      });
      addedCount += batch.length;
    }

    return { added: addedCount };
  }
}
