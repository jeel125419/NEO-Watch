import React, { useState, useEffect } from 'react';
import './App.css';

export default function App() {
  const [neos, setNeos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Search, filter, pagination
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [isDebouncing, setIsDebouncing] = useState(false);
  const [hazardousFilter, setHazardousFilter] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState('ASC');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });

  // Selected NEO for detail view
  const [selectedNeoId, setSelectedNeoId] = useState(null);
  const [selectedNeoDetail, setSelectedNeoDetail] = useState(null);
  const [riskData, setRiskData] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);
  const [approachTab, setApproachTab] = useState('upcoming');

  // Backend & ML service health check
  const [backendHealthy, setBackendHealthy] = useState(true);
  const [mlAvailable, setMlAvailable] = useState(true);

  // Check health on mount
  useEffect(() => {
    fetch('/api/health')
      .then(res => res.json())
      .then(() => setBackendHealthy(true))
      .catch(() => setBackendHealthy(false));
  }, []);

  // Debounce search input by 350ms to reduce backend API calls
  useEffect(() => {
    if (search.trim() !== debouncedSearch.trim()) {
      setIsDebouncing(true);
    }
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setIsDebouncing(false);
      setPage(1);
    }, 350);

    return () => clearTimeout(timer);
  }, [search]);

  // Fetch NEOs list using debouncedSearch
  useEffect(() => {
    setLoading(true);
    setError(null);

    const queryParams = new URLSearchParams({
      page: page.toString(),
      limit: '12',
      search: debouncedSearch.trim(),
      sortBy: sortBy,
      sortOrder: sortOrder
    });

    if (hazardousFilter !== '') {
      queryParams.set('hazardous', hazardousFilter);
    }

    fetch(`/api/neos?${queryParams.toString()}`)
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch Near-Earth Objects');
        return res.json();
      })
      .then(data => {
        setNeos(data.data || []);
        setPagination(data.pagination || { total: 0, totalPages: 1 });
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setError(err.message);
        setLoading(false);
      });
  }, [page, debouncedSearch, hazardousFilter, sortBy, sortOrder]);

  // Fetch NEO detail and risk score when selected
  useEffect(() => {
    if (!selectedNeoId) {
      setSelectedNeoDetail(null);
      setRiskData(null);
      return;
    }

    setDetailLoading(true);
    setShowTechnicalDetails(false);

    Promise.all([
      fetch(`/api/neos/${selectedNeoId}`).then(res => res.json()),
      fetch(`/api/risk-score/${selectedNeoId}`).then(res => res.json())
    ])
      .then(([detail, risk]) => {
        setSelectedNeoDetail(detail);
        setRiskData(risk);
        if (risk && risk.source === 'ml_model') {
          setMlAvailable(true);
        } else if (risk && risk.source === 'nasa_flag_fallback') {
          setMlAvailable(false);
        }
        setDetailLoading(false);
      })
      .catch(err => {
        console.error('Error fetching NEO detail:', err);
        setDetailLoading(false);
      });
  }, [selectedNeoId]);

  // Set default active approach tab when object detail loads
  useEffect(() => {
    if (selectedNeoDetail) {
      const now = new Date();
      const hasUpcoming = (selectedNeoDetail.close_approaches || []).some(
        ca => ca.approach_date && new Date(ca.approach_date) >= now
      );
      setApproachTab(hasUpcoming ? 'upcoming' : 'past');
    }
  }, [selectedNeoDetail]);

  // Format helpers
  const formatKm = (val) => {
    if (val == null) return 'N/A';
    return Number(val).toLocaleString(undefined, { maximumFractionDigits: 0 }) + ' km';
  };

  const formatLunarDistance = (km) => {
    if (km == null) return '';
    const ld = km / 384400; // 1 LD = ~384,400 km
    return ` (~${ld.toFixed(1)} Lunar Distances)`;
  };

  const formatDiameter = (min, max) => {
    if (min == null && max == null) return 'Unknown';
    if (min != null && max != null) {
      return `${(min * 1000).toFixed(0)}m – ${(max * 1000).toFixed(0)}m`;
    }
    return `${((min || max) * 1000).toFixed(0)}m`;
  };

  const formatRelativeTime = (dateStr, isUpcoming) => {
    if (!dateStr) return '';
    const target = new Date(dateStr);
    const now = new Date();
    const diffMs = target.getTime() - now.getTime();
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

    if (isUpcoming) {
      if (diffDays <= 0) return 'Today';
      if (diffDays === 1) return 'Tomorrow';
      if (diffDays < 30) return `in ${diffDays} days`;
      const diffMonths = Math.round(diffDays / 30.4);
      if (diffMonths < 12) return `in ~${diffMonths} month${diffMonths === 1 ? '' : 's'}`;
      const diffYears = (diffDays / 365.25).toFixed(1);
      return `in ~${diffYears} years`;
    } else {
      const absDays = Math.abs(diffDays);
      if (absDays <= 0) return 'Today';
      if (absDays === 1) return 'Yesterday';
      if (absDays < 30) return `${absDays} days ago`;
      const diffMonths = Math.round(absDays / 30.4);
      if (diffMonths < 12) return `~${diffMonths} month${diffMonths === 1 ? '' : 's'} ago`;
      const diffYears = (absDays / 365.25).toFixed(1);
      return `~${diffYears} years ago`;
    }
  };

  return (
    <div className="app-container" id="neo-watch-app">
      {/* Header */}
      <header className="app-header">
        <div className="brand">
          <div className="brand-icon" aria-hidden="true">☄️</div>
          <div>
            <h1 className="brand-title">NEO Watch</h1>
            <p className="brand-subtitle">Asteroid risk data, translated for humans — not scientists</p>
          </div>
        </div>

        <div className="header-badges">
          <div className="status-badge" id="backend-status-badge">
            <span className={`status-dot ${backendHealthy ? 'active' : 'fallback'}`} />
            <span>Backend: {backendHealthy ? 'Connected' : 'Offline'}</span>
          </div>
          <div className="status-badge" id="ml-status-badge">
            <span className={`status-dot ${mlAvailable ? 'active' : 'fallback'}`} />
            <span>ML Model: {mlAvailable ? 'Active' : 'Fallback Mode'}</span>
          </div>
        </div>
      </header>

      {/* Educational Banner */}
      <section className="info-banner" aria-label="Educational context">
        <div className="info-icon">💡</div>
        <div className="info-text">
          <h3>What does "Potentially Hazardous" really mean?</h3>
          <p>
            NASA designates an asteroid as potentially hazardous if its orbit comes within <strong>0.05 AU</strong> (about 7.5 million km or 19.5 Lunar Distances) of Earth and its diameter exceeds ~<strong>140 meters</strong>. 
            This is an administrative eligibility criterion for continued observational tracking — <em>not</em> a prediction of an imminent impact. Our ML model reconstructs this hazard classification using NASA's orbital physics features.
          </p>
        </div>
      </section>

      {/* Control Card (Search & Filters) */}
      <section className="controls-card" aria-label="Filters and search">
        <div className="search-box">
          <svg className="search-icon-svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <input
            id="neo-search-input"
            type="text"
            className="search-input"
            placeholder="Search asteroids by name or ID (e.g. Eros, Geographos)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {isDebouncing && (
            <div className="search-status-hint" id="search-debouncing-indicator">
              <span>⏳ Filtering catalog...</span>
            </div>
          )}
        </div>

        <div className="filters-group">
          <select
            id="neo-hazardous-filter"
            className="filter-select"
            value={hazardousFilter}
            onChange={(e) => {
              setHazardousFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All Asteroids</option>
            <option value="true">Tracked / Hazardous Only</option>
            <option value="false">Low Risk Only</option>
          </select>

          <select
            id="neo-sort-select"
            className="filter-select"
            value={sortBy}
            onChange={(e) => {
              setSortBy(e.target.value);
              setPage(1);
            }}
          >
            <option value="name">Sort by Name</option>
            <option value="diameter">Sort by Diameter</option>
            <option value="magnitude">Sort by Brightness (H)</option>
            <option value="id">Default (ID)</option>
          </select>

          <select
            id="neo-order-select"
            className="filter-select"
            value={sortOrder}
            onChange={(e) => {
              setSortOrder(e.target.value);
              setPage(1);
            }}
          >
            <option value="ASC">Ascending</option>
            <option value="DESC">Descending</option>
          </select>
        </div>
      </section>

      {/* Quick Stats Strip */}
      <section className="stats-strip" aria-label="Database statistics">
        <div className="stat-card">
          <span className="stat-label">Cataloged Near-Earth Objects</span>
          <span className="stat-value">{pagination.total}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Active Page</span>
          <span className="stat-value">{page} / {pagination.totalPages || 1}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Risk Assessment Engine</span>
          <span className="stat-value" style={{ fontSize: '1.25rem', color: '#c7d2fe' }}>
            Random Forest (9-feature)
          </span>
        </div>
      </section>

      {/* Asteroids List Grid */}
      <main>
        {loading ? (
          <div className="loading-box" id="loading-state">
            <div className="spinner" />
            <p>Scanning NASA Near-Earth Object catalog...</p>
          </div>
        ) : error ? (
          <div className="error-box" id="error-state">
            <p>⚠️ {error}</p>
            <button className="page-btn" onClick={() => setPage(1)}>Retry</button>
          </div>
        ) : neos.length === 0 ? (
          <div className="empty-box" id="empty-state">
            <p>No asteroids match your filter criteria.</p>
          </div>
        ) : (
          <div className="neo-grid" id="neo-items-grid">
            {neos.map(neo => (
              <article
                key={neo.id}
                id={`neo-card-${neo.id}`}
                className={`neo-card ${neo.is_potentially_hazardous ? 'hazardous' : ''}`}
                onClick={() => setSelectedNeoId(neo.id)}
              >
                <div className="neo-card-header">
                  <div>
                    <h2 className="neo-card-title">{neo.name}</h2>
                    <span className="neo-ref-id">Ref #{neo.neo_reference_id}</span>
                  </div>

                  <span className={`hazard-badge ${neo.is_potentially_hazardous ? 'high' : 'low'}`}>
                    {neo.is_potentially_hazardous ? '⚠️ Tracked Hazard' : '🛡️ Low Risk'}
                  </span>
                </div>

                <div className="neo-quick-metrics">
                  <div className="quick-metric">
                    <span className="qm-label">Estimated Size</span>
                    <span className="qm-value">{formatDiameter(neo.estimated_diameter_min_km, neo.estimated_diameter_max_km)}</span>
                  </div>
                  <div className="quick-metric">
                    <span className="qm-label">Brightness</span>
                    <span className="qm-value">{neo.absolute_magnitude_h ? `${neo.absolute_magnitude_h} H` : 'N/A'}</span>
                  </div>
                </div>

                <div className="neo-card-footer">
                  <span>
                    Closest: <strong>{neo.closest_miss_distance_km ? formatKm(neo.closest_miss_distance_km) : 'Historical'}</strong>
                  </span>
                  <span className="card-view-cta">
                    Details & Risk &rarr;
                  </span>
                </div>
              </article>
            ))}
          </div>
        )}

        {/* Pagination Bar */}
        {!loading && pagination.totalPages > 1 && (
          <nav className="pagination-bar" aria-label="Pagination Navigation">
            <button
              id="prev-page-btn"
              className="page-btn"
              disabled={page <= 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}
            >
              &larr; Previous
            </button>
            <span className="page-info">
              Page {page} of {pagination.totalPages}
            </span>
            <button
              id="next-page-btn"
              className="page-btn"
              disabled={page >= pagination.totalPages}
              onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
            >
              Next &rarr;
            </button>
          </nav>
        )}
      </main>

      {/* Layered Detail Modal (Newbie-First / Detail-on-Demand) */}
      {selectedNeoId && (
        <div className="modal-overlay" onClick={() => setSelectedNeoId(null)}>
          <div
            className="modal-content"
            id="neo-detail-modal"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            {detailLoading || !selectedNeoDetail ? (
              <div className="loading-box">
                <div className="spinner" />
                <p>Translating asteroid orbital data & computing risk tier...</p>
              </div>
            ) : (
              <>
                <div className="modal-header">
                  <div className="modal-title-group">
                    <h2>{selectedNeoDetail.name}</h2>
                    <span className="neo-ref-id">NASA NeoWs Reference ID: {selectedNeoDetail.neo_reference_id}</span>
                  </div>
                  <button
                    id="modal-close-button"
                    className="modal-close-btn"
                    onClick={() => setSelectedNeoId(null)}
                    aria-label="Close modal"
                  >
                    &times;
                  </button>
                </div>

                <div className="modal-body">
                  {/* LAYER 1: Always Visible, Plain Language */}
                  <section className="plain-language-card" aria-label="Plain language risk explanation">
                    <div className="tier-headline">
                      <span className={`hazard-badge ${riskData?.tier === 'High' ? 'high' : riskData?.tier === 'Medium' ? 'med' : 'low'}`} style={{ fontSize: '0.85rem', padding: '0.4rem 0.9rem' }}>
                        {riskData?.tier === 'High' ? '⚠️ High Hazard Tier' : riskData?.tier === 'Medium' ? '⚡ Moderate Hazard Tier' : '🛡️ Low Hazard Tier'}
                      </span>
                      <span className="tier-text">
                        {riskData?.is_potentially_hazardous
                          ? 'Tracked by NASA because it is close and large enough to watch'
                          : 'Not classified as a hazard by NASA orbital criteria'}
                      </span>
                    </div>

                    <p className="plain-explanation">
                      {riskData?.is_potentially_hazardous ? (
                        <>
                          This object fits NASA’s <strong>Potentially Hazardous Asteroid (PHA)</strong> eligibility rules because it approaches within 0.05 AU of Earth's orbit and has an estimated diameter over 140 meters. <em>This does not mean an impact is predicted</em> — it ensures astronomers continue radar and optical tracking to refine its future orbit.
                        </>
                      ) : (
                        <>
                          This object passes at a safe distance or is small enough to burn up harmlessly in the upper atmosphere if it ever encountered Earth. It does not meet the PHA criteria.
                        </>
                      )}
                    </p>

                    {/* Source distinction: ml_model vs nasa_flag_fallback */}
                    {riskData?.source === 'ml_model' ? (
                      <div className="source-banner ml-model" id="risk-source-banner">
                        <span>🤖</span>
                        <div>
                          <strong>ML Classification ({riskData.confidence ? `${(riskData.confidence * 100).toFixed(1)}% confidence` : 'Scored'}):</strong>{' '}
                          Reconstructed by Random Forest classifier trained on NASA's physical and orbital parameters.
                        </div>
                      </div>
                    ) : (
                      <div className="source-banner fallback" id="risk-source-banner">
                        <span>⚠️</span>
                        <div>
                          <strong>Notice:</strong> Showing NASA's own hazard flag — the detailed risk model is temporarily unavailable.
                        </div>
                      </div>
                    )}
                  </section>

                  {/* LAYER 2: Expandable Detail-on-Demand (Orbital Elements & History) */}
                  <section aria-label="Technical astronomical details">
                    <button
                      id="toggle-technical-details-btn"
                      className="accordion-toggle"
                      onClick={() => setShowTechnicalDetails(!showTechnicalDetails)}
                    >
                      <span>Astronomical & Orbital Data (Technical Details)</span>
                      <span>{showTechnicalDetails ? '▲ Hide' : '▼ Expand'}</span>
                    </button>

                    {showTechnicalDetails && (
                      <div className="details-content" id="technical-details-container">
                        {/* Physical Properties */}
                        <div className="metrics-table-group">
                          <h4>Physical Properties</h4>
                          <div className="metrics-grid">
                            <div className="metric-cell">
                              <span className="label">Absolute Magnitude (H)</span>
                              <span className="value">{selectedNeoDetail.absolute_magnitude_h ?? 'N/A'}</span>
                            </div>
                            <div className="metric-cell">
                              <span className="label">Estimated Diameter Min</span>
                              <span className="value">
                                {selectedNeoDetail.estimated_diameter_min_km
                                  ? `${(selectedNeoDetail.estimated_diameter_min_km * 1000).toFixed(1)} m`
                                  : 'N/A'}
                              </span>
                            </div>
                            <div className="metric-cell">
                              <span className="label">Estimated Diameter Max</span>
                              <span className="value">
                                {selectedNeoDetail.estimated_diameter_max_km
                                  ? `${(selectedNeoDetail.estimated_diameter_max_km * 1000).toFixed(1)} m`
                                  : 'N/A'}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Orbital Elements */}
                        {selectedNeoDetail.orbital_elements && (
                          <div className="metrics-table-group">
                            <h4>Orbital Elements</h4>
                            <div className="metrics-grid">
                              <div className="metric-cell">
                                <span className="label">Eccentricity (e)</span>
                                <span className="value">{Number(selectedNeoDetail.orbital_elements.eccentricity).toFixed(5)}</span>
                              </div>
                              <div className="metric-cell">
                                <span className="label">Inclination (i)</span>
                                <span className="value">{Number(selectedNeoDetail.orbital_elements.inclination).toFixed(3)}°</span>
                              </div>
                              <div className="metric-cell">
                                <span className="label">Semi-Major Axis (a)</span>
                                <span className="value">{Number(selectedNeoDetail.orbital_elements.semi_major_axis).toFixed(4)} AU</span>
                              </div>
                              <div className="metric-cell">
                                <span className="label">Orbital Period</span>
                                <span className="value">{Number(selectedNeoDetail.orbital_elements.orbital_period).toFixed(1)} days</span>
                              </div>
                              <div className="metric-cell">
                                <span className="label">Perihelion Distance (q)</span>
                                <span className="value">{Number(selectedNeoDetail.orbital_elements.perihelion_distance).toFixed(4)} AU</span>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Close Approach Events: Split into Upcoming and Past Approaches */}
                        {(() => {
                          const now = new Date();
                          const allApproaches = selectedNeoDetail.close_approaches || [];

                          // Approaches occurring on or after current date
                          const upcomingApproaches = allApproaches
                            .filter(ca => ca.approach_date && new Date(ca.approach_date) >= now)
                            .sort((a, b) => new Date(a.approach_date) - new Date(b.approach_date));

                          // Approaches that occurred before current date
                          const pastApproaches = allApproaches
                            .filter(ca => !ca.approach_date || new Date(ca.approach_date) < now)
                            .sort((a, b) => new Date(b.approach_date) - new Date(a.approach_date));

                          return (
                            <div className="metrics-table-group">
                              <div className="approach-tabs-header">
                                <h4>Close Approach Encounters ({allApproaches.length} Total)</h4>
                                <div className="approach-tabs-nav" role="tablist">
                                  <button
                                    id="tab-upcoming-approaches"
                                    type="button"
                                    role="tab"
                                    aria-selected={approachTab === 'upcoming'}
                                    className={`approach-tab-btn ${approachTab === 'upcoming' ? 'active' : ''}`}
                                    onClick={() => setApproachTab('upcoming')}
                                  >
                                    <span>🚀 Upcoming Passes</span>
                                    <span className="approach-count-badge">{upcomingApproaches.length}</span>
                                  </button>
                                  <button
                                    id="tab-past-approaches"
                                    type="button"
                                    role="tab"
                                    aria-selected={approachTab === 'past'}
                                    className={`approach-tab-btn ${approachTab === 'past' ? 'active' : ''}`}
                                    onClick={() => setApproachTab('past')}
                                  >
                                    <span>🕰️ Past Encounters</span>
                                    <span className="approach-count-badge">{pastApproaches.length}</span>
                                  </button>
                                </div>
                              </div>

                              {/* 1. UPCOMING APPROACHES */}
                              {approachTab === 'upcoming' && (
                                upcomingApproaches.length > 0 ? (
                                  <div className="approaches-table-wrapper" id="upcoming-approaches-table">
                                    <table className="approaches-table">
                                      <thead>
                                        <tr>
                                          <th>Next Approach Date</th>
                                          <th>Timing</th>
                                          <th>Velocity (km/h)</th>
                                          <th>Miss Distance</th>
                                          <th>Orbiting Body</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {upcomingApproaches.map((ca, idx) => (
                                          <tr key={ca.id || `up-${idx}`}>
                                            <td>
                                              <strong>
                                                {new Date(ca.approach_date).toLocaleDateString(undefined, {
                                                  year: 'numeric',
                                                  month: 'short',
                                                  day: 'numeric'
                                                })}
                                              </strong>
                                            </td>
                                            <td>
                                              <span className="approach-relative-tag upcoming">
                                                {formatRelativeTime(ca.approach_date, true)}
                                              </span>
                                            </td>
                                            <td>
                                              {ca.relative_velocity_kmh
                                                ? Number(ca.relative_velocity_kmh).toLocaleString(undefined, { maximumFractionDigits: 0 })
                                                : 'N/A'}
                                            </td>
                                            <td>
                                              {formatKm(ca.miss_distance_km)}
                                              <small style={{ color: 'var(--text-muted)' }}>
                                                {formatLunarDistance(ca.miss_distance_km)}
                                              </small>
                                            </td>
                                            <td>{ca.orbiting_body || 'Earth'}</td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                ) : (
                                  <div className="approach-empty-state" id="empty-upcoming-approaches">
                                    <p>🚀 No upcoming close approaches cataloged for this asteroid in the current JPL dataset.</p>
                                  </div>
                                )
                              )}

                              {/* 2. PAST APPROACHES */}
                              {approachTab === 'past' && (
                                pastApproaches.length > 0 ? (
                                  <div className="approaches-table-wrapper" id="past-approaches-table">
                                    <table className="approaches-table">
                                      <thead>
                                        <tr>
                                          <th>Historical Pass Date</th>
                                          <th>Passed</th>
                                          <th>Velocity (km/h)</th>
                                          <th>Miss Distance</th>
                                          <th>Orbiting Body</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {pastApproaches.slice(0, 15).map((ca, idx) => (
                                          <tr key={ca.id || `past-${idx}`}>
                                            <td>
                                              <strong>
                                                {ca.approach_date
                                                  ? new Date(ca.approach_date).toLocaleDateString(undefined, {
                                                      year: 'numeric',
                                                      month: 'short',
                                                      day: 'numeric'
                                                    })
                                                  : 'Historical'}
                                              </strong>
                                            </td>
                                            <td>
                                              <span className="approach-relative-tag past">
                                                {formatRelativeTime(ca.approach_date, false)}
                                              </span>
                                            </td>
                                            <td>
                                              {ca.relative_velocity_kmh
                                                ? Number(ca.relative_velocity_kmh).toLocaleString(undefined, { maximumFractionDigits: 0 })
                                                : 'N/A'}
                                            </td>
                                            <td>
                                              {formatKm(ca.miss_distance_km)}
                                              <small style={{ color: 'var(--text-muted)' }}>
                                                {formatLunarDistance(ca.miss_distance_km)}
                                              </small>
                                            </td>
                                            <td>{ca.orbiting_body || 'Earth'}</td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                ) : (
                                  <div className="approach-empty-state" id="empty-past-approaches">
                                    <p>🕰️ No historical approach events cataloged in this record.</p>
                                  </div>
                                )
                              )}
                            </div>
                          );
                        })()}
                      </div>
                    )}
                  </section>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
