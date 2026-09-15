import http from 'http';
import url from 'url';
import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { SpotifyService } from './spotifyService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TOKENS_FILE = path.join(__dirname, 'tokens.json');
const CONFIG_FILE = path.join(__dirname, 'config.json');

const config = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
const redirectUri = 'http://127.0.0.1:5173/callback';
const spotify = new SpotifyService(config.clientId, config.clientSecret, redirectUri);

const server = http.createServer(async (req, res) => {
  const reqUrl = url.parse(req.url, true);
  if (reqUrl.pathname === '/callback') {
    const code = reqUrl.query.code;
    const error = reqUrl.query.error;

    if (error) {
      res.writeHead(400, { 'Content-Type': 'text/html' });
      res.end(`<h2>Authorization Error: ${error}</h2>`);
      server.close();
      return;
    }

    if (code) {
      try {
        console.log('\nReceived OAuth code, exchanging for tokens...');
        const tokenData = await spotify.exchangeCode(code);
        fs.writeFileSync(TOKENS_FILE, JSON.stringify(tokenData, null, 2), 'utf-8');
        console.log('✅ Success! Access token & refresh token saved to server/tokens.json');

        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(`
          <div style="font-family:sans-serif; text-align:center; padding:50px; background:#0B0E14; color:#fff; min-height:100vh;">
            <h1 style="color:#1DB954;">Authorization Successful!</h1>
            <p>You can close this tab and return to your terminal / IDE.</p>
          </div>
        `);
      } catch (err) {
        console.error('Token exchange error:', err.response?.data || err.message);
        res.writeHead(500, { 'Content-Type': 'text/html' });
        res.end(`<h2>Failed to exchange token: ${err.message}</h2>`);
      } finally {
        setTimeout(() => {
          server.close();
          process.exit(0);
        }, 1500);
      }
    }
  } else {
    res.writeHead(404);
    res.end();
  }
});

server.listen(5173, '127.0.0.1', () => {
  const authUrl = spotify.getAuthorizationUrl('cli_auth');
  console.log(`\n--- Spotify CLI Authorizer ---`);
  console.log(`Listening on http://127.0.0.1:5173/callback`);
  console.log(`Opening browser to authorize Spotify: \n${authUrl}\n`);

  // Open default browser on Windows
  exec(`start "" "${authUrl}"`);
});
