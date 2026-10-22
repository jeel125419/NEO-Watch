import React, { useState, useEffect } from 'react';
import AstroDeepLinks from './AstroDeepLinks.jsx';

// Popular location presets for stargazing
const CITY_PRESETS = [
  { name: 'New Delhi, India', lat: 28.6139, lon: 77.2090 },
  { name: 'New York, USA', lat: 40.7128, lon: -74.0060 },
  { name: 'London, UK', lat: 51.5074, lon: -0.1278 },
  { name: 'Tokyo, Japan', lat: 35.6762, lon: 139.6503 },
  { name: 'Sydney, Australia', lat: -33.8688, lon: 151.2093 },
  { name: 'Atacama Desert, Chile', lat: -23.8634, lon: -69.1328 },
  { name: 'Mauna Kea, Hawaii', lat: 19.8206, lon: -155.4681 }
];

export default function VisibilityPredictor({ initialNeoId, onSelectNeoModal }) {
  // Coordinates & Date state
  const [lat, setLat] = useState(28.6139);
  const [lon, setLon] = useState(77.2090);
  const [locationName, setLocationName] = useState('New Delhi, India (Preset)');
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });

  // Data states
  const [overviewData, setOverviewData] = useState(null);
  const [selectedNeoId, setSelectedNeoId] = useState(initialNeoId || 1);
  const [selectedNeoVisibility, setSelectedNeoVisibility] = useState(null);
  const [loadingOverview, setLoadingOverview] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [filterRating, setFilterRating] = useState('ALL');
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoError, setGeoError] = useState(null);

  // Sync if initialNeoId changes externally
  useEffect(() => {
    if (initialNeoId) {
      setSelectedNeoId(initialNeoId);
    }
  }, [initialNeoId]);

  // Fetch tonight's sky conditions & visible asteroids list
  useEffect(() => {
    setLoadingOverview(true);
    const params = new URLSearchParams({
      lat: lat.toString(),
      lon: lon.toString(),
      date: selectedDate,
      limit: '30'
    });

    fetch(`/api/visibility?${params.toString()}`)
      .then(res => {
        if (!res.ok) throw new Error('Failed to load tonight sky conditions');
        return res.json();
      })
      .then(data => {
        setOverviewData(data);
        setLoadingOverview(false);

        // If no asteroid is currently selected, pick the first visible or first in list
        if (!selectedNeoId && data.asteroids && data.asteroids.length > 0) {
          const firstVis = data.asteroids.find(a => a.is_visible) || data.asteroids[0];
          setSelectedNeoId(firstVis.id);
        }
      })
      .catch(err => {
        console.error(err);
        setLoadingOverview(false);
      });
  }, [lat, lon, selectedDate]);

  // Fetch detailed hourly visibility when selectedNeoId, location, or date changes
  useEffect(() => {
    if (!selectedNeoId) return;

    setLoadingDetail(true);
    const params = new URLSearchParams({
      lat: lat.toString(),
      lon: lon.toString(),
      date: selectedDate
    });

    fetch(`/api/visibility/${selectedNeoId}?${params.toString()}`)
      .then(res => {
        if (!res.ok) throw new Error('Failed to load asteroid visibility');
        return res.json();
      })
      .then(data => {
        setSelectedNeoVisibility(data);
        setLoadingDetail(false);
      })
      .catch(err => {
        console.error(err);
        setLoadingDetail(false);
      });
  }, [selectedNeoId, lat, lon, selectedDate]);

  // Handle GPS Geolocation
  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      setGeoError('Geolocation is not supported by your browser.');
      return;
    }

    setGeoLoading(true);
    setGeoError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const detectedLat = Math.round(pos.coords.latitude * 10000) / 10000;
        const detectedLon = Math.round(pos.coords.longitude * 10000) / 10000;
        setLat(detectedLat);
        setLon(detectedLon);
        setLocationName('Detected GPS Location');
        setGeoLoading(false);
      },
      (err) => {
        console.warn('Geolocation error:', err);
        setGeoError('Unable to retrieve location. Please check browser permissions.');
        setGeoLoading(false);
      },
      { timeout: 10000 }
    );
  };

  // Helper formatting
  const formatTimeStr = (isoString) => {
    if (!isoString) return '--:--';
    return new Date(isoString).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const formatKm = (km) => {
    if (!km) return 'N/A';
    return Number(km).toLocaleString() + ' km';
  };

  // Filter asteroids list
  const filteredAsteroids = (overviewData?.asteroids || []).filter(item => {
    if (filterRating === 'ALL') return true;
    if (filterRating === 'VISIBLE') return item.is_visible;
    if (filterRating === 'PRIME') return item.rating === 'Prime Viewing';
    if (filterRating === 'HAZARDOUS') return item.is_potentially_hazardous;
    return true;
  });

  return (
    <div className="visibility-predictor-container" id="visibility-predictor-view">
      {/* View Header Banner */}
      <section className="vis-intro-banner">
        <div className="vis-intro-text">
          <h2>🔭 Tonight’s Asteroid Visibility Predictor</h2>
          <p>
            Real-time orbital mechanics and local horizontal ephemeris. Calculates topocentric altitude, moon phase interference, and the exact dark-sky window for asteroids passing overhead.
          </p>
        </div>
      </section>

      {/* Location & Time Controls Card */}
      <section className="vis-controls-card" aria-label="Observer Location and Date Controls">
        <div className="vis-control-row">
          {/* Preset Selector */}
          <div className="vis-control-field">
            <label htmlFor="vis-city-preset">Preset Observatories & Cities</label>
            <select
              id="vis-city-preset"
              className="filter-select"
              value={locationName.includes('Preset') ? locationName.replace(' (Preset)', '') : ''}
              onChange={(e) => {
                const preset = CITY_PRESETS.find(p => p.name === e.target.value);
                if (preset) {
                  setLat(preset.lat);
                  setLon(preset.lon);
                  setLocationName(`${preset.name} (Preset)`);
                }
              }}
            >
              <option value="">Custom / GPS Coordinates</option>
              {CITY_PRESETS.map(city => (
                <option key={city.name} value={city.name}>
                  {city.name}
                </option>
              ))}
            </select>
          </div>

          {/* GPS Button */}
          <div className="vis-control-field auto-btn-field">
            <button
              id="detect-gps-btn"
              type="button"
              className="vis-gps-btn"
              onClick={handleDetectLocation}
              disabled={geoLoading}
            >
              {geoLoading ? 'Detecting...' : '📍 Use My Location'}
            </button>
          </div>

          {/* Latitude */}
          <div className="vis-control-field small">
            <label htmlFor="vis-lat-input">Latitude (°)</label>
            <input
              id="vis-lat-input"
              type="number"
              step="0.0001"
              min="-90"
              max="90"
              className="vis-num-input"
              value={lat}
              onChange={(e) => {
                setLat(parseFloat(e.target.value) || 0);
                setLocationName('Custom Coordinates');
              }}
            />
          </div>

          {/* Longitude */}
          <div className="vis-control-field small">
            <label htmlFor="vis-lon-input">Longitude (°)</label>
            <input
              id="vis-lon-input"
              type="number"
              step="0.0001"
              min="-180"
              max="180"
              className="vis-num-input"
              value={lon}
              onChange={(e) => {
                setLon(parseFloat(e.target.value) || 0);
                setLocationName('Custom Coordinates');
              }}
            />
          </div>

          {/* Date Picker */}
          <div className="vis-control-field">
            <label htmlFor="vis-date-input">Observation Night</label>
            <input
              id="vis-date-input"
              type="date"
              className="vis-date-input"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
            />
          </div>
        </div>

        {geoError && (
          <div className="vis-geo-error">
            <span>⚠️ {geoError}</span>
          </div>
        )}

        <div className="vis-location-badge">
          <span>Active Observer Horizon: <strong>{locationName}</strong> ({lat >= 0 ? `${lat}° N` : `${Math.abs(lat)}° S`}, {lon >= 0 ? `${lon}° E` : `${Math.abs(lon)}° W`})</span>
        </div>
      </section>

      {/* Sky Conditions Overview Strip */}
      {loadingOverview ? (
        <div className="loading-box">
          <div className="spinner" />
          <p>Calculating solar twilight, lunar glare, and orbital passes...</p>
        </div>
      ) : overviewData ? (
        <>
          <section className="vis-environment-grid" aria-label="Night Sky Conditions">
            {/* 1. Moon Glare Card */}
            <div className="vis-env-card">
              <div className="vis-env-header">
                <span className="vis-env-icon">{overviewData.sky_conditions.moon.phase_icon}</span>
                <div>
                  <h3 className="vis-env-title">Moon Phase & Glare</h3>
                  <span className="vis-env-sub">{overviewData.sky_conditions.moon.phase_name}</span>
                </div>
              </div>
              <div className="vis-moon-progress-box">
                <div className="vis-moon-bar-label">
                  <span>Illumination</span>
                  <strong>{overviewData.sky_conditions.moon.illumination_pct}%</strong>
                </div>
                <div className="vis-moon-bar-track">
                  <div
                    className="vis-moon-bar-fill"
                    style={{ width: `${Math.min(100, Math.max(3, overviewData.sky_conditions.moon.illumination_pct))}%` }}
                  />
                </div>
              </div>
              <div className="vis-interference-row">
                <span className={`vis-interference-badge ${overviewData.sky_conditions.moon.interference_level.toLowerCase()}`}>
                  Interference: {overviewData.sky_conditions.moon.interference_level}
                </span>
                <p className="vis-env-desc">{overviewData.sky_conditions.moon.interference_explanation}</p>
              </div>
            </div>

            {/* 2. Darkness & Twilight Schedule */}
            <div className="vis-env-card">
              <div className="vis-env-header">
                <span className="vis-env-icon">🌌</span>
                <div>
                  <h3 className="vis-env-title">True Dark Sky Schedule</h3>
                  <span className="vis-env-sub">Astronomical Twilight</span>
                </div>
              </div>
              <div className="vis-timeline-grid">
                <div className="vis-timeline-item">
                  <span className="vis-tl-label">Sunset</span>
                  <span className="vis-tl-val">{formatTimeStr(overviewData.sky_conditions.sun_timeline.sunset)}</span>
                </div>
                <div className="vis-timeline-item highlight">
                  <span className="vis-tl-label">Full Darkness Starts</span>
                  <span className="vis-tl-val">{formatTimeStr(overviewData.sky_conditions.sun_timeline.dusk_astronomical)}</span>
                </div>
                <div className="vis-timeline-item highlight">
                  <span className="vis-tl-label">Full Darkness Ends</span>
                  <span className="vis-tl-val">{formatTimeStr(overviewData.sky_conditions.sun_timeline.dawn_astronomical)}</span>
                </div>
                <div className="vis-timeline-item">
                  <span className="vis-tl-label">Sunrise</span>
                  <span className="vis-tl-val">{formatTimeStr(overviewData.sky_conditions.sun_timeline.sunrise)}</span>
                </div>
              </div>
              <p className="vis-env-desc">Astronomical twilight ensures the Sun is 18° below horizon, providing optimal dark skies.</p>
            </div>

            {/* 3. Catalog Visibility Stats */}
            <div className="vis-env-card">
              <div className="vis-env-header">
                <span className="vis-env-icon">☄️</span>
                <div>
                  <h3 className="vis-env-title">Local Sky Pass Overview</h3>
                  <span className="vis-env-sub">Above 15° during darkness</span>
                </div>
              </div>
              <div className="vis-stats-number-box">
                <div className="vis-big-stat">
                  <span className="vis-stat-num">{overviewData.stats.total_visible_tonight}</span>
                  <span className="vis-stat-denom">/ {overviewData.stats.total_cataloged}</span>
                </div>
                <span className="vis-stat-label">Asteroids Observable Tonight</span>
              </div>
              <p className="vis-env-desc">
                {overviewData.stats.total_visible_tonight > 0
                  ? 'Objects clearing ground obstructions and trees with calculated viewing windows.'
                  : 'All cataloged asteroids are either below the horizon or passing during daylight.'}
              </p>
            </div>
          </section>

          {/* Asteroid Spotlight: Detailed Sky Path & Hourly Curve */}
          {selectedNeoVisibility && (
            <section className="vis-spotlight-card" id="vis-spotlight-section">
              <div className="vis-spotlight-header">
                <div className="vis-spotlight-title-group">
                  <span className="vis-spotlight-tag">Active Target Sky Path</span>
                  <h3 className="vis-spotlight-name">{selectedNeoVisibility.name}</h3>
                  <span className="vis-spotlight-ref">NASA Ref #{selectedNeoVisibility.reference_id}</span>
                </div>

                <div className="vis-spotlight-badges">
                  <span className={`vis-rating-pill ${selectedNeoVisibility.rating_badge}`}>
                    {selectedNeoVisibility.rating === 'Prime Viewing' ? '🌟 Prime Viewing' :
                     selectedNeoVisibility.rating === 'Good Window' ? '✨ Good Window' :
                     selectedNeoVisibility.rating === 'Challenging' ? '⚡ Challenging' : '🚫 Not Observable'}
                  </span>
                  {selectedNeoVisibility.equipment && (
                    <span className={`vis-equip-pill ${selectedNeoVisibility.equipment.badge_class}`}>
                      🔭 {selectedNeoVisibility.equipment.category}
                    </span>
                  )}
                </div>
              </div>

              {/* Plain Language Summary */}
              <div className="vis-summary-box">
                <p className="vis-summary-text">{selectedNeoVisibility.summary}</p>
              </div>

              {/* Window Key Metrics Grid */}
              {selectedNeoVisibility.is_visible && selectedNeoVisibility.visibility_window ? (
                <div className="vis-window-metrics">
                  <div className="vis-metric-box">
                    <span className="vmb-label">Observing Window</span>
                    <strong className="vmb-val">
                      {formatTimeStr(selectedNeoVisibility.visibility_window.start_time)} – {formatTimeStr(selectedNeoVisibility.visibility_window.end_time)}
                    </strong>
                    <span className="vmb-sub">{selectedNeoVisibility.visibility_window.duration_hours} hours total</span>
                  </div>

                  <div className="vis-metric-box">
                    <span className="vmb-label">Peak Elevation</span>
                    <strong className="vmb-val" style={{ color: '#38bdf8' }}>
                      {selectedNeoVisibility.visibility_window.peak_altitude_deg}°
                    </strong>
                    <span className="vmb-sub">at {formatTimeStr(selectedNeoVisibility.visibility_window.peak_time)}</span>
                  </div>

                  <div className="vis-metric-box">
                    <span className="vmb-label">Look Direction</span>
                    <strong className="vmb-val">
                      {selectedNeoVisibility.visibility_window.peak_direction}
                    </strong>
                    <span className="vmb-sub">Compass azimuth</span>
                  </div>

                  <div className="vis-metric-box">
                    <span className="vmb-label">Visual Magnitude (V)</span>
                    <strong className="vmb-val">
                      ~{selectedNeoVisibility.ephemeris.estimated_visual_mag} mag
                    </strong>
                    <span className="vmb-sub">{selectedNeoVisibility.equipment.difficulty}</span>
                  </div>
                </div>
              ) : null}

              {/* Equipment Guidance Banner */}
              {selectedNeoVisibility.equipment && (
                <div className="vis-equipment-guide">
                  <div className="vis-eg-icon">🔭</div>
                  <div className="vis-eg-body">
                    <strong>Recommended Optical Gear: {selectedNeoVisibility.equipment.category}</strong>
                    <p>{selectedNeoVisibility.equipment.description}</p>
                  </div>
                </div>
              )}

              {/* Hourly Night Altitude Chart */}
              <div className="vis-chart-section">
                <div className="vis-chart-header">
                  <h4>Nighttime Altitude Curve (Horizon 0° to Zenith 90°)</h4>
                  <div className="vis-chart-legend">
                    <span className="legend-item"><span className="legend-dot observable" /> Observable (&ge;15° in Dark)</span>
                    <span className="legend-item"><span className="legend-dot low" /> Below 15° / Daylight</span>
                  </div>
                </div>

                <div className="vis-altitude-bars-wrapper" id="vis-altitude-chart">
                  {selectedNeoVisibility.hourly_altitude.map((sample, idx) => {
                    const alt = Math.max(0, sample.altitude_deg);
                    const heightPct = Math.min(100, Math.round((alt / 90) * 100));

                    return (
                      <div key={idx} className="vis-bar-col">
                        <div className="vis-bar-hover-info">
                          <span>{sample.time_formatted}</span>
                          <strong>{sample.altitude_deg}°</strong>
                          <small>{sample.direction}</small>
                        </div>

                        <div className="vis-bar-track">
                          <div
                            className={`vis-bar-fill ${sample.is_visible ? 'observable' : 'dim'}`}
                            style={{ height: `${heightPct}%` }}
                          />
                        </div>
                        <span className="vis-bar-time">{sample.time_formatted}</span>
                      </div>
                    );
                  })}
                </div>
                <div className="vis-chart-axis-label">
                  <span>Sunset</span>
                  <span>Midnight</span>
                  <span>Sunrise</span>
                </div>
              </div>

              {/* External Astronomy Apps & Telescope Mount Integration */}
              <AstroDeepLinks
                neo={{
                  id: selectedNeoVisibility.neo_id,
                  name: selectedNeoVisibility.name,
                  neo_reference_id: selectedNeoVisibility.reference_id,
                  ra_deg: selectedNeoVisibility.ephemeris?.ra_deg,
                  dec_deg: selectedNeoVisibility.ephemeris?.dec_deg,
                  peak_altitude_deg: selectedNeoVisibility.visibility_window?.peak_altitude_deg,
                  peak_azimuth_deg: selectedNeoVisibility.visibility_window?.peak_azimuth_deg
                }}
                compact={false}
              />
            </section>
          )}

          {/* Tonight's Asteroid Roster */}
          <section className="vis-catalog-roster" aria-label="Tonight Asteroids List">
            <div className="vis-roster-header">
              <div>
                <h3>All Cataloged Asteroids Tonight</h3>
                <p>Select any object to project its celestial coordinates and sky path</p>
              </div>

              {/* Filter Pills */}
              <div className="vis-filter-pills">
                <button
                  type="button"
                  className={`vis-pill-btn ${filterRating === 'ALL' ? 'active' : ''}`}
                  onClick={() => setFilterRating('ALL')}
                >
                  All ({overviewData.asteroids.length})
                </button>
                <button
                  type="button"
                  className={`vis-pill-btn ${filterRating === 'VISIBLE' ? 'active' : ''}`}
                  onClick={() => setFilterRating('VISIBLE')}
                >
                  Visible Tonight ({overviewData.stats.total_visible_tonight})
                </button>
                <button
                  type="button"
                  className={`vis-pill-btn ${filterRating === 'PRIME' ? 'active' : ''}`}
                  onClick={() => setFilterRating('PRIME')}
                >
                  🌟 Prime Only
                </button>
                <button
                  type="button"
                  className={`vis-pill-btn ${filterRating === 'HAZARDOUS' ? 'active' : ''}`}
                  onClick={() => setFilterRating('HAZARDOUS')}
                >
                  ⚠️ Tracked Hazards
                </button>
              </div>
            </div>

            <div className="vis-roster-grid">
              {filteredAsteroids.map(asteroid => {
                const isSelected = selectedNeoId === asteroid.id;

                return (
                  <div
                    key={asteroid.id}
                    className={`vis-roster-card ${isSelected ? 'selected' : ''} ${asteroid.is_visible ? 'observable' : ''}`}
                    onClick={() => setSelectedNeoId(asteroid.id)}
                  >
                    <div className="vis-rc-top">
                      <div>
                        <h4 className="vis-rc-title">{asteroid.name}</h4>
                        <span className="vis-rc-ref">Ref #{asteroid.neo_reference_id}</span>
                      </div>
                      <span className={`vis-rating-pill small ${asteroid.rating_badge}`}>
                        {asteroid.rating}
                      </span>
                    </div>

                    <div className="vis-rc-metrics">
                      <div className="vis-rc-metric">
                        <span className="label">Peak Altitude</span>
                        <strong className="val">
                          {asteroid.visibility_window ? `${asteroid.visibility_window.peak_altitude_deg}°` : 'Below 0°'}
                        </strong>
                      </div>
                      <div className="vis-rc-metric">
                        <span className="label">Window</span>
                        <strong className="val">
                          {asteroid.visibility_window ? `${asteroid.visibility_window.duration_hours} hrs` : 'None'}
                        </strong>
                      </div>
                      <div className="vis-rc-metric">
                        <span className="label">Brightness</span>
                        <strong className="val">~{asteroid.estimated_visual_mag} V</strong>
                      </div>
                    </div>

                    <div className="vis-rc-footer">
                      <span className="vis-rc-equip">{asteroid.equipment.category}</span>
                      <button
                        type="button"
                        className="vis-inspect-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedNeoId(asteroid.id);
                        }}
                      >
                        {isSelected ? 'Viewing Sky Path' : 'View Sky Path →'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
}
