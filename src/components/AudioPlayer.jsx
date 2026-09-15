import React, { useRef, useEffect, useState } from 'react';
import { Play, Pause, Volume2, VolumeX, X, ExternalLink } from 'lucide-react';

export function AudioPlayer({ currentTrack, onClose }) {
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [progress, setProgress] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
      audioRef.current.play().catch(e => console.log('Audio autoplay prevented:', e));
      setIsPlaying(true);
    }
  }, [currentTrack]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current && audioRef.current.duration) {
      setProgress((audioRef.current.currentTime / audioRef.current.duration) * 100);
    }
  };

  const handleEnded = () => {
    setIsPlaying(false);
    setProgress(0);
  };

  if (!currentTrack || !currentTrack.preview_url) return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: '20px',
      left: '50%',
      transform: 'translateX(-50%)',
      width: '90%',
      maxWidth: '640px',
      background: 'rgba(17, 23, 36, 0.95)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      border: '1px solid rgba(29, 185, 84, 0.4)',
      borderRadius: 'var(--radius-xl)',
      padding: '12px 20px',
      boxShadow: '0 10px 30px rgba(0, 0, 0, 0.7), 0 0 20px rgba(29, 185, 84, 0.2)',
      display: 'flex',
      alignItems: 'center',
      gap: '16px',
      zIndex: 900,
      animation: 'slideUp 0.25s ease-out'
    }}>
      <audio
        ref={audioRef}
        src={currentTrack.preview_url}
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleEnded}
      />

      {/* Album cover */}
      <img
        src={currentTrack.albumArt}
        alt={currentTrack.name}
        style={{ width: '42px', height: '42px', borderRadius: '8px', objectFit: 'cover' }}
      />

      {/* Track info & Progress */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
          <div style={{ fontSize: '13px', fontWeight: '700', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {currentTrack.name}
          </div>
          <span className="badge badge-tag" style={{ fontSize: '9px', padding: '2px 6px' }}>30s Preview</span>
        </div>
        <div style={{ fontSize: '11px', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: '6px' }}>
          {currentTrack.artists}
        </div>

        {/* Progress bar */}
        <div style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', overflow: 'hidden' }}>
          <div style={{ width: `${progress}%`, height: '100%', background: 'var(--spotify-green)', transition: 'width 0.1s linear' }} />
        </div>
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <button
          className="btn"
          onClick={togglePlay}
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            background: 'var(--spotify-green)',
            color: '#000',
            padding: 0
          }}
        >
          {isPlaying ? <Pause size={16} fill="#000" /> : <Play size={16} fill="#000" />}
        </button>

        <button
          className="btn btn-ghost"
          onClick={() => {
            if (audioRef.current) {
              audioRef.current.muted = !isMuted;
              setIsMuted(!isMuted);
            }
          }}
          style={{ padding: '6px' }}
        >
          {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
        </button>

        <button className="btn btn-ghost" onClick={onClose} style={{ padding: '6px' }}>
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
