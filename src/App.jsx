import React, { useState, useEffect, useMemo } from 'react';
import {
  RefreshCw,
  Sliders,
  CheckCircle,
  AlertTriangle,
  Play,
  Music,
  Filter,
  CheckSquare,
  Square,
  Sparkles
} from 'lucide-react';

import { Header } from './components/Header.jsx';
import { SourceSelector } from './components/SourceSelector.jsx';
import { TargetSelector } from './components/TargetSelector.jsx';
import { TrackCard } from './components/TrackCard.jsx';
import { AudioPlayer } from './components/AudioPlayer.jsx';
import { SettingsModal } from './components/SettingsModal.jsx';
import { SetupGuideModal } from './components/SetupGuideModal.jsx';
import { SyncSummaryModal } from './components/SyncSummaryModal.jsx';
import { SpotifyClient } from './services/spotifyClient.js';
import { analyzeTrackInstrumental } from './services/instrumentalDetector.js';

export default function App() {
  // Settings & Config
  const [clientId, setClientId] = useState(() => localStorage.getItem('spotify_client_id') || 'eab865abfba448d5b3c51fb3b9a878d4');
  const [instrumentalThreshold, setInstrumentalThreshold] = useState(() => {
    const saved = localStorage.getItem('spotify_instrumental_threshold');
    return saved !== null ? parseFloat(saved) : 0.5;
  });
  const [checkLyrics, setCheckLyrics] = useState(() => {
    const saved = localStorage.getItem('spotify_check_lyrics');
    return saved !== null ? saved === 'true' : true;
  });

  // Auth tokens
  const [token, setToken] = useState(() => localStorage.getItem('spotify_access_token') || '');
  const [refreshToken, setRefreshToken] = useState(() => localStorage.getItem('spotify_refresh_token') || '');
  const [user, setUser] = useState(null);

  // Playlists & Sources
  const [playlists, setPlaylists] = useState([]);
  const [selectedPlaylistIds, setSelectedPlaylistIds] = useState([]);
  const [includeRecentlyPlayed, setIncludeRecentlyPlayed] = useState(true);
  const [includeTopTracks, setIncludeTopTracks] = useState(false);
  const [includeLikedSongs, setIncludeLikedSongs] = useState(false);

  // Target Playlist
  const [targetPlaylistId, setTargetPlaylistId] = useState(() => localStorage.getItem('spotify_target_playlist_id') || '');

  // Scanning & Results
  const [scanning, setScanning] = useState(false);
  const [scanProgressText, setScanProgressText] = useState('');
  const [scannedTracks, setScannedTracks] = useState([]);
  const [activeFilter, setActiveFilter] = useState('instrumental'); // 'all' | 'instrumental' | 'vocal'
  const [trackSearchQuery, setTrackSearchQuery] = useState('');

  // Sync state
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState(null);
  const [showSyncModal, setShowSyncModal] = useState(false);

  // Audio Preview
  const [currentPlayingTrack, setCurrentPlayingTrack] = useState(null);

  // Modals
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showGuideModal, setShowGuideModal] = useState(false);

  // Toast notifications
  const [toastMessage, setToastMessage] = useState(null);

  const showToast = (msg, type = 'info') => {
    setToastMessage({ msg, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Build client
  const redirectUri = useMemo(() => {
    return `${window.location.origin}${window.location.pathname}`.replace(/\/+$/, '') + '/';
  }, []);

  const spotifyClient = useMemo(() => {
    return new SpotifyClient(clientId, redirectUri);
  }, [clientId, redirectUri]);

  // Handle OAuth code return from Spotify
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    if (code) {
      window.history.replaceState({}, document.title, window.location.pathname);
      handleExchangeCode(code);
    }
  }, []);

  const handleExchangeCode = async (code) => {
    try {
      showToast('Authenticating with Spotify...', 'info');
      const data = await spotifyClient.exchangeCode(code);
      if (data.access_token) {
        setToken(data.access_token);
        localStorage.setItem('spotify_access_token', data.access_token);
        if (data.refresh_token) {
          setRefreshToken(data.refresh_token);
          localStorage.setItem('spotify_refresh_token', data.refresh_token);
        }
        showToast('Spotify connected successfully!', 'success');
      }
    } catch (err) {
      console.error('Code exchange failed:', err);
      showToast('Authentication failed: ' + (err.response?.data?.error_description || err.message), 'error');
    }
  };

  // Fetch user profile and playlists
  useEffect(() => {
    if (token) {
      fetchUser();
      fetchPlaylists();
    }
  }, [token]);

  const fetchUser = async () => {
    try {
      const data = await spotifyClient.getCurrentUser(token);
      setUser(data);
    } catch (err) {
      if (err.response?.status === 401 && refreshToken) {
        handleRefreshToken();
      } else {
        handleLogout();
      }
    }
  };

  const fetchPlaylists = async () => {
    try {
      const list = await spotifyClient.getUserPlaylists(token);
      setPlaylists(list || []);
    } catch (err) {
      console.error('Failed to load playlists:', err);
    }
  };

  const handleRefreshToken = async () => {
    try {
      const data = await spotifyClient.refreshToken(refreshToken);
      if (data.access_token) {
        setToken(data.access_token);
        localStorage.setItem('spotify_access_token', data.access_token);
      }
    } catch (err) {
      console.error('Token refresh failed:', err);
      handleLogout();
    }
  };

  const handleLogin = async () => {
    if (!clientId) {
      showToast('Please set your Spotify Client ID in Settings.', 'error');
      setShowSettingsModal(true);
      return;
    }
    await spotifyClient.redirectToAuthorize();
  };

  const handleLogout = () => {
    setToken('');
    setRefreshToken('');
    setUser(null);
    setScannedTracks([]);
    localStorage.removeItem('spotify_access_token');
    localStorage.removeItem('spotify_refresh_token');
    showToast('Logged out of Spotify.', 'info');
  };

  const handleSaveSettings = async (settings) => {
    if (settings.clientId) {
      setClientId(settings.clientId);
      localStorage.setItem('spotify_client_id', settings.clientId);
    }
    if (settings.instrumentalThreshold !== undefined) {
      setInstrumentalThreshold(settings.instrumentalThreshold);
      localStorage.setItem('spotify_instrumental_threshold', settings.instrumentalThreshold.toString());
    }
    if (settings.checkLyrics !== undefined) {
      setCheckLyrics(settings.checkLyrics);
      localStorage.setItem('spotify_check_lyrics', settings.checkLyrics.toString());
    }
    showToast('Settings saved!', 'success');
  };

  const handleCreatePlaylist = async (name, description) => {
    if (!user) return null;
    const created = await spotifyClient.createPlaylist(token, user.id, name, description);
    fetchPlaylists();
    showToast(`Playlist "${name}" created!`, 'success');
    return created;
  };

  const toggleSourcePlaylist = (id) => {
    setSelectedPlaylistIds(prev =>
      prev.includes(id) ? prev.filter(pId => pId !== id) : [...prev, id]
    );
  };

  const selectAllPlaylists = () => {
    setSelectedPlaylistIds(playlists.map(p => p.id));
  };

  const deselectAllPlaylists = () => {
    setSelectedPlaylistIds([]);
  };

  // Scan & Analyze Tracks
  const handleScan = async () => {
    if (!token) {
      showToast('Please connect to Spotify first.', 'error');
      return;
    }
    if (selectedPlaylistIds.length === 0 && !includeRecentlyPlayed && !includeTopTracks && !includeLikedSongs) {
      showToast('Please select at least one source playlist or listening history option.', 'error');
      return;
    }

    setScanning(true);
    setScanProgressText('Ingesting tracks from selected sources...');

    try {
      const rawTracksMap = new Map();

      // 1. Playlists
      for (const playlistId of selectedPlaylistIds) {
        try {
          const tracks = await spotifyClient.getPlaylistTracks(token, playlistId);
          for (const track of tracks) {
            if (track && track.id && !rawTracksMap.has(track.id)) {
              rawTracksMap.set(track.id, { track, source: 'Playlist' });
            }
          }
        } catch (err) {
          console.error(`Error loading playlist ${playlistId}:`, err);
        }
      }

      // 2. Recently Played
      if (includeRecentlyPlayed) {
        const recentTracks = await spotifyClient.getRecentlyPlayedTracks(token, 50);
        for (const track of recentTracks) {
          if (track && track.id && !rawTracksMap.has(track.id)) {
            rawTracksMap.set(track.id, { track, source: 'Recently Played' });
          }
        }
      }

      // 3. Top Tracks
      if (includeTopTracks) {
        const topTracks = await spotifyClient.getTopTracks(token, 50);
        for (const track of topTracks) {
          if (track && track.id && !rawTracksMap.has(track.id)) {
            rawTracksMap.set(track.id, { track, source: 'Top Listened' });
          }
        }
      }

      // 4. Liked Songs
      if (includeLikedSongs) {
        const likedTracks = await spotifyClient.getSavedTracks(token, 50);
        for (const track of likedTracks) {
          if (track && track.id && !rawTracksMap.has(track.id)) {
            rawTracksMap.set(track.id, { track, source: 'Liked Songs' });
          }
        }
      }

      const allTracks = Array.from(rawTracksMap.values());
      const trackIds = allTracks.map(t => t.track.id);

      setScanProgressText(`Analyzing ${allTracks.length} tracks for instrumental signatures...`);

      // 5. Audio Features
      let audioFeaturesMap = {};
      try {
        audioFeaturesMap = await spotifyClient.getAudioFeaturesBatch(token, trackIds);
      } catch (featErr) {
        console.warn('Audio features skipped');
      }

      // 6. Target playlist deduplication
      let existingTargetUris = new Set();
      if (targetPlaylistId) {
        existingTargetUris = await spotifyClient.getTargetPlaylistTrackUris(token, targetPlaylistId);
      }

      // 7. Evaluate
      const evaluatedTracks = [];
      for (const item of allTracks) {
        const track = item.track;
        const audioFeat = audioFeaturesMap[track.id] || null;

        const analysis = await analyzeTrackInstrumental(track, audioFeat, {
          threshold: instrumentalThreshold,
          checkLyrics
        });

        const isAlreadyInTarget = existingTargetUris.has(track.uri);

        evaluatedTracks.push({
          ...analysis,
          source: item.source,
          alreadyInTarget: isAlreadyInTarget,
          selected: analysis.isInstrumental && !isAlreadyInTarget
        });
      }

      // Sort
      evaluatedTracks.sort((a, b) => {
        if (a.isInstrumental && !b.isInstrumental) return -1;
        if (!a.isInstrumental && b.isInstrumental) return 1;
        return b.confidenceScore - a.confidenceScore;
      });

      setScannedTracks(evaluatedTracks);
      const instCount = evaluatedTracks.filter(t => t.isInstrumental).length;
      const newCount = evaluatedTracks.filter(t => t.isInstrumental && !t.alreadyInTarget).length;
      showToast(`Scan complete! Found ${instCount} instrumentals (${newCount} ready to add).`, 'success');
    } catch (err) {
      console.error('Scan error:', err);
      showToast('Scan failed: ' + err.message, 'error');
    } finally {
      setScanning(false);
      setScanProgressText('');
    }
  };

  const toggleTrackSelect = (id) => {
    setScannedTracks(prev =>
      prev.map(t => t.id === id ? { ...t, selected: !t.selected } : t)
    );
  };

  const selectAllInstrumentals = () => {
    setScannedTracks(prev =>
      prev.map(t => ({
        ...t,
        selected: t.isInstrumental && !t.alreadyInTarget ? true : t.selected
      }))
    );
  };

  const deselectAllTracks = () => {
    setScannedTracks(prev => prev.map(t => ({ ...t, selected: false })));
  };

  const handleTogglePlay = (track) => {
    if (currentPlayingTrack?.id === track.id) {
      setCurrentPlayingTrack(null);
    } else {
      setCurrentPlayingTrack(track);
    }
  };

  // Add selected tracks to destination playlist
  const handleSyncToTarget = async () => {
    if (!targetPlaylistId) {
      showToast('Please select or create a destination instrumental playlist first.', 'error');
      return;
    }

    const selectedTracks = scannedTracks.filter(t => t.selected);
    if (selectedTracks.length === 0) {
      showToast('No tracks selected to add.', 'error');
      return;
    }

    setSyncing(true);
    try {
      const existingUris = await spotifyClient.getTargetPlaylistTrackUris(token, targetPlaylistId);
      const newUris = selectedTracks.map(t => t.uri).filter(uri => !existingUris.has(uri));

      if (newUris.length === 0) {
        showToast('All selected songs already exist in target playlist.', 'info');
        setSyncing(false);
        return;
      }

      const res = await spotifyClient.addTracksToPlaylist(token, targetPlaylistId, newUris);
      setSyncResult({
        addedCount: res.added,
        skippedDuplicates: selectedTracks.length - res.added
      });
      setShowSyncModal(true);

      const addedSet = new Set(newUris);
      setScannedTracks(prev =>
        prev.map(t => addedSet.has(t.uri) ? { ...t, alreadyInTarget: true, selected: false } : t)
      );

      fetchPlaylists();
    } catch (err) {
      console.error('Sync error:', err);
      showToast('Failed to add tracks: ' + err.message, 'error');
    } finally {
      setSyncing(false);
    }
  };

  const displayedTracks = scannedTracks.filter(track => {
    if (activeFilter === 'instrumental' && !track.isInstrumental) return false;
    if (activeFilter === 'vocal' && track.isInstrumental) return false;

    if (trackSearchQuery.trim()) {
      const q = trackSearchQuery.toLowerCase();
      const matchName = track.name.toLowerCase().includes(q);
      const matchArtist = track.artists.toLowerCase().includes(q);
      const matchAlbum = (track.album || '').toLowerCase().includes(q);
      if (!matchName && !matchArtist && !matchAlbum) return false;
    }

    return true;
  });

  const selectedCount = scannedTracks.filter(t => t.selected).length;
  const targetPlaylistObj = playlists.find(p => p.id === targetPlaylistId);

  const currentConfig = {
    clientId,
    redirectUri,
    instrumentalThreshold,
    hasClientSecret: false
  };

  return (
    <div className="app-container">
      {/* Toast Notification */}
      {toastMessage && (
        <div style={{
          position: 'fixed',
          top: '24px',
          right: '24px',
          zIndex: 2000,
          background: toastMessage.type === 'error' ? 'rgba(244, 63, 94, 0.95)' :
                      toastMessage.type === 'success' ? 'rgba(29, 185, 84, 0.95)' : 'rgba(17, 23, 36, 0.95)',
          color: '#ffffff',
          padding: '12px 20px',
          borderRadius: 'var(--radius-md)',
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          fontSize: '13px',
          fontWeight: '600',
          animation: 'slideUp 0.2s ease-out'
        }}>
          {toastMessage.type === 'error' ? <AlertTriangle size={18} /> : <CheckCircle size={18} />}
          <span>{toastMessage.msg}</span>
        </div>
      )}

      {/* Header */}
      <Header
        user={user}
        onLogin={handleLogin}
        onLogout={handleLogout}
        onOpenSettings={() => setShowSettingsModal(true)}
        onOpenGuide={() => setShowGuideModal(true)}
        hasConfig={!!clientId}
      />

      {/* Main Workflow Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px' }}>
        
        {/* Step 1: Sources */}
        <SourceSelector
          playlists={playlists}
          selectedPlaylistIds={selectedPlaylistIds}
          onTogglePlaylist={toggleSourcePlaylist}
          onSelectAllPlaylists={selectAllPlaylists}
          onDeselectAllPlaylists={deselectAllPlaylists}
          includeRecentlyPlayed={includeRecentlyPlayed}
          setIncludeRecentlyPlayed={setIncludeRecentlyPlayed}
          includeTopTracks={includeTopTracks}
          setIncludeTopTracks={setIncludeTopTracks}
          includeLikedSongs={includeLikedSongs}
          setIncludeLikedSongs={setIncludeLikedSongs}
          loading={!user}
        />

        {/* Step 2: Target Destination */}
        <TargetSelector
          playlists={playlists}
          targetPlaylistId={targetPlaylistId}
          setTargetPlaylistId={(id) => {
            setTargetPlaylistId(id);
            localStorage.setItem('spotify_target_playlist_id', id);
          }}
          onCreatePlaylist={handleCreatePlaylist}
          user={user}
        />

        {/* Scan & Action Bar */}
        <div className="glass-panel" style={{ padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h3 style={{ fontSize: '15px', marginBottom: '4px' }}>3. Scan & Analyze Songs</h3>
            <p style={{ fontSize: '12px' }}>
              {scanProgressText || 'Detects instrumental tracks using Spotify audio analysis, metadata cues, and lyrics database verification'}
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              className="btn btn-primary"
              onClick={handleScan}
              disabled={scanning || !token}
              style={{ padding: '12px 24px', fontSize: '14px' }}
            >
              <RefreshCw size={18} className={scanning ? 'pulse-glow' : ''} style={{ animation: scanning ? 'spin 1s linear infinite' : 'none' }} />
              <span>{scanning ? 'Analyzing Tracks...' : 'Scan for Instrumentals'}</span>
            </button>
          </div>
        </div>

        {/* Scan Results & Curation Section */}
        {scannedTracks.length > 0 && (
          <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
            
            {/* Top Toolbar */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px' }}>
              
              {/* Filter Tabs */}
              <div style={{ display: 'flex', background: 'rgba(255,255,255,0.05)', padding: '4px', borderRadius: 'var(--radius-full)', border: '1px solid var(--border-subtle)' }}>
                <button
                  className={`btn ${activeFilter === 'instrumental' ? 'btn-primary' : 'btn-ghost'}`}
                  onClick={() => setActiveFilter('instrumental')}
                  style={{ padding: '6px 14px', fontSize: '12px' }}
                >
                  <span>Instrumentals</span>
                  <span className="badge badge-tag" style={{ marginLeft: '4px', fontSize: '10px' }}>
                    {scannedTracks.filter(t => t.isInstrumental).length}
                  </span>
                </button>

                <button
                  className={`btn ${activeFilter === 'all' ? 'btn-primary' : 'btn-ghost'}`}
                  onClick={() => setActiveFilter('all')}
                  style={{ padding: '6px 14px', fontSize: '12px' }}
                >
                  <span>All Scanned</span>
                  <span className="badge badge-tag" style={{ marginLeft: '4px', fontSize: '10px' }}>
                    {scannedTracks.length}
                  </span>
                </button>

                <button
                  className={`btn ${activeFilter === 'vocal' ? 'btn-primary' : 'btn-ghost'}`}
                  onClick={() => setActiveFilter('vocal')}
                  style={{ padding: '6px 14px', fontSize: '12px' }}
                >
                  <span>Vocal Tracks</span>
                  <span className="badge badge-tag" style={{ marginLeft: '4px', fontSize: '10px' }}>
                    {scannedTracks.filter(t => !t.isInstrumental).length}
                  </span>
                </button>
              </div>

              {/* Add Selected to Target Playlist Button */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <button
                  className="btn btn-primary"
                  onClick={handleSyncToTarget}
                  disabled={syncing || selectedCount === 0 || !targetPlaylistId}
                  style={{ padding: '10px 20px', fontSize: '13px' }}
                >
                  <Sparkles size={16} />
                  <span>{syncing ? 'Adding...' : `Add ${selectedCount} Selected to ${targetPlaylistObj ? targetPlaylistObj.name : 'Target Playlist'}`}</span>
                </button>
              </div>
            </div>

            {/* Sub-toolbar: Search & Select All */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button className="btn btn-ghost" onClick={selectAllInstrumentals} style={{ fontSize: '12px', padding: '4px 8px' }}>
                  <CheckSquare size={14} /> Select All Instrumentals
                </button>
                <button className="btn btn-ghost" onClick={deselectAllTracks} style={{ fontSize: '12px', padding: '4px 8px' }}>
                  <Square size={14} /> Deselect All
                </button>
              </div>

              <div style={{ width: '260px' }}>
                <input
                  type="text"
                  className="input-text"
                  placeholder="Filter scanned songs..."
                  value={trackSearchQuery}
                  onChange={(e) => setTrackSearchQuery(e.target.value)}
                  style={{ height: '36px', fontSize: '12px' }}
                />
              </div>
            </div>

            {/* Scanned Track List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '560px', overflowY: 'auto', paddingRight: '4px' }}>
              {displayedTracks.length === 0 ? (
                <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  No tracks match current filters.
                </div>
              ) : (
                displayedTracks.map(track => (
                  <TrackCard
                    key={track.id}
                    track={track}
                    onToggleSelect={toggleTrackSelect}
                    isPlaying={currentPlayingTrack?.id === track.id}
                    onTogglePlay={handleTogglePlay}
                  />
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* Audio Player Dock */}
      <AudioPlayer
        currentTrack={currentPlayingTrack}
        onClose={() => setCurrentPlayingTrack(null)}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        onSave={handleSaveSettings}
        currentConfig={currentConfig}
      />

      {/* Setup Guide Modal */}
      <SetupGuideModal
        isOpen={showGuideModal}
        onClose={() => setShowGuideModal(false)}
        onOpenSettings={() => setShowSettingsModal(true)}
      />

      {/* Sync Summary Modal */}
      <SyncSummaryModal
        isOpen={showSyncModal}
        onClose={() => setShowSyncModal(false)}
        syncResult={syncResult}
        targetPlaylist={targetPlaylistObj}
      />
    </div>
  );
}
