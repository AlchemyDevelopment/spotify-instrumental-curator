import { analyzeTrackInstrumental } from '../src/services/instrumentalDetector.js';

const userTracks = [
  { name: 'The Mole', artists: [{ name: 'Michael McCann' }], album: { name: 'Deus Ex: Human Revolution (Original Soundtrack)' } },
  { name: 'New Worlds', artists: [{ name: 'Jack Wall' }], album: { name: 'Mass Effect 2 (Original Soundtrack)' } },
  { name: 'Rosalina in the Observatory (From "Super Mario Galaxy")', artists: [{ name: 'The Consouls' }], album: { name: 'Game & Jazz' } },
  { name: 'Thinking out Loud - Saxophone Version', artists: [{ name: 'Milo Grande' }], album: { name: 'Fix You (Saxophone Version)' } },
  { name: 'Perplexing Pool (From "Pikmin 2")', artists: [{ name: '8-bit & The Single Players' }], album: { name: "Let's Play" } },
  { name: 'Lake Theme (From "Pokémon Diamond and Pearl")', artists: [{ name: 'David Karsten' }], album: { name: 'A Day in Sinnoh' } },
  { name: 'The Streets of Whiterun', artists: [{ name: 'Feather Fall' }], album: { name: 'Skyrim Sessions' } },
  { name: 'Resonance - Guitar', artists: [{ name: 'Sad Face Prince' }], album: { name: 'Resonance (Guitar)' } },
  { name: 'win again - slowed', artists: [{ name: 'trucky' }], album: { name: 'win again' } },
  { name: 'Volto di donna - Trumpet Version', artists: [{ name: 'Piero Umiliani' }], album: { name: 'La ragazza fuori strada' } },
  { name: 'Watermelon Sugar - Instrumental', artists: [{ name: 'Chilled Teddy' }], album: { name: 'Watermelon Sugar (Instrumental)' } },
  { name: 'Just Wanna Chill', artists: [{ name: 'Dominant' }], album: { name: 'Warm Reminiscence' } },
  { name: 'Shape of You', artists: [{ name: 'Ed Sheeran' }], album: { name: 'Divide' } }
];

async function run() {
  console.log('Testing User Tracks against Upgraded Detector:');
  for (const t of userTracks) {
    const res = await analyzeTrackInstrumental(t, null, { checkLyrics: false });
    console.log(`- "${t.name}" by ${t.artists[0].name}: ${res.isInstrumental ? '✅ INSTRUMENTAL' : '❌ VOCAL'} (${res.confidenceScore}%) -> [${res.reasons.join(', ')}]`);
  }
}

run();
