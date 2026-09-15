import React from 'react';
import { X, ExternalLink, Key, CheckCircle, ShieldAlert } from 'lucide-react';

export function SetupGuideModal({ isOpen, onClose, onOpenSettings }) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: '680px' }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(29, 185, 84, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--spotify-green)' }}>
              <Key size={18} />
            </div>
            <h2 style={{ fontSize: '18px' }}>Spotify Developer App Setup Guide</h2>
          </div>
          <button className="btn btn-ghost" onClick={onClose} style={{ padding: '6px' }}>
            <X size={18} />
          </button>
        </div>

        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '20px' }}>
          To allow this app to read your playlists and add instrumental tracks, you'll need free Spotify Developer API credentials. It takes about 1 minute:
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ background: 'rgba(255,255,255,0.03)', padding: '14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
            <h3 style={{ fontSize: '14px', color: '#1ed760', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>Step 1:</span> Open Spotify Developer Dashboard
            </h3>
            <p style={{ fontSize: '13px', marginBottom: '8px' }}>
              Go to the Spotify Developer Dashboard and log in with your Spotify account.
            </p>
            <a
              href="https://developer.spotify.com/dashboard"
              target="_blank"
              rel="noreferrer"
              className="btn btn-secondary"
              style={{ fontSize: '12px', padding: '6px 12px' }}
            >
              <span>Open Spotify Dashboard</span>
              <ExternalLink size={14} />
            </a>
          </div>

          <div style={{ background: 'rgba(255,255,255,0.03)', padding: '14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
            <h3 style={{ fontSize: '14px', color: '#1ed760', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>Step 2:</span> Create an App
            </h3>
            <ul style={{ fontSize: '13px', color: 'var(--text-secondary)', paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <li>Click <strong>"Create App"</strong>.</li>
              <li>App Name: <strong>Spotify Instrumental Curator</strong> (or anything you like).</li>
              <li>App Description: <strong>Curates instrumental tracks into playlists</strong>.</li>
              <li>Redirect URI: <code style={{ color: 'var(--accent-cyan)', background: 'rgba(0,0,0,0.4)', padding: '2px 6px', borderRadius: '4px' }}>http://127.0.0.1:5173/callback</code></li>
              <li>Which APIs are you using?: Check <strong>Web API</strong>.</li>
              <li>Accept terms and click <strong>Save</strong>.</li>
            </ul>
          </div>

          <div style={{ background: 'rgba(255,255,255,0.03)', padding: '14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
            <h3 style={{ fontSize: '14px', color: '#1ed760', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>Step 3:</span> Copy Client ID & Client Secret
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
              In your new app's dashboard, click <strong>Settings</strong>. Copy your <strong>Client ID</strong> and click <strong>"View client secret"</strong> to copy the secret.
            </p>
          </div>

          <div style={{ background: 'rgba(255,255,255,0.03)', padding: '14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
            <h3 style={{ fontSize: '14px', color: '#1ed760', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>Step 4:</span> Paste into App Settings & Connect
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '10px' }}>
              Paste your Client ID and Client Secret in this app's Settings modal, then click "Connect Spotify".
            </p>
            <button
              className="btn btn-primary"
              onClick={() => {
                onClose();
                onOpenSettings();
              }}
              style={{ fontSize: '12px', padding: '6px 14px' }}
            >
              Open App Settings
            </button>
          </div>
        </div>

        <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end' }}>
          <button className="btn btn-secondary" onClick={onClose}>
            Got it, Close
          </button>
        </div>
      </div>
    </div>
  );
}
