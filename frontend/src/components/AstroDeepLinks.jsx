import React, { useState } from 'react';

/**
 * Helper to convert Right Ascension from degrees to standard astronomical HHh MMm SSs
 */
function degToRA(raDeg) {
  if (raDeg === undefined || raDeg === null || isNaN(raDeg)) return null;
  let deg = ((raDeg % 360) + 360) % 360;
  const totalHours = deg / 15.0;
  const h = Math.floor(totalHours);
  const totalMinutes = (totalHours - h) * 60;
  const m = Math.floor(totalMinutes);
  const s = Math.round((totalMinutes - m) * 60);
  return `${String(h).padStart(2, '0')}h ${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`;
}

/**
 * Helper to convert Declination from degrees to standard astronomical ±DD° MM' SS"
 */
function degToDec(decDeg) {
  if (decDeg === undefined || decDeg === null || isNaN(decDeg)) return null;
  const sign = decDeg >= 0 ? '+' : '-';
  const abs = Math.abs(decDeg);
  const d = Math.floor(abs);
  const totalMinutes = (abs - d) * 60;
  const m = Math.floor(totalMinutes);
  const s = Math.round((totalMinutes - m) * 60);
  return `${sign}${String(d).padStart(2, '0')}° ${String(m).padStart(2, '0')}' ${String(s).padStart(2, '0')}"`;
}

export default function AstroDeepLinks({ neo, coordinates = {}, compact = false }) {
  const [copied, setCopied] = useState(false);

  if (!neo) return null;

  // Extract clean target identifiers
  const cleanName = neo.name ? neo.name.replace(/[()]/g, '').trim() : `Asteroid ${neo.id || ''}`;
  const refId = neo.neo_reference_id ? String(neo.neo_reference_id).trim() : null;

  // Resolve celestial angles (RA & Dec)
  const raVal = coordinates.ra_deg !== undefined ? coordinates.ra_deg : neo.ra_deg;
  const decVal = coordinates.dec_deg !== undefined ? coordinates.dec_deg : neo.dec_deg;

  // Resolve local horizon angles (Altitude & Azimuth)
  const altVal = coordinates.altitude_deg !== undefined ? coordinates.altitude_deg : neo.peak_altitude_deg;
  const azVal = coordinates.azimuth_deg !== undefined ? coordinates.azimuth_deg : neo.peak_azimuth_deg;

  const formattedRA = degToRA(raVal);
  const formattedDec = degToDec(decVal);

  // 1. NASA Eyes on Asteroids (Direct 3D solar system flight link)
  const nasaEyesUrl = refId
    ? `https://eyes.nasa.gov/apps/asteroids/#/asteroids/${encodeURIComponent(refId)}`
    : `https://eyes.nasa.gov/apps/asteroids/#/asteroids/${encodeURIComponent(cleanName.toLowerCase().replace(/\s+/g, '_'))}`;

  // 2. Sky-Map.org (Deep sky optical survey centered on exact RA/Dec)
  let skyMapUrl = 'http://www.sky-map.org/';
  if (raVal !== undefined && decVal !== undefined && !isNaN(raVal) && !isNaN(decVal)) {
    const raHours = (((raVal % 360) + 360) % 360 / 15.0).toFixed(4);
    const decAngle = Number(decVal).toFixed(4);
    skyMapUrl = `http://www.sky-map.org/?ra=${raHours}&de=${decAngle}&zoom=7&show_box=1`;
  } else {
    skyMapUrl = `http://www.sky-map.org/?search=${encodeURIComponent(cleanName)}`;
  }

  // 3. TheSkyLive Asteroid Guide
  const theSkyLiveUrl = `https://theskylive.com/search?q=${encodeURIComponent(cleanName || refId)}`;

  // 4. Stellarium Web
  const stellariumUrl = `https://stellarium-web.org/skysource/${encodeURIComponent(cleanName)}`;

  // Copy GoTo Coordinates
  const handleCopyGoTo = async (e) => {
    e.stopPropagation();
    const parts = [`Target: ${neo.name || cleanName}`];
    if (refId) parts.push(`NASA Ref: ${refId}`);
    if (formattedRA) parts.push(`RA: ${formattedRA}`);
    if (formattedDec) parts.push(`Dec: ${formattedDec}`);
    if (altVal !== undefined && altVal !== null) parts.push(`Alt: ${altVal}°`);
    if (azVal !== undefined && azVal !== null) parts.push(`Az: ${azVal}°`);

    const coordinateString = parts.join(' | ');

    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(coordinateString);
      } else {
        // Fallback for older browsers
        const el = document.createElement('textarea');
        el.value = coordinateString;
        document.body.appendChild(el);
        el.select();
        document.execCommand('copy');
        document.body.removeChild(el);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2600);
    } catch (err) {
      console.warn('Clipboard copy failed:', err);
    }
  };

  if (compact) {
    return (
      <div className="astro-links-compact">
        <div className="astro-links-label">
          <span>🚀 External Astronomy Apps:</span>
        </div>
        <div className="astro-links-pill-row">
          <a
            href={nasaEyesUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="astro-pill-btn nasa-eyes"
            title="Launch official NASA Eyes on Asteroids 3D orbit simulation"
            onClick={(e) => e.stopPropagation()}
          >
            <span>🛰️ NASA Eyes 3D</span>
          </a>
          <a
            href={skyMapUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="astro-pill-btn sky-map"
            title="View deep space telescope survey at these exact celestial coordinates"
            onClick={(e) => e.stopPropagation()}
          >
            <span>🗺️ Sky-Map (RA/Dec)</span>
          </a>
          <a
            href={theSkyLiveUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="astro-pill-btn the-skylive"
            title="Open real-time finder chart and live brightness on TheSkyLive"
            onClick={(e) => e.stopPropagation()}
          >
            <span>🔭 TheSkyLive</span>
          </a>
          <button
            type="button"
            className={`astro-pill-btn goto-copy ${copied ? 'copied' : ''}`}
            onClick={handleCopyGoTo}
            title="Copy Right Ascension, Declination, and Alt/Az for telescope mounts"
          >
            <span>{copied ? '✅ GoTo Coords Copied!' : '📋 Copy Telescope GoTo'}</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="astro-links-card">
      <div className="astro-links-header">
        <div className="astro-title-wrap">
          <span className="astro-icon">🌌</span>
          <div>
            <h4 className="astro-title">External Astronomy Apps & Telescope Mounts</h4>
            <p className="astro-subtitle">
              Inspect this object's exact trajectory in 3D solar system simulators, online sky surveys, or your GoTo telescope.
            </p>
          </div>
        </div>
        {formattedRA && formattedDec && (
          <div className="astro-coords-badge" title="J2000 Celestial Equatorial Coordinates">
            <span>RA {formattedRA}</span>
            <span className="coord-dot">•</span>
            <span>Dec {formattedDec}</span>
          </div>
        )}
      </div>

      <div className="astro-links-grid">
        <a
          href={nasaEyesUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="astro-tool-tile nasa-eyes"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="tile-top">
            <span className="tile-icon">🛰️</span>
            <span className="tile-name">NASA Eyes on Asteroids</span>
            <span className="tile-ext">↗</span>
          </div>
          <p className="tile-desc">
            Official JPL interactive 3D solar system simulator showing real-time orbit & flyby distance from Earth.
          </p>
        </a>

        <a
          href={skyMapUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="astro-tool-tile sky-map"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="tile-top">
            <span className="tile-icon">🗺️</span>
            <span className="tile-name">Sky-Map.org Survey</span>
            <span className="tile-ext">↗</span>
          </div>
          <p className="tile-desc">
            Direct deep-space optical survey centered precisely at this asteroid's RA/Dec position in the stars.
          </p>
        </a>

        <a
          href={theSkyLiveUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="astro-tool-tile the-skylive"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="tile-top">
            <span className="tile-icon">🔭</span>
            <span className="tile-name">TheSkyLive Tracker</span>
            <span className="tile-ext">↗</span>
          </div>
          <p className="tile-desc">
            Live star chart finder, apparent magnitude, ephemeris tables, and telescope pointing guide.
          </p>
        </a>

        <a
          href={stellariumUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="astro-tool-tile stellarium"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="tile-top">
            <span className="tile-icon">✨</span>
            <span className="tile-name">Stellarium Web</span>
            <span className="tile-ext">↗</span>
          </div>
          <p className="tile-desc">
            Web planetarium showing realistic night sky, constellation outlines, and telescope field of view.
          </p>
        </a>
      </div>

      {/* Copy Telescope GoTo Action Bar */}
      <div className="astro-goto-bar">
        <div className="goto-info">
          <span className="goto-tag">🔭 GoTo Mounts</span>
          <span className="goto-coords-preview">
            {formattedRA && formattedDec
              ? `${formattedRA}, ${formattedDec} (Alt: ${altVal !== undefined ? altVal : 'N/A'}°, Az: ${azVal !== undefined ? azVal : 'N/A'}°)`
              : `Target: ${cleanName} | NASA Ref: ${refId || 'N/A'}`}
          </span>
        </div>
        <button
          type="button"
          className={`goto-copy-btn ${copied ? 'copied' : ''}`}
          onClick={handleCopyGoTo}
        >
          <span>{copied ? '✅ Coordinates Copied to Clipboard!' : '📋 Copy GoTo Ephemeris'}</span>
        </button>
      </div>
    </div>
  );
}
