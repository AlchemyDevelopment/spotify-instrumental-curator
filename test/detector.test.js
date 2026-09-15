import { analyzeTrackInstrumental } from '../server/instrumentalDetector.js';

async function runTests() {
  console.log('--- Testing Instrumental Detection Logic ---');

  // Test 1: High Spotify audio feature score
  const track1 = {
    id: 'test_track_1',
    uri: 'spotify:track:test1',
    name: 'Time',
    artists: [{ name: 'Hans Zimmer' }],
    album: { name: 'Inception Soundtrack' },
    duration_ms: 275000
  };
  const res1 = await analyzeTrackInstrumental(track1, { instrumentalness: 0.95 });
  console.log('Test 1 (Hans Zimmer - Time):', res1.isInstrumental ? 'PASS (Instrumental detected)' : 'FAIL', res1.confidenceScore, '%');

  // Test 2: Explicit keyword in title
  const track2 = {
    id: 'test_track_2',
    uri: 'spotify:track:test2',
    name: 'River Flows in You (Piano Cover / Instrumental)',
    artists: [{ name: 'Various Artists' }],
    album: { name: 'Relaxing Piano' },
    duration_ms: 180000
  };
  const res2 = await analyzeTrackInstrumental(track2, null);
  console.log('Test 2 (Piano Cover Keyword):', res2.isInstrumental ? 'PASS (Instrumental detected)' : 'FAIL', res2.confidenceScore, '%');

  // Test 3: Standard pop vocal track
  const track3 = {
    id: 'test_track_3',
    uri: 'spotify:track:test3',
    name: 'Shape of You',
    artists: [{ name: 'Ed Sheeran' }],
    album: { name: 'Divide' },
    duration_ms: 233000
  };
  const res3 = await analyzeTrackInstrumental(track3, { instrumentalness: 0.001 }, { checkLyrics: true });
  console.log('Test 3 (Ed Sheeran Vocal Track):', !res3.isInstrumental ? 'PASS (Correctly rejected vocal track)' : 'FAIL', res3.confidenceScore, '%');

  console.log('--- All Detection Tests Finished ---');
}

runTests().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
