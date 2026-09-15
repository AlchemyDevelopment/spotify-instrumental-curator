import React, { useState } from 'react';
import { Disc3, Plus, Check, ExternalLink } from 'lucide-react';

export function TargetSelector({
  playlists,
  targetPlaylistId,
  setTargetPlaylistId,
  onCreatePlaylist,
  user
}) {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('Instrumental Haven');
  const [newPlaylistDesc, setNewPlaylistDesc] = useState('Curated pure instrumentals from my playlists and listening history.');
  const [creating, setCreating] = useState(false);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newPlaylistName.trim()) return;
    setCreating(true);
    try {
      const created = await onCreatePlaylist(newPlaylistName, newPlaylistDesc);
      if (created && created.id) {
        setTargetPlaylistId(created.id);
        setShowCreateModal(false);
      }
    } catch (err) {
      alert('Failed to create playlist: ' + err.message);
    } finally {
      setCreating(false);
    }
  };

  const selectedPlaylist = playlists.find(p => p.id === targetPlaylistId);

  return (
    <div className="glass-panel" style={{ padding: '22px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(0, 210, 255, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-cyan)' }}>
            <Disc3 size={18} />
          </div>
          <div>
            <h2 style={{ fontSize: '16px' }}>2. Select Destination Instrumental Playlist</h2>
            <p style={{ fontSize: '12px' }}>Where qualifying instrumental songs will be added (with duplicate prevention)</p>
          </div>
        </div>

        <button
          className="btn btn-secondary"
          onClick={() => setShowCreateModal(true)}
          style={{ fontSize: '13px', padding: '8px 14px' }}
        >
          <Plus size={16} color="var(--spotify-green)" />
          <span>Create New Playlist</span>
        </button>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: '240px' }}>
          <select
            value={targetPlaylistId}
            onChange={(e) => setTargetPlaylistId(e.target.value)}
            className="input-text"
            style={{ height: '44px', cursor: 'pointer', background: 'var(--bg-input)' }}
          >
            <option value="">-- Select a Destination Playlist --</option>
            {playlists.map(p => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.tracks?.total || 0} tracks)
              </option>
            ))}
          </select>
        </div>

        {selectedPlaylist && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(255,255,255,0.04)', padding: '6px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
            {selectedPlaylist.images?.[0]?.url && (
              <img src={selectedPlaylist.images[0].url} alt={selectedPlaylist.name} style={{ width: '32px', height: '32px', borderRadius: '4px' }} />
            )}
            <div>
              <div style={{ fontSize: '13px', fontWeight: '600' }}>{selectedPlaylist.name}</div>
              <div style={{ fontSize: '11px', color: '#1ed760', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Check size={12} /> Ready for sync
              </div>
            </div>
            {selectedPlaylist.external_urls?.spotify && (
              <a href={selectedPlaylist.external_urls.spotify} target="_blank" rel="noreferrer" className="btn btn-ghost" style={{ padding: '6px' }} title="Open in Spotify">
                <ExternalLink size={14} />
              </a>
            )}
          </div>
        )}
      </div>

      {/* Create New Playlist Modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ fontSize: '16px', marginBottom: '14px' }}>Create New Spotify Playlist</h3>
            <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', marginBottom: '6px' }}>Playlist Name</label>
                <input
                  type="text"
                  className="input-text"
                  value={newPlaylistName}
                  onChange={(e) => setNewPlaylistName(e.target.value)}
                  placeholder="e.g. Pure Instrumentals & Soundtracks"
                  required
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', marginBottom: '6px' }}>Description</label>
                <textarea
                  className="input-text"
                  rows={3}
                  value={newPlaylistDesc}
                  onChange={(e) => setNewPlaylistDesc(e.target.value)}
                  placeholder="Playlist description..."
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowCreateModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={creating}>
                  {creating ? 'Creating...' : 'Create & Select'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
