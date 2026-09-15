import React, { useState, useEffect } from 'react';
import { X, Save, Key, ShieldCheck, Sliders, ExternalLink } from 'lucide-react';

export function SettingsModal({ isOpen, onClose, onSave, currentConfig }) {
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [redirectUri, setRedirectUri] = useState('http://127.0.0.1:5173/callback');
  const [threshold, setThreshold] = useState(0.5);
  const [checkLyrics, setCheckLyrics] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    if (currentConfig) {
      setRedirectUri(currentConfig.redirectUri || 'http://127.0.0.1:5173/callback');
      setThreshold(currentConfig.instrumentalThreshold !== undefined ? currentConfig.instrumentalThreshold : 0.5);
      if (currentConfig.clientId) setClientId(currentConfig.clientId);
    }
  }, [currentConfig]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMsg('');
    try {
      await onSave({
        clientId: clientId.trim(),
        clientSecret: clientSecret.trim(),
        redirectUri: redirectUri.trim(),
        instrumentalThreshold: Number(threshold),
        checkLyrics
      });
      setMsg('Settings saved successfully!');
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err) {
      setMsg('Error saving settings: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Sliders size={22} color="var(--spotify-green)" />
            <h2 style={{ fontSize: '18px' }}>App & Spotify Configuration</h2>
          </div>
          <button className="btn btn-ghost" onClick={onClose} style={{ padding: '6px' }}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>
              Spotify Client ID
            </label>
            <input
              type="text"
              className="input-text"
              placeholder="e.g. 8a3f892b4982..."
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              required
            />
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginTop: '4px' }}>
              Obtain from your Spotify Developer Dashboard.
            </span>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>
              Spotify Client Secret
            </label>
            <input
              type="password"
              className="input-text"
              placeholder={currentConfig?.hasClientSecret ? '•••••••••••••••• (saved)' : 'Enter Client Secret'}
              value={clientSecret}
              onChange={(e) => setClientSecret(e.target.value)}
            />
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginTop: '4px' }}>
              Kept locally on your machine in server/config.json.
            </span>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>
              Redirect URI (Must match Spotify Dashboard)
            </label>
            <input
              type="text"
              className="input-text"
              value={redirectUri}
              onChange={(e) => setRedirectUri(e.target.value)}
              required
            />
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginTop: '4px' }}>
              Add <code>{redirectUri}</code> under Redirect URIs in your Spotify Developer App settings.
            </span>
          </div>

          <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <label style={{ fontSize: '13px', fontWeight: '600' }}>
                Instrumental Confidence Threshold: {Math.round(threshold * 100)}%
              </label>
              <span className="badge badge-tag" style={{ fontSize: '11px' }}>
                {threshold >= 0.7 ? 'Strict' : threshold >= 0.4 ? 'Balanced (Recommended)' : 'Permissive'}
              </span>
            </div>
            <input
              type="range"
              min="0.1"
              max="0.95"
              step="0.05"
              value={threshold}
              onChange={(e) => setThreshold(parseFloat(e.target.value))}
              style={{ width: '100%', accentColor: 'var(--spotify-green)', cursor: 'pointer' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
              <span>More songs (10%)</span>
              <span>Balanced (50%)</span>
              <span>Pure Instrumentals only (90%)</span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <input
              type="checkbox"
              id="checkLyrics"
              checked={checkLyrics}
              onChange={(e) => setCheckLyrics(e.target.checked)}
              style={{ accentColor: 'var(--spotify-green)', width: '18px', height: '18px', cursor: 'pointer' }}
            />
            <label htmlFor="checkLyrics" style={{ fontSize: '13px', cursor: 'pointer' }}>
              Enable intelligent multi-source lyrics & metadata heuristic checks (Highly recommended)
            </label>
          </div>

          {msg && (
            <div style={{ padding: '10px 14px', borderRadius: 'var(--radius-sm)', background: msg.includes('Error') ? 'rgba(244,63,94,0.15)' : 'rgba(29,185,84,0.15)', color: msg.includes('Error') ? '#f87171' : '#1ed760', fontSize: '13px' }}>
              {msg}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '10px' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              <Save size={16} />
              <span>{saving ? 'Saving...' : 'Save Settings'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
