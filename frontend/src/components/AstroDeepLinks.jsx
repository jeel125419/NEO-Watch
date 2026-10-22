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

/**
 * Extract clean slug for TheSkyLive (e.g. "geographos-info" or "2000sg8-info")
 */
function getTheSkyLiveUrl(name, refId) {
  if (!name) return `https://theskylive.com/`;

  // Check for named asteroid e.g. "1620 Geographos (1951 RA)" -> "geographos-info"
  const namedMatch = name.match(/\d+\s+([A-Za-z]+)/);
  if (namedMatch && namedMatch[1] && namedMatch[1].length > 2) {
    return `https://theskylive.com/${namedMatch[1].toLowerCase()}-info`;
  }

  // Check for provisional designation e.g. "(2000 SG8)" -> "2000sg8-info"
  const provMatch = name.match(/(\d{4}\s*[A-Za-z0-9]+)/);
  if (provMatch && provMatch[1]) {
    const cleanProv = provMatch[1].replace(/[\s\(\)]/g, '').toLowerCase();
    return `https://theskylive.com/${cleanProv}-info`;
  }

  // Clean fallback
  const fallback = name.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
  return `https://theskylive.com/${fallback}-info`;
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

  // 1. NASA JPL 3D Interactive Orbit Viewer (100% works for EVERY asteroid via SPK-ID & view=VOP)
  const nasaJpl3DUrl = `https://ssd.jpl.nasa.gov/tools/sbdb_lookup.html#/?sstr=${encodeURIComponent(refId || cleanName)}&view=VOP`;

  // 2. Aladin Lite (Official ESA / CDS Strasbourg observatory optical deep-sky survey centered on exact RA/Dec coordinates)
  let aladinUrl = 'https://aladin.cds.unistra.fr/AladinLite/';
  if (raVal !== undefined && decVal !== undefined && !isNaN(raVal) && !isNaN(decVal)) {
    aladinUrl = `https://aladin.cds.unistra.fr/AladinLite/?target=${encodeURIComponent(`${Number(raVal).toFixed(4)} ${Number(decVal).toFixed(4)}`)}&fov=1.5&survey=P%2FDSS2%2Fcolor`;
  } else {
    aladinUrl = `https://aladin.cds.unistra.fr/AladinLite/?target=${encodeURIComponent(cleanName)}&fov=1.5`;
  }

  // 3. IAU Minor Planet Center (Official global small-body registry & ephemeris)
  const mpcUrl = `https://www.minorplanetcenter.net/db_search/show_object?object_id=${encodeURIComponent(refId || cleanName)}`;

  // 4. TheSkyLive direct object tracker
  const theSkyLiveUrl = getTheSkyLiveUrl(neo.name, refId);

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
          <span>🚀 Open in External Astronomy Tools:</span>
        </div>
        <div className="astro-links-pill-row">
          <a
            href={nasaJpl3DUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="astro-pill-btn nasa-eyes"
            title="Launch NASA JPL official 3D Interactive Orbit Viewer for this exact asteroid"
            onClick={(e) => e.stopPropagation()}
          >
            <span>🛰️ NASA 3D Orbit</span>
          </a>
          <a
            href={aladinUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="astro-pill-btn sky-map"
            title="Open Aladin Lite (ESA/CDS) telescope optical survey centered at this asteroid's RA/Dec"
            onClick={(e) => e.stopPropagation()}
          >
            <span>🗺️ Aladin Sky Survey</span>
          </a>
          <a
            href={theSkyLiveUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="astro-pill-btn the-skylive"
            title="Open live observation guide on TheSkyLive"
            onClick={(e) => e.stopPropagation()}
          >
            <span>🔭 TheSkyLive</span>
          </a>
          <a
            href={mpcUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="astro-pill-btn mpc-link"
            title="Open official International Astronomical Union (IAU) Minor Planet Center record"
            onClick={(e) => e.stopPropagation()}
          >
            <span>🪐 IAU Minor Planet Center</span>
          </a>
          <button
            type="button"
            className={`astro-pill-btn goto-copy ${copied ? 'copied' : ''}`}
            onClick={handleCopyGoTo}
            title="Copy Right Ascension, Declination, and Alt/Az for telescope GoTo mounts"
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
              Inspect this object's exact trajectory in NASA's 3D orbit viewer, optical sky surveys, or computerized telescope software.
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
          href={nasaJpl3DUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="astro-tool-tile nasa-eyes"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="tile-top">
            <span className="tile-icon">🛰️</span>
            <span className="tile-name">NASA JPL 3D Orbit Viewer</span>
            <span className="tile-ext">↗</span>
          </div>
          <p className="tile-desc">
            Official NASA JPL interactive 3D solar system simulator showing this asteroid's exact 3D orbit around the Sun and Earth.
          </p>
        </a>

        <a
          href={aladinUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="astro-tool-tile sky-map"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="tile-top">
            <span className="tile-icon">🗺️</span>
            <span className="tile-name">Aladin Lite (ESA / CDS)</span>
            <span className="tile-ext">↗</span>
          </div>
          <p className="tile-desc">
            Professional optical telescope sky survey centered directly on this asteroid's exact Right Ascension & Declination.
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
            <span className="tile-name">TheSkyLive Observation Guide</span>
            <span className="tile-ext">↗</span>
          </div>
          <p className="tile-desc">
            Live asteroid tracker, star charts, optical brightness magnitude, and finder guide.
          </p>
        </a>

        <a
          href={mpcUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="astro-tool-tile mpc-tile"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="tile-top">
            <span className="tile-icon">🪐</span>
            <span className="tile-name">IAU Minor Planet Center</span>
            <span className="tile-ext">↗</span>
          </div>
          <p className="tile-desc">
            Official International Astronomical Union repository for orbital solutions, discovery records, and radar ephemeris.
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
