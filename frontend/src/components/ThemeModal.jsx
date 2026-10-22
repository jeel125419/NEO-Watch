import React from 'react';

export const THEMES = [
  {
    id: 'deep-space',
    name: 'Cosmic Deep Space',
    badge: 'Default',
    icon: '🌌',
    description: 'Sleek dark obsidian with indigo nebulae, cyan accents, and modern glassmorphism.',
    colors: ['#070a12', '#0e1424', '#6366f1', '#06b6d4', '#10b981'],
    accent: '#6366f1'
  },
  {
    id: 'mission-control',
    name: 'NASA Mission Control',
    badge: 'Aerospace HUD',
    icon: '🛰️',
    description: 'Tactical aerospace telemetry HUD with deep slate, phosphor cyan, and amber telemetry alerts.',
    colors: ['#04080e', '#0a111a', '#0284c7', '#38bdf8', '#f59e0b'],
    accent: '#38bdf8'
  },
  {
    id: 'cyber-nebula',
    name: 'Cyber Nebula',
    badge: 'Synthwave',
    icon: '⚡',
    description: 'Electric cosmic synthwave aesthetic with deep violet shadows, neon magenta glows, and hyper purple accents.',
    colors: ['#080414', '#100824', '#9333ea', '#ec4899', '#06b6d4'],
    accent: '#ec4899'
  },
  {
    id: 'night-vision',
    name: 'Stargazer Night-Vision',
    badge: 'Field Astronomy',
    icon: '🔴',
    description: 'Dark-adapted monochromatic red. Designed to protect human rod-cell night vision at real backyard telescope sessions.',
    colors: ['#050002', '#120205', '#dc2626', '#fb7185', '#ff0000'],
    accent: '#ef4444'
  },
  {
    id: 'solar-flare',
    name: 'Solar Flare',
    badge: 'High-Tech Solar',
    icon: '☀️',
    description: 'Inspired by Parker Solar Probe telemetry with burnished bronze, amber flares, and warm radiant gold.',
    colors: ['#0a0703', '#140e06', '#d97706', '#f59e0b', '#fbbf24'],
    accent: '#f59e0b'
  }
];

export default function ThemeModal({ isOpen, onClose, currentTheme, onSelectTheme }) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div
        className="modal-content theme-modal-card"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '680px' }}
      >
        <div className="modal-header">
          <div className="modal-title-group">
            <div className="modal-title-row">
              <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <span>🎨</span> Choose UI Theme & Template
              </h2>
            </div>
            <span className="neo-ref-id">
              Select your favorite aesthetic. Changes take effect instantly across all catalog, sky map, and observation views.
            </span>
          </div>
          <button
            className="modal-close-btn"
            onClick={onClose}
            aria-label="Close theme modal"
          >
            &times;
          </button>
        </div>

        <div className="modal-body" style={{ padding: '1.25rem 1.5rem 1.5rem' }}>
          <div className="theme-options-grid">
            {THEMES.map((theme) => {
              const isSelected = currentTheme === theme.id;
              return (
                <div
                  key={theme.id}
                  className={`theme-card-option ${isSelected ? 'selected' : ''}`}
                  onClick={() => onSelectTheme(theme.id)}
                  style={{
                    borderLeftColor: isSelected ? theme.accent : undefined
                  }}
                >
                  <div className="theme-card-header">
                    <div className="theme-card-title-row">
                      <span className="theme-icon">{theme.icon}</span>
                      <strong className="theme-name">{theme.name}</strong>
                      <span className="theme-badge-pill" style={{ color: theme.accent, borderColor: `${theme.accent}55` }}>
                        {theme.badge}
                      </span>
                    </div>
                    {isSelected && (
                      <span className="theme-active-tag" style={{ background: theme.accent }}>
                        Active ✓
                      </span>
                    )}
                  </div>

                  <p className="theme-desc">{theme.description}</p>

                  <div className="theme-swatch-strip">
                    <span className="swatch-label">Palette:</span>
                    <div className="swatches-row">
                      {theme.colors.map((c, i) => (
                        <span
                          key={i}
                          className="theme-color-dot"
                          style={{ backgroundColor: c, borderColor: i === 0 ? 'rgba(255,255,255,0.2)' : 'transparent' }}
                          title={c}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="theme-modal-footer">
            <span className="theme-hint-text">
              💡 Your theme choice is saved automatically in your browser.
            </span>
            <button
              type="button"
              className="page-btn active-theme-confirm-btn"
              onClick={onClose}
            >
              Done / Keep Selected
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
