import React, { useState, useEffect, useRef } from 'react';

const CITY_PRESETS = [
  { name: 'New Delhi, India', lat: 28.6139, lon: 77.2090 },
  { name: 'New York, USA', lat: 40.7128, lon: -74.0060 },
  { name: 'London, UK', lat: 51.5074, lon: -0.1278 },
  { name: 'Tokyo, Japan', lat: 35.6762, lon: 139.6503 },
  { name: 'Sydney, Australia', lat: -33.8688, lon: 151.2093 },
  { name: 'Atacama Desert, Chile', lat: -23.8634, lon: -69.1328 },
  { name: 'Mauna Kea, Hawaii', lat: 19.8206, lon: -155.4681 }
];

export default function SkyMap({ onSelectNeoDetail, watchlistIds, onToggleWatchlist }) {
  // Observer location & date
  const [lat, setLat] = useState(28.6139);
  const [lon, setLon] = useState(77.2090);
  const [locationName, setLocationName] = useState('New Delhi, India (Preset)');
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);

  // Data states
  const [skyData, setSkyData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedAsteroid, setSelectedAsteroid] = useState(null);
  const [hoveredAsteroid, setHoveredAsteroid] = useState(null);

  // Map view controls
  const [timeIndex, setTimeIndex] = useState(0); // Index into hourly timeline
  const [isPlaying, setIsPlaying] = useState(false);
  const [showTrajectories, setShowTrajectories] = useState(true);
  const [filterHazardousOnly, setFilterHazardousOnly] = useState(false);
  const [nightVisionMode, setNightVisionMode] = useState(false);

  const canvasRef = useRef(null);

  // Fetch sky data
  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({
      lat: lat.toString(),
      lon: lon.toString(),
      date: selectedDate,
      limit: '50'
    });

    fetch(`/api/visibility?${params.toString()}`)
      .then(res => {
        if (!res.ok) throw new Error('Failed to load sky map data');
        return res.json();
      })
      .then(data => {
        setSkyData(data);
        setLoading(false);
        // Find best peak time index for default view
        const firstVisible = (data.asteroids || []).find(a => a.is_visible && a.hourly_positions?.length > 0);
        if (firstVisible && firstVisible.hourly_positions.length > 0) {
          const darkIdx = firstVisible.hourly_positions.findIndex(p => p.is_dark && p.is_visible);
          setTimeIndex(darkIdx >= 0 ? darkIdx : Math.floor(firstVisible.hourly_positions.length / 2));
          setSelectedAsteroid(firstVisible);
        }
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, [lat, lon, selectedDate]);

  // Animation player for scrubbing time
  useEffect(() => {
    let interval = null;
    if (isPlaying && skyData) {
      const sampleCount = skyData.asteroids[0]?.hourly_positions?.length || 24;
      interval = setInterval(() => {
        setTimeIndex(prev => (prev + 1) % sampleCount);
      }, 700);
    }
    return () => clearInterval(interval);
  }, [isPlaying, skyData]);

  // Extract timeline length and current timestamp info
  const timelineSamples = skyData?.asteroids[0]?.hourly_positions || [];
  const currentSample = timelineSamples[timeIndex] || null;

  // Visible asteroids list filtered
  const visibleAsteroids = (skyData?.asteroids || []).filter(a => {
    if (!a.is_visible) return false;
    if (filterHazardousOnly && !a.is_potentially_hazardous) return false;
    return true;
  });

  // Convert (Altitude, Azimuth) to (X, Y) on Sky Dome
  const projectSkyCoordinates = (altDeg, azDeg, centerX, centerY, radius) => {
    // Altitude 90° is center (radius 0), 0° is horizon (full radius)
    const clampedAlt = Math.max(0, altDeg);
    const r = radius * ((90 - clampedAlt) / 90.0);
    const azRad = azDeg * (Math.PI / 180);

    // Standard planisphere projection (facing South, East is Left, North is Top)
    const x = centerX - r * Math.sin(azRad);
    const y = centerY - r * Math.cos(azRad);

    return { x, y, r };
  };

  // Render Sky Map on Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !skyData) return;

    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = (Math.min(width, height) / 2) - 35;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Base colors according to Night Vision Red Mode
    const colorBg = nightVisionMode ? '#140303' : '#070b16';
    const colorDomeBg = nightVisionMode ? '#220404' : '#0c1222';
    const colorBorder = nightVisionMode ? '#7f1d1d' : 'rgba(99, 102, 241, 0.4)';
    const colorGrid = nightVisionMode ? 'rgba(239, 68, 68, 0.15)' : 'rgba(255, 255, 255, 0.08)';
    const colorText = nightVisionMode ? '#ef4444' : '#94a3b8';
    const colorHazardous = nightVisionMode ? '#f87171' : '#f59e0b';
    const colorNormal = nightVisionMode ? '#ef4444' : '#06b6d4';

    // 1. Fill Sky Dome
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.fillStyle = colorDomeBg;
    ctx.fill();

    // 2. Altitude Rings
    // 0° (Horizon)
    ctx.lineWidth = 2;
    ctx.strokeStyle = colorBorder;
    ctx.stroke();

    // 15° (Minimum Unobstructed Observation Ring - Dashed)
    ctx.save();
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = nightVisionMode ? 'rgba(239, 68, 68, 0.4)' : 'rgba(16, 185, 129, 0.4)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius * (75 / 90), 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    // 30° and 60° Elevation Rings
    [30, 60].forEach(alt => {
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius * ((90 - alt) / 90), 0, Math.PI * 2);
      ctx.strokeStyle = colorGrid;
      ctx.lineWidth = 1;
      ctx.stroke();

      // Altitude label
      ctx.font = '10px "JetBrains Mono", monospace';
      ctx.fillStyle = colorText;
      ctx.fillText(`${alt}°`, centerX + 4, centerY - radius * ((90 - alt) / 90) + 12);
    });

    // 3. Compass Cardinal Crosshairs
    ctx.beginPath();
    ctx.moveTo(centerX, centerY - radius);
    ctx.lineTo(centerX, centerY + radius);
    ctx.moveTo(centerX - radius, centerY);
    ctx.lineTo(centerX + radius, centerY);
    ctx.strokeStyle = colorGrid;
    ctx.lineWidth = 1;
    ctx.stroke();

    // Cardinal Labels around perimeter
    const cardinals = [
      { text: 'N', az: 0 },
      { text: 'NE', az: 45 },
      { text: 'E', az: 90 },
      { text: 'SE', az: 135 },
      { text: 'S', az: 180 },
      { text: 'SW', az: 225 },
      { text: 'W', az: 270 },
      { text: 'NW', az: 315 }
    ];

    ctx.font = 'bold 12px "Outfit", sans-serif';
    ctx.fillStyle = nightVisionMode ? '#f87171' : '#f8fafc';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    cardinals.forEach(card => {
      const labelRad = (card.az) * (Math.PI / 180);
      const lx = centerX - (radius + 20) * Math.sin(labelRad);
      const ly = centerY - (radius + 20) * Math.cos(labelRad);
      ctx.fillText(card.text, lx, ly);
    });

    // Zenith marker
    ctx.beginPath();
    ctx.arc(centerX, centerY, 3, 0, Math.PI * 2);
    ctx.fillStyle = nightVisionMode ? '#ef4444' : '#6366f1';
    ctx.fill();
    ctx.font = '10px sans-serif';
    ctx.fillText('Zenith (90°)', centerX, centerY - 8);

    // 4. Render Moon Position
    const moon = skyData.sky_conditions.moon;
    const moonAlt = moon.current_altitude_deg || 20;
    const moonAz = 180; // approximate azimuth
    if (moonAlt >= 0) {
      const mPos = projectSkyCoordinates(moonAlt, moonAz, centerX, centerY, radius);

      // Moon glow
      ctx.beginPath();
      ctx.arc(mPos.x, mPos.y, 14, 0, Math.PI * 2);
      ctx.fillStyle = nightVisionMode ? 'rgba(239, 68, 68, 0.15)' : 'rgba(245, 158, 11, 0.2)';
      ctx.fill();

      // Moon body
      ctx.beginPath();
      ctx.arc(mPos.x, mPos.y, 8, 0, Math.PI * 2);
      ctx.fillStyle = nightVisionMode ? '#ef4444' : '#fef08a';
      ctx.fill();

      // Moon label
      ctx.font = '11px "Inter", sans-serif';
      ctx.fillStyle = nightVisionMode ? '#fca5a5' : '#fef08a';
      ctx.textAlign = 'left';
      ctx.fillText(`${moon.phase_icon} Moon (${moon.illumination_pct}%)`, mPos.x + 12, mPos.y + 3);
    }

    // 5. Render Asteroid Trajectories
    if (showTrajectories) {
      visibleAsteroids.forEach(ast => {
        const points = ast.hourly_positions || [];
        if (points.length < 2) return;

        ctx.beginPath();
        let started = false;

        points.forEach(pt => {
          if (pt.altitude_deg >= 0) {
            const pos = projectSkyCoordinates(pt.altitude_deg, pt.azimuth_deg, centerX, centerY, radius);
            if (!started) {
              ctx.moveTo(pos.x, pos.y);
              started = true;
            } else {
              ctx.lineTo(pos.x, pos.y);
            }
          }
        });

        const isTargeted = selectedAsteroid && selectedAsteroid.id === ast.id;
        ctx.strokeStyle = isTargeted
          ? (nightVisionMode ? '#f87171' : '#38bdf8')
          : (nightVisionMode ? 'rgba(239, 68, 68, 0.25)' : 'rgba(99, 102, 241, 0.25)');
        ctx.lineWidth = isTargeted ? 2.5 : 1;
        ctx.stroke();
      });
    }

    // 6. Render Asteroids at Current Time Index
    visibleAsteroids.forEach(ast => {
      const pt = (ast.hourly_positions && ast.hourly_positions[timeIndex])
        ? ast.hourly_positions[timeIndex]
        : { altitude_deg: ast.peak_altitude_deg, azimuth_deg: ast.peak_azimuth_deg, is_visible: true };

      if (pt.altitude_deg < 0) return; // below horizon

      const pos = projectSkyCoordinates(pt.altitude_deg, pt.azimuth_deg, centerX, centerY, radius);
      const isSelected = selectedAsteroid && selectedAsteroid.id === ast.id;
      const isHovered = hoveredAsteroid && hoveredAsteroid.id === ast.id;
      const isHazard = ast.is_potentially_hazardous;

      const markerColor = isHazard ? colorHazardous : colorNormal;

      // Glow halo if selected or hovered
      if (isSelected || isHovered) {
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, 16, 0, Math.PI * 2);
        ctx.fillStyle = isHazard
          ? (nightVisionMode ? 'rgba(248, 113, 113, 0.3)' : 'rgba(245, 158, 11, 0.3)')
          : (nightVisionMode ? 'rgba(239, 68, 68, 0.3)' : 'rgba(6, 182, 212, 0.3)');
        ctx.fill();

        // Crosshair reticle
        ctx.strokeStyle = markerColor;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      // Center asteroid beacon
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, isSelected ? 6 : 4.5, 0, Math.PI * 2);
      ctx.fillStyle = markerColor;
      ctx.fill();

      // Asteroid label
      ctx.font = isSelected ? 'bold 11px "Inter", sans-serif' : '10px "Inter", sans-serif';
      ctx.fillStyle = isSelected ? '#ffffff' : (nightVisionMode ? '#fca5a5' : '#e2e8f0');
      ctx.textAlign = 'left';
      ctx.fillText(ast.name.split(' ')[0], pos.x + 8, pos.y - 4);
    });
  }, [skyData, timeIndex, selectedAsteroid, hoveredAsteroid, showTrajectories, filterHazardousOnly, nightVisionMode]);

  // Handle Canvas Click to select an asteroid
  const handleCanvasClick = (e) => {
    const canvas = canvasRef.current;
    if (!canvas || !skyData) return;

    const rect = canvas.getBoundingClientRect();
    const clickX = (e.clientX - rect.left) * (canvas.width / rect.width);
    const clickY = (e.clientY - rect.top) * (canvas.height / rect.height);

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = (Math.min(canvas.width, canvas.height) / 2) - 35;

    let clicked = null;
    let minDistance = 22; // click radius threshold in px

    visibleAsteroids.forEach(ast => {
      const pt = (ast.hourly_positions && ast.hourly_positions[timeIndex])
        ? ast.hourly_positions[timeIndex]
        : { altitude_deg: ast.peak_altitude_deg, azimuth_deg: ast.peak_azimuth_deg };

      if (pt.altitude_deg >= 0) {
        const pos = projectSkyCoordinates(pt.altitude_deg, pt.azimuth_deg, centerX, centerY, radius);
        const dist = Math.hypot(clickX - pos.x, clickY - pos.y);
        if (dist < minDistance) {
          minDistance = dist;
          clicked = ast;
        }
      }
    });

    if (clicked) {
      setSelectedAsteroid(clicked);
    }
  };

  return (
    <div className={`skymap-container ${nightVisionMode ? 'night-vision' : ''}`} id="sky-map-view">
      {/* Intro Header */}
      <section className="skymap-intro-banner">
        <div className="skymap-intro-text">
          <h2>🌌 Interactive Celestial Sky Dome (Phase 6)</h2>
          <p>
            Real-time horizontal planisphere projection centered on your local Zenith. Displays all Near-Earth Objects currently above the horizon tonight, with live celestial tracking and observation windows.
          </p>
        </div>

        {/* Night Vision Mode Toggle */}
        <div className="skymap-header-actions">
          <button
            id="toggle-night-vision-btn"
            type="button"
            className={`night-vision-toggle ${nightVisionMode ? 'active' : ''}`}
            onClick={() => setNightVisionMode(!nightVisionMode)}
            title="Red-light astronomy mode preserves dark-adapted night vision"
          >
            {nightVisionMode ? '🔴 Night Vision: ON' : '⚪ Night Vision: OFF'}
          </button>
        </div>
      </section>

      {/* Location Bar */}
      <section className="skymap-location-strip">
        <div className="skymap-loc-preset">
          <label htmlFor="skymap-city-preset">Observer Location</label>
          <select
            id="skymap-city-preset"
            className="filter-select"
            value={locationName.includes('Preset') ? locationName.replace(' (Preset)', '') : ''}
            onChange={(e) => {
              const p = CITY_PRESETS.find(city => city.name === e.target.value);
              if (p) {
                setLat(p.lat);
                setLon(p.lon);
                setLocationName(`${p.name} (Preset)`);
              }
            }}
          >
            {CITY_PRESETS.map(city => (
              <option key={city.name} value={city.name}>{city.name}</option>
            ))}
          </select>
        </div>

        <div className="skymap-loc-details">
          <span>Coordinates: <strong>{lat}° N, {lon}° E</strong></span>
          <span>Observation Night: <strong>{selectedDate}</strong></span>
          <span>Visible Targets: <strong>{visibleAsteroids.length} overhead</strong></span>
        </div>
      </section>

      {/* Main Sky Dome & Target Sidebar */}
      {loading ? (
        <div className="loading-box">
          <div className="spinner" />
          <p>Projecting celestial dome & orbital coordinates...</p>
        </div>
      ) : (
        <div className="skymap-main-grid">
          {/* Left Canvas Dome */}
          <div className="skymap-canvas-wrapper">
            <div className="skymap-time-scrubber-card">
              <div className="scrubber-top-info">
                <div className="scrubber-clock">
                  <span className="clock-icon">🕒</span>
                  <span className="clock-time">
                    {currentSample ? currentSample.time_formatted : '22:00'} Local Sky
                  </span>
                  <span className="clock-badge">
                    {currentSample?.is_dark ? '🌌 True Dark Sky' : '🌅 Twilight'}
                  </span>
                </div>

                <div className="scrubber-controls">
                  <button
                    type="button"
                    className="skymap-play-btn"
                    onClick={() => setIsPlaying(!isPlaying)}
                  >
                    {isPlaying ? '⏸ Pause' : '▶ Animate Night'}
                  </button>
                  <label className="skymap-checkbox-label">
                    <input
                      type="checkbox"
                      checked={showTrajectories}
                      onChange={(e) => setShowTrajectories(e.target.checked)}
                    />
                    <span>Show Sky Paths</span>
                  </label>
                  <label className="skymap-checkbox-label">
                    <input
                      type="checkbox"
                      checked={filterHazardousOnly}
                      onChange={(e) => setFilterHazardousOnly(e.target.checked)}
                    />
                    <span>Hazards Only</span>
                  </label>
                </div>
              </div>

              {/* Slider */}
              <input
                id="skymap-time-slider"
                type="range"
                min="0"
                max={Math.max(1, timelineSamples.length - 1)}
                value={timeIndex}
                onChange={(e) => {
                  setTimeIndex(parseInt(e.target.value, 10));
                  setIsPlaying(false);
                }}
                className="skymap-time-range"
              />
              <div className="scrubber-axis">
                <span>Sunset</span>
                <span>Midnight</span>
                <span>Sunrise</span>
              </div>
            </div>

            {/* Canvas Dome */}
            <div className="canvas-dome-frame">
              <canvas
                ref={canvasRef}
                width={620}
                height={620}
                className="skymap-canvas"
                onClick={handleCanvasClick}
              />
              <div className="canvas-dome-hint">
                <span>💡 Click on any target on the sky dome to lock telemetry</span>
              </div>
            </div>
          </div>

          {/* Right Target Inspector Sidebar */}
          <div className="skymap-sidebar">
            {selectedAsteroid ? (
              <div className="skymap-inspect-card">
                <div className="inspect-header">
                  <span className="inspect-tag">Locked Sky Target</span>
                  <h3>{selectedAsteroid.name}</h3>
                  <span className="inspect-ref">Ref #{selectedAsteroid.neo_reference_id}</span>
                </div>

                <div className="inspect-badges">
                  <span className={`hazard-badge ${selectedAsteroid.is_potentially_hazardous ? 'high' : 'low'}`}>
                    {selectedAsteroid.is_potentially_hazardous ? '⚠️ Tracked Hazard' : '🛡️ Low Risk'}
                  </span>
                  <span className={`vis-rating-pill small ${selectedAsteroid.rating_badge}`}>
                    {selectedAsteroid.rating}
                  </span>
                  {onToggleWatchlist && (
                    <button
                      type="button"
                      className={`star-bookmark-btn ${watchlistIds && watchlistIds.has(selectedAsteroid.id) ? 'active' : ''}`}
                      style={{ width: '28px', height: '28px', fontSize: '1rem' }}
                      title={watchlistIds && watchlistIds.has(selectedAsteroid.id) ? 'Remove from Watchlist' : 'Add to Watchlist'}
                      onClick={(e) => onToggleWatchlist(selectedAsteroid.id, e)}
                    >
                      {watchlistIds && watchlistIds.has(selectedAsteroid.id) ? '★' : '☆'}
                    </button>
                  )}
                </div>

                {/* Instant Horizon Coordinates */}
                <div className="inspect-coords-box">
                  <div className="inspect-coord-item">
                    <span className="label">Current Altitude</span>
                    <strong className="val">
                      {selectedAsteroid.hourly_positions && selectedAsteroid.hourly_positions[timeIndex]
                        ? `${selectedAsteroid.hourly_positions[timeIndex].altitude_deg}°`
                        : `${selectedAsteroid.peak_altitude_deg}°`}
                    </strong>
                    <span className="sub">Horizon 0° / Zenith 90°</span>
                  </div>

                  <div className="inspect-coord-item">
                    <span className="label">Azimuth Direction</span>
                    <strong className="val">
                      {selectedAsteroid.hourly_positions && selectedAsteroid.hourly_positions[timeIndex]
                        ? `${selectedAsteroid.hourly_positions[timeIndex].azimuth_deg}°`
                        : `${selectedAsteroid.peak_azimuth_deg}°`}
                    </strong>
                    <span className="sub">Compass bearing</span>
                  </div>
                </div>

                {/* Viewing Stats */}
                <div className="inspect-metrics-list">
                  <div className="metric-row">
                    <span>Apparent Brightness:</span>
                    <strong>~{selectedAsteroid.estimated_visual_mag} V</strong>
                  </div>
                  <div className="metric-row">
                    <span>Peak Elevation:</span>
                    <strong>{selectedAsteroid.visibility_window ? `${selectedAsteroid.visibility_window.peak_altitude_deg}°` : 'N/A'}</strong>
                  </div>
                  <div className="metric-row">
                    <span>Window Duration:</span>
                    <strong>{selectedAsteroid.visibility_window ? `${selectedAsteroid.visibility_window.duration_hours} hrs` : 'N/A'}</strong>
                  </div>
                  <div className="metric-row">
                    <span>Required Gear:</span>
                    <strong>{selectedAsteroid.equipment.category}</strong>
                  </div>
                </div>

                <div className="inspect-gear-box">
                  <span>🔭 {selectedAsteroid.equipment.description}</span>
                </div>

                {onSelectNeoDetail && (
                  <button
                    type="button"
                    className="inspect-full-detail-btn"
                    onClick={() => onSelectNeoDetail(selectedAsteroid.id)}
                  >
                    Open Complete Asteroid Dossier →
                  </button>
                )}
              </div>
            ) : (
              <div className="skymap-empty-inspect">
                <p>Click any celestial target on the dome to lock telescope telemetry.</p>
              </div>
            )}

            {/* List of Visible Targets */}
            <div className="skymap-targets-list-card">
              <h4>Visible Tonight ({visibleAsteroids.length})</h4>
              <div className="targets-scroll-list">
                {visibleAsteroids.map(ast => {
                  const isLocked = selectedAsteroid && selectedAsteroid.id === ast.id;
                  const currentAlt = ast.hourly_positions && ast.hourly_positions[timeIndex]
                    ? ast.hourly_positions[timeIndex].altitude_deg
                    : ast.peak_altitude_deg;

                  return (
                    <div
                      key={ast.id}
                      className={`target-list-row ${isLocked ? 'locked' : ''}`}
                      onClick={() => setSelectedAsteroid(ast)}
                    >
                      <div className="target-row-info">
                        <strong className="target-name">{ast.name}</strong>
                        <span className="target-sub">
                          {ast.equipment.category} • ~{ast.estimated_visual_mag} V
                        </span>
                      </div>
                      <div className="target-row-alt">
                        <span className="alt-val">{currentAlt}°</span>
                        <span className="alt-lbl">elev</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
