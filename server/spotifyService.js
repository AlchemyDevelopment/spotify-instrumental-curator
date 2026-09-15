import axios from 'axios';

const SPOTIFY_ACCOUNTS_URL = 'https://accounts.spotify.com';
const SPOTIFY_API_BASE = 'https://api.spotify.com/v1';

export class SpotifyService {
  constructor(clientId, clientSecret, redirectUri) {
    this.clientId = clientId;
    this.clientSecret = clientSecret;
    this.redirectUri = redirectUri;
  }

  getAuthorizationUrl(state = '') {
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
      redirect_uri: this.redirectUri,
      state: state,
      show_dialog: 'true'
    });

    return `${SPOTIFY_ACCOUNTS_URL}/authorize?${params.toString()}`;
  }

  async exchangeCode(code) {
    const authHeader = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');
    const params = new URLSearchParams({
      grant_type: 'authorization_code',
      code: code,
      redirect_uri: this.redirectUri
    });

    const response = await axios.post(`${SPOTIFY_ACCOUNTS_URL}/api/token`, params.toString(), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${authHeader}`
      }
    });

    return response.data;
  }

  async refreshToken(refreshToken) {
    const authHeader = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');
    const params = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken
    });

    const response = await axios.post(`${SPOTIFY_ACCOUNTS_URL}/api/token`, params.toString(), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${authHeader}`
      }
    });

    return response.data;
  }

  createClient(accessToken) {
    const client = axios.create({
      baseURL: SPOTIFY_API_BASE,
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    // Handle token expiry interceptor if necessary
    return client;
  }

  async getCurrentUser(accessToken) {
    const client = this.createClient(accessToken);
    const res = await client.get('/me');
    return res.data;
  }

  async getUserPlaylists(accessToken, limit = 50) {
    const client = this.createClient(accessToken);
    let playlists = [];
    let url = `/me/playlists?limit=${limit}`;

    while (url) {
      const res = await client.get(url);
      if (res.data.items) {
        playlists.push(...res.data.items);
      }
      url = res.data.next ? res.data.next.replace(SPOTIFY_API_BASE, '') : null;
      if (playlists.length >= 200) break; // Reasonable ceiling
    }

    return playlists;
  }

  async getPlaylistTracks(accessToken, playlistId) {
    const client = this.createClient(accessToken);
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

  async getRecentlyPlayedTracks(accessToken, limit = 50) {
    const client = this.createClient(accessToken);
    try {
      const res = await client.get(`/me/player/recently-played?limit=${limit}`);
      const tracks = [];
      const seen = new Set();
      if (res.data.items) {
        for (const item of res.data.items) {
          if (item && item.track && item.track.id && !seen.has(item.track.id)) {
            seen.add(item.track.id);
            tracks.push({
              ...item.track,
              played_at: item.played_at
            });
          }
        }
      }
      return tracks;
    } catch (err) {
      console.error('Error fetching recently played tracks:', err.response?.data || err.message);
      return [];
    }
  }

  async getTopTracks(accessToken, timeRange = 'short_term', limit = 50) {
    const client = this.createClient(accessToken);
    try {
      const res = await client.get(`/me/top/tracks?time_range=${timeRange}&limit=${limit}`);
      return (res.data.items || []).filter(t => t && t.id && !t.is_local);
    } catch (err) {
      console.error('Error fetching top tracks:', err.response?.data || err.message);
      return [];
    }
  }

  async getSavedTracks(accessToken, limit = 50) {
    const client = this.createClient(accessToken);
    try {
      const res = await client.get(`/me/tracks?limit=${limit}`);
      return (res.data.items || []).map(i => i.track).filter(t => t && t.id && !t.is_local);
    } catch (err) {
      console.error('Error fetching saved tracks:', err.response?.data || err.message);
      return [];
    }
  }

  async getAudioFeaturesBatch(accessToken, trackIds) {
    if (!trackIds || trackIds.length === 0) return {};
    const client = this.createClient(accessToken);
    const resultMap = {};

    // Spotify allows up to 100 track IDs per audio-features call
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
        // Audio features might be restricted by Spotify API for recent developer apps
        console.warn('Spotify Audio Features API response:', err.response?.status, err.response?.statusText || err.message);
        break;
      }
    }

    return resultMap;
  }

  async createPlaylist(accessToken, userId, name, description = 'Curated Instrumental Collection') {
    const client = this.createClient(accessToken);
    try {
      const res = await client.post('/me/playlists', {
        name: name,
        description: description,
        public: false
      });
      return res.data;
    } catch (err) {
      if (userId) {
        const fallbackRes = await client.post(`/users/${userId}/playlists`, {
          name: name,
          description: description,
          public: false
        });
        return fallbackRes.data;
      }
      throw err;
    }
  }

  async getTargetPlaylistTrackUris(accessToken, playlistId) {
    const client = this.createClient(accessToken);
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
      console.error('Error getting target playlist track uris:', err.response?.data || err.message);
    }

    return uris;
  }

  async addTracksToPlaylist(accessToken, playlistId, trackUris) {
    if (!trackUris || trackUris.length === 0) return { added: 0 };
    const client = this.createClient(accessToken);
    let addedCount = 0;

    // Spotify adds in batches of 100
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
