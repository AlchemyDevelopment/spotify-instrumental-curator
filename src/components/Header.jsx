import React from 'react';
import { Music2, Sliders, HelpCircle, LogIn, LogOut, CheckCircle2 } from 'lucide-react';

export function Header({ user, onLogin, onLogout, onOpenSettings, onOpenGuide, hasConfig }) {
  return (
    <header className="glass-panel" style={{ padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <div style={{
          width: '44px',
          height: '44px',
          borderRadius: '12px',
          background: 'linear-gradient(135deg, #1DB954 0%, #00d2ff 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 16px rgba(29, 185, 84, 0.4)'
        }}>
          <Music2 size={24} color="#000000" strokeWidth={2.5} />
        </div>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h1 style={{ fontSize: '20px', fontWeight: '800', background: 'linear-gradient(90deg, #ffffff 40%, #1ed760 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Instrumental Curator
            </h1>
            <span className="badge badge-tag" style={{ fontSize: '10px' }}>Spotify Pro</span>
          </div>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
            Automatically find, filter & sync instrumental tracks from playlists & listening history
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <button
          className="btn btn-secondary"
          onClick={onOpenGuide}
          title="Spotify Setup Guide"
          style={{ padding: '8px 14px', fontSize: '13px' }}
        >
          <HelpCircle size={16} />
          <span>Setup Guide</span>
        </button>

        <button
          className="btn btn-secondary"
          onClick={onOpenSettings}
          title="API & Filter Settings"
          style={{ padding: '8px 14px', fontSize: '13px' }}
        >
          <Sliders size={16} />
          <span>Settings</span>
        </button>

        {user ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(255,255,255,0.06)', padding: '6px 12px', borderRadius: 'var(--radius-full)', border: '1px solid var(--border-subtle)' }}>
            {user.images?.[0]?.url ? (
              <img
                src={user.images[0].url}
                alt={user.display_name}
                style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover' }}
              />
            ) : (
              <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'var(--spotify-green)', color: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', fontSize: '12px' }}>
                {user.display_name?.[0]?.toUpperCase() || 'U'}
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '13px', fontWeight: '600' }}>{user.display_name}</span>
              <span style={{ fontSize: '10px', color: '#1ed760', display: 'flex', alignItems: 'center', gap: '3px' }}>
                <CheckCircle2 size={10} /> Connected
              </span>
            </div>
            <button
              className="btn btn-ghost"
              onClick={onLogout}
              title="Disconnect Spotify"
              style={{ padding: '4px', marginLeft: '4px' }}
            >
              <LogOut size={16} color="var(--text-muted)" />
            </button>
          </div>
        ) : (
          <button
            className="btn btn-primary"
            onClick={onLogin}
            style={{ padding: '9px 18px' }}
          >
            <LogIn size={16} />
            <span>Connect Spotify</span>
          </button>
        )}
      </div>
    </header>
  );
}
