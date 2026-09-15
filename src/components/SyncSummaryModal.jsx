import React from 'react';
import { X, CheckCircle2, Disc3, ExternalLink, Sparkles } from 'lucide-react';

export function SyncSummaryModal({ isOpen, onClose, syncResult, targetPlaylist }) {
  if (!isOpen || !syncResult) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ textAlign: 'center', padding: '36px 28px' }} onClick={(e) => e.stopPropagation()}>
        <div style={{
          width: '64px',
          height: '64px',
          borderRadius: '50%',
          background: 'rgba(29, 185, 84, 0.15)',
          color: 'var(--spotify-green)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 20px',
          boxShadow: '0 0 30px rgba(29, 185, 84, 0.3)'
        }}>
          <CheckCircle2 size={36} />
        </div>

        <h2 style={{ fontSize: '22px', marginBottom: '8px' }}>Sync Complete!</h2>
        <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '24px' }}>
          Successfully curated instrumental tracks to your Spotify playlist.
        </p>

        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '12px',
          background: 'rgba(255, 255, 255, 0.03)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-lg)',
          padding: '18px',
          marginBottom: '24px'
        }}>
          <div>
            <div style={{ fontSize: '28px', fontWeight: '800', color: '#1ed760' }}>
              {syncResult.addedCount || 0}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>New Songs Added</div>
          </div>
          <div>
            <div style={{ fontSize: '28px', fontWeight: '800', color: 'var(--text-muted)' }}>
              {syncResult.skippedDuplicates || 0}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Duplicates Skipped</div>
          </div>
        </div>

        {targetPlaylist && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '24px' }}>
            <Disc3 size={16} color="var(--spotify-green)" />
            <span style={{ fontSize: '13px', fontWeight: '600' }}>{targetPlaylist.name}</span>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
          {targetPlaylist?.external_urls?.spotify && (
            <a
              href={targetPlaylist.external_urls.spotify}
              target="_blank"
              rel="noreferrer"
              className="btn btn-primary"
            >
              <ExternalLink size={16} />
              <span>Open in Spotify</span>
            </a>
          )}
          <button className="btn btn-secondary" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
