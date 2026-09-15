import fs from 'fs';
import { SpotifyService } from './spotifyService.js';

export async function getValidAccessToken() {
  const config = JSON.parse(fs.readFileSync('./server/config.json', 'utf-8'));
  let tokens = JSON.parse(fs.readFileSync('./server/tokens.json', 'utf-8'));
  const spotify = new SpotifyService(config.clientId, config.clientSecret, config.redirectUri);

  try {
    const client = spotify.createClient(tokens.access_token);
    await client.get('/me');
    return { accessToken: tokens.access_token, spotify };
  } catch (err) {
    if (err.response?.status === 401 && tokens.refresh_token) {
      console.log('Access token expired, refreshing...');
      tokens = await spotify.refreshToken(tokens.refresh_token);
      fs.writeFileSync('./server/tokens.json', JSON.stringify(tokens, null, 2), 'utf-8');
      return { accessToken: tokens.access_token, spotify };
    }
    throw err;
  }
}
