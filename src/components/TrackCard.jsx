import React from 'react';
import { Play, Pause, ExternalLink, Check, Info, AlertCircle } from 'lucide-react';

export function TrackCard({
  track,
  onToggleSelect,
  isPlaying,
  onTogglePlay
}) {
  const getBadgeClass = (score, isInst) => {
    if (!isInst) return 'badge-vocal';
    if (score >= 80) return 'badge-instrumental';
    if (score >= 50) return 'badge-likely';
    return 'badge-ambiguous';
  };

  const formatDuration = (ms) => {
    if (!ms) return '0:00';
    const totalSecs = Math.floor(ms / 1000);
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '14px',
        padding: '12px 16px',
        borderRadius: 'var(--radius-md)',
        background: track.selected ? 'rgba(29, 185, 84, 0.08)' : 'rgba(255, 255, 255, 0.02)',
        border: `1px solid ${track.selected ? 'rgba(29, 185, 84, 0.35)' : 'var(--border-subtle)'}`,
        transition: 'all 0.15s ease'
      }}
    >
      {/* Checkbox */}
      <input
        type="checkbox"
        checked={track.selected || false}
        onChange={() => onToggleSelect(track.id)}
        disabled={track.alreadyInTarget}
        style={{ accentColor: 'var(--spotify-green)', width: '18px', height: '18px', cursor: track.alreadyInTarget ? 'not-allowed' : 'pointer' }}
      />

      {/* Album Artwork with Play Overlay */}
      <div style={{ position: 'relative', width: '48px', height: '48px', flexShrink: 0, borderRadius: '6px', overflow: 'hidden' }}>
        {track.albumArt ? (
          <img src={track.albumArt} alt={track.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <div style={{ width: '100%', height: '100%', background: '#1e293b' }} />
        )}

        {track.preview_url && (
          <button
            onClick={() => onTogglePlay(track)}
            style={{
              position: 'absolute',
              inset: 0,
              background: isPlaying ? 'rgba(29, 185, 84, 0.85)' : 'rgba(0, 0, 0, 0.55)',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              transition: 'background 0.2s ease'
            }}
            title={isPlaying ? 'Pause preview' : 'Play 30s preview'}
          >
            {isPlaying ? <Pause size={20} fill="#fff" /> : <Play size={20} fill="#fff" />}
          </button>
        )}
      </div>

      {/* Track Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {track.name}
          </span>
          {track.external_url && (
            <a href={track.external_url} target="_blank" rel="noreferrer" style={{ color: 'var(--text-muted)' }} title="Open in Spotify">
              <ExternalLink size={12} />
            </a>
          )}
        </div>
        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {track.artists} {track.album ? `• ${track.album}` : ''}
        </div>

        {/* Reason tags */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px', flexWrap: 'wrap' }}>
          <span className={`badge ${getBadgeClass(track.confidenceScore, track.isInstrumental)}`}>
            {track.isInstrumental ? `Instrumental (${track.confidenceScore}%)` : `Vocal (${track.confidenceScore}%)`}
          </span>

          {track.source && (
            <span className="badge badge-tag" style={{ fontSize: '10px' }}>
              Source: {track.source}
            </span>
          )}

          {track.alreadyInTarget && (
            <span className="badge" style={{ background: 'rgba(255,255,255,0.08)', color: '#94a3b8', border: '1px solid var(--border-subtle)' }}>
              <Check size={10} /> Already in Playlist
            </span>
          )}

          {track.reasons && track.reasons.length > 0 && (
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
              <Info size={11} /> {track.reasons[0]}
            </span>
          )}
        </div>
      </div>

      {/* Duration */}
      <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', flexShrink: 0 }}>
        {formatDuration(track.duration_ms)}
      </div>
    </div>
  );
}
