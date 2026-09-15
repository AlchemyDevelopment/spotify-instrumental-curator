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
    let url = `/playlists/${playlistId}/items?limit=100`;

    try {
      while (url) {
        const res = await client.get(url);
        if (res.data.items) {
          for (const item of res.data.items) {
            const track = item?.item || item?.track;
            if (track && track.id && !track.is_local) {
              tracks.push(track);
            }
          }
        }
        url = res.data.next ? res.data.next.replace(SPOTIFY_API_BASE, '') : null;
        if (tracks.length >= 1000) break;
      }
      return tracks;
    } catch (err) {
      // Fallback to /tracks for older API versions
      try {
        let fallbackUrl = `/playlists/${playlistId}/tracks?limit=100`;
        while (fallbackUrl) {
          const res = await client.get(fallbackUrl);
          if (res.data.items) {
            for (const item of res.data.items) {
              const track = item?.item || item?.track;
              if (track && track.id && !track.is_local) {
                tracks.push(track);
              }
            }
          }
          fallbackUrl = res.data.next ? res.data.next.replace(SPOTIFY_API_BASE, '') : null;
          if (tracks.length >= 1000) break;
        }
        return tracks;
      } catch (fallbackErr) {
        console.error(`Error reading playlist ${playlistId}:`, err.message);
        return [];
      }
    }
  }

  async getTargetPlaylistTrackUris(accessToken, playlistId) {
    const client = this.createClient(accessToken);
    const uris = new Set();
    let url = `/playlists/${playlistId}/items?limit=100`;

    try {
      while (url) {
        const res = await client.get(url);
        if (res.data.items) {
          for (const item of res.data.items) {
            const track = item?.item || item?.track;
            if (track && track.uri) {
              uris.add(track.uri);
            }
          }
        }
        url = res.data.next ? res.data.next.replace(SPOTIFY_API_BASE, '') : null;
      }
    } catch (err) {
      // Fallback
      try {
        let fallbackUrl = `/playlists/${playlistId}/tracks?limit=100`;
        while (fallbackUrl) {
          const res = await client.get(fallbackUrl);
          if (res.data.items) {
            for (const item of res.data.items) {
              const track = item?.item || item?.track;
              if (track && track.uri) {
                uris.add(track.uri);
              }
            }
          }
          fallbackUrl = res.data.next ? res.data.next.replace(SPOTIFY_API_BASE, '') : null;
        }
      } catch (fallbackErr) {
        console.error('Error getting target playlist track uris:', err.response?.data || err.message);
      }
    }

    return uris;
  }

  async addTracksToPlaylist(accessToken, playlistId, trackUris) {
    if (!trackUris || trackUris.length === 0) return { added: 0 };
    const client = this.createClient(accessToken);
    let addedCount = 0;

    for (let i = 0; i < trackUris.length; i += 100) {
      const batch = trackUris.slice(i, i + 100);
      try {
        await client.post(`/playlists/${playlistId}/items`, {
          uris: batch
        });
      } catch (err) {
        // Fallback to /tracks
        await client.post(`/playlists/${playlistId}/tracks`, {
          uris: batch
        });
      }
      addedCount += batch.length;
    }

    return { added: addedCount };
  }
}
