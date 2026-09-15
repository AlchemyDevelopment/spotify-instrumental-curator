import React, { useState } from 'react';
import { ListMusic, History, Sparkles, Heart, Search, CheckSquare, Square } from 'lucide-react';

export function SourceSelector({
  playlists,
  selectedPlaylistIds,
  onTogglePlaylist,
  onSelectAllPlaylists,
  onDeselectAllPlaylists,
  includeRecentlyPlayed,
  setIncludeRecentlyPlayed,
  includeTopTracks,
  setIncludeTopTracks,
  includeLikedSongs,
  setIncludeLikedSongs,
  trustSourcePlaylist,
  setTrustSourcePlaylist,
  loading
}) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredPlaylists = playlists.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="glass-panel" style={{ padding: '22px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(29, 185, 84, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--spotify-green)' }}>
            <ListMusic size={18} />
          </div>
          <div>
            <h2 style={{ fontSize: '16px' }}>1. Select Sources to Scan</h2>
            <p style={{ fontSize: '12px' }}>Choose which playlists or listening activity to analyze for instrumentals</p>
          </div>
        </div>

        {selectedPlaylistIds.length > 0 && (
          <div
            onClick={() => setTrustSourcePlaylist(!trustSourcePlaylist)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 12px',
              borderRadius: 'var(--radius-full)',
              background: trustSourcePlaylist ? 'rgba(29, 185, 84, 0.2)' : 'rgba(255, 255, 255, 0.05)',
              border: `1px solid ${trustSourcePlaylist ? 'var(--spotify-green)' : 'var(--border-subtle)'}`,
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
            title="When active, all tracks in your selected source playlists are treated as verified instrumentals"
          >
            <input
              type="checkbox"
              checked={trustSourcePlaylist}
              onChange={() => {}}
              style={{ accentColor: 'var(--spotify-green)', cursor: 'pointer' }}
            />
            <span style={{ fontSize: '12px', fontWeight: '600', color: trustSourcePlaylist ? '#1ed760' : 'var(--text-secondary)' }}>
              Source playlist is 100% instrumental (Trust mode)
            </span>
          </div>
        )}
      </div>

      {/* Listening Activity Sources */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
        <div
          onClick={() => setIncludeRecentlyPlayed(!includeRecentlyPlayed)}
          style={{
            background: includeRecentlyPlayed ? 'rgba(29, 185, 84, 0.12)' : 'rgba(255, 255, 255, 0.03)',
            border: `1px solid ${includeRecentlyPlayed ? 'var(--spotify-green)' : 'var(--border-subtle)'}`,
            borderRadius: 'var(--radius-md)',
            padding: '14px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            transition: 'all 0.2s ease'
          }}
        >
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '8px',
            background: includeRecentlyPlayed ? 'var(--spotify-green)' : 'rgba(255,255,255,0.08)',
            color: includeRecentlyPlayed ? '#000' : 'var(--text-primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <History size={18} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '13px', fontWeight: '700' }}>Recently Listened</div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Last 50 played tracks</div>
          </div>
          <input
            type="checkbox"
            checked={includeRecentlyPlayed}
            onChange={() => {}}
            style={{ accentColor: 'var(--spotify-green)', width: '16px', height: '16px' }}
          />
        </div>

        <div
          onClick={() => setIncludeTopTracks(!includeTopTracks)}
          style={{
            background: includeTopTracks ? 'rgba(0, 210, 255, 0.12)' : 'rgba(255, 255, 255, 0.03)',
            border: `1px solid ${includeTopTracks ? 'var(--accent-cyan)' : 'var(--border-subtle)'}`,
            borderRadius: 'var(--radius-md)',
            padding: '14px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            transition: 'all 0.2s ease'
          }}
        >
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '8px',
            background: includeTopTracks ? 'var(--accent-cyan)' : 'rgba(255,255,255,0.08)',
            color: includeTopTracks ? '#000' : 'var(--text-primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Sparkles size={18} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '13px', fontWeight: '700' }}>Top Listened Tracks</div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Recent heavy rotation</div>
          </div>
          <input
            type="checkbox"
            checked={includeTopTracks}
            onChange={() => {}}
            style={{ accentColor: 'var(--accent-cyan)', width: '16px', height: '16px' }}
          />
        </div>

        <div
          onClick={() => setIncludeLikedSongs(!includeLikedSongs)}
          style={{
            background: includeLikedSongs ? 'rgba(244, 63, 94, 0.12)' : 'rgba(255, 255, 255, 0.03)',
            border: `1px solid ${includeLikedSongs ? 'var(--accent-rose)' : 'var(--border-subtle)'}`,
            borderRadius: 'var(--radius-md)',
            padding: '14px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            transition: 'all 0.2s ease'
          }}
        >
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '8px',
            background: includeLikedSongs ? 'var(--accent-rose)' : 'rgba(255,255,255,0.08)',
            color: includeLikedSongs ? '#fff' : 'var(--text-primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Heart size={18} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '13px', fontWeight: '700' }}>Liked Songs Library</div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Your saved favorites</div>
          </div>
          <input
            type="checkbox"
            checked={includeLikedSongs}
            onChange={() => {}}
            style={{ accentColor: 'var(--accent-rose)', width: '16px', height: '16px' }}
          />
        </div>
      </div>

      {/* Playlists Picker */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
          <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)' }}>
            User Playlists ({selectedPlaylistIds.length} of {playlists.length} selected)
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button className="btn btn-ghost" onClick={onSelectAllPlaylists} style={{ fontSize: '12px', padding: '4px 8px' }}>
              Select All
            </button>
            <button className="btn btn-ghost" onClick={onDeselectAllPlaylists} style={{ fontSize: '12px', padding: '4px 8px' }}>
              Deselect All
            </button>
          </div>
        </div>

        <div style={{ position: 'relative' }}>
          <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            className="input-text"
            placeholder="Search playlists..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ paddingLeft: '36px', height: '40px', fontSize: '13px' }}
          />
        </div>

        <div style={{
          maxHeight: '220px',
          overflowY: 'auto',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
          gap: '8px',
          padding: '4px'
        }}>
          {filteredPlaylists.length === 0 ? (
            <div style={{ gridColumn: '1 / -1', padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
              {playlists.length === 0 ? 'No playlists found. Connect Spotify above.' : 'No matching playlists found.'}
            </div>
          ) : (
            filteredPlaylists.map(playlist => {
              const isSelected = selectedPlaylistIds.includes(playlist.id);
              const img = playlist.images?.[0]?.url;
              return (
                <div
                  key={playlist.id}
                  onClick={() => onTogglePlaylist(playlist.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '8px 10px',
                    borderRadius: 'var(--radius-md)',
                    background: isSelected ? 'rgba(29, 185, 84, 0.12)' : 'rgba(255, 255, 255, 0.03)',
                    border: `1px solid ${isSelected ? 'var(--spotify-green)' : 'var(--border-subtle)'}`,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {img ? (
                    <img src={img} alt={playlist.name} style={{ width: '38px', height: '38px', borderRadius: '6px', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ width: '38px', height: '38px', borderRadius: '6px', background: 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <ListMusic size={18} color="var(--text-muted)" />
                    </div>
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '13px', fontWeight: '600', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {playlist.name}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      {playlist.tracks?.total || 0} tracks
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => {}}
                    style={{ accentColor: 'var(--spotify-green)', width: '16px', height: '16px' }}
                  />
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
