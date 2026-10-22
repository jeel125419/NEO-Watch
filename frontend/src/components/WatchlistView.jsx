import React, { useState, useEffect, useMemo } from 'react';

export default function WatchlistView({
  token,
  user,
  onSelectNeo,
  onSwitchNav,
  onPredictTarget,
  onWatchlistChanged
}) {
  const [watchlist, setWatchlist] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterHazardous, setFilterHazardous] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [removingId, setRemovingId] = useState(null);

  // Fetch watchlist
  const fetchWatchlist = async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/watchlist', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!res.ok) {
        throw new Error('Failed to load your watchlist.');
      }
      const data = await res.json();
      setWatchlist(data.watchlist || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWatchlist();
  }, [token]);

  // Remove from watchlist
  const handleRemove = async (neoId, e) => {
    e.stopPropagation();
    if (!token) return;

    setRemovingId(neoId);
    try {
      const res = await fetch(`/api/watchlist/${neoId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!res.ok) {
        throw new Error('Failed to remove asteroid from watchlist.');
      }
      // Update local state
      setWatchlist(prev => prev.filter(item => item.id !== neoId));
      if (onWatchlistChanged) {
        onWatchlistChanged(neoId, false);
      }
    } catch (err) {
      alert(err.message);
    } finally {
      setRemovingId(null);
    }
  };

  // Filtered asteroids
  const filteredList = useMemo(() => {
    return watchlist.filter(item => {
      if (filterHazardous && !item.is_potentially_hazardous) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = item.name && item.name.toLowerCase().includes(q);
        const matchesRef = item.neo_reference_id && item.neo_reference_id.toString().includes(q);
        if (!matchesName && !matchesRef) return false;
      }
      return true;
    });
  }, [watchlist, filterHazardous, searchQuery]);

  const hazardousCount = watchlist.filter(w => w.is_potentially_hazardous).length;

  const formatDiameter = (minKm, maxKm) => {
    if (!minKm && !maxKm) return 'Unknown size';
    const avgKm = (minKm + maxKm) / 2;
    if (avgKm < 1) {
      return `${Math.round(minKm * 1000)}m - ${Math.round(maxKm * 1000)}m`;
    }
    return `${minKm.toFixed(2)} - ${maxKm.toFixed(2)} km`;
  };

  const formatDistance = (km) => {
    if (!km) return 'No encounter data';
    const num = Number(km);
    const ld = (num / 384400).toFixed(1);
    const millions = (num / 1000000).toFixed(2);
    return `${millions}M km (${ld} Lunar Distances)`;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="watchlist-container" id="watchlist-view">
      {/* Watchlist Header Banner */}
      <section className="watchlist-hero-card">
        <div className="watchlist-hero-content">
          <div className="watchlist-hero-icon">⭐</div>
          <div>
            <h2 className="watchlist-hero-title">Personal Asteroid Watchlist</h2>
            <p className="watchlist-hero-subtitle">
              Tracking celestial bodies flagged by <strong>{user?.email}</strong>. 
              Monitor close-approach dates, check observing visibility, and track hazard alerts in one unified dashboard.
            </p>
          </div>
        </div>

        {/* Quick summary badges */}
        <div className="watchlist-stats-pills">
          <div className="watchlist-stat-pill">
            <span className="pill-number">{watchlist.length}</span>
            <span className="pill-label">Tracked Objects</span>
          </div>
          <div className="watchlist-stat-pill hazard">
            <span className="pill-number">{hazardousCount}</span>
            <span className="pill-label">Tracked Hazards</span>
          </div>
          <div className="watchlist-stat-pill safe">
            <span className="pill-number">{watchlist.length - hazardousCount}</span>
            <span className="pill-label">Low Risk Targets</span>
          </div>
        </div>
      </section>

      {/* Control bar */}
      <div className="watchlist-controls">
        <div className="search-box">
          <svg className="search-icon-svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <input
            type="text"
            className="search-input"
            placeholder="Search within your tracked asteroids..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="watchlist-filter-actions">
          <button
            type="button"
            className={`watchlist-filter-chip ${!filterHazardous ? 'active' : ''}`}
            onClick={() => setFilterHazardous(false)}
          >
            All Tracked ({watchlist.length})
          </button>
          <button
            type="button"
            className={`watchlist-filter-chip danger ${filterHazardous ? 'active' : ''}`}
            onClick={() => setFilterHazardous(true)}
          >
            ⚠️ Tracked Hazards Only ({hazardousCount})
          </button>
          <button
            type="button"
            className="watchlist-refresh-btn"
            onClick={fetchWatchlist}
            title="Refresh watchlist"
          >
            🔄 Refresh
          </button>
        </div>
      </div>

      {/* Body Content */}
      {loading ? (
        <div className="loading-box" id="watchlist-loading">
          <div className="spinner" />
          <p>Loading your saved asteroids...</p>
        </div>
      ) : error ? (
        <div className="error-box" id="watchlist-error">
          <p>⚠️ {error}</p>
          <button className="page-btn" onClick={fetchWatchlist}>Retry</button>
        </div>
      ) : watchlist.length === 0 ? (
        <div className="watchlist-empty-state" id="watchlist-empty">
          <div className="empty-state-graphic">🌌</div>
          <h3>Your Watchlist is Empty</h3>
          <p>
            You haven't bookmarked any asteroids yet. Explore the Asteroid Catalog or Interactive Sky Map and click the Star (★) button on any asteroid to track its trajectory and close approaches here!
          </p>
          <button
            type="button"
            className="cta-explore-btn"
            onClick={() => onSwitchNav('catalog')}
          >
            ☄️ Browse Asteroid Catalog
          </button>
        </div>
      ) : filteredList.length === 0 ? (
        <div className="watchlist-empty-state">
          <p>No bookmarked asteroids match your current search/filter.</p>
          <button
            type="button"
            className="page-btn"
            onClick={() => { setSearchQuery(''); setFilterHazardous(false); }}
          >
            Clear Filters
          </button>
        </div>
      ) : (
        <div className="watchlist-grid" id="watchlist-grid">
          {filteredList.map(neo => (
            <article
              key={neo.id}
              className={`watchlist-card ${neo.is_potentially_hazardous ? 'hazardous' : ''}`}
              onClick={() => onSelectNeo(neo.id)}
            >
              <div className="watchlist-card-top">
                <div className="watchlist-card-title-group">
                  <h3 className="watchlist-card-title">{neo.name}</h3>
                  <span className="neo-ref-id">Ref #{neo.neo_reference_id}</span>
                </div>
                <div className="watchlist-card-badges">
                  <span className={`hazard-badge ${neo.is_potentially_hazardous ? 'high' : 'low'}`}>
                    {neo.is_potentially_hazardous ? '⚠️ Tracked Hazard' : '🛡️ Low Risk'}
                  </span>
                  <button
                    type="button"
                    className="watchlist-star-btn active"
                    title="Remove from watchlist"
                    disabled={removingId === neo.id}
                    onClick={(e) => handleRemove(neo.id, e)}
                  >
                    {removingId === neo.id ? '⏳' : '★'}
                  </button>
                </div>
              </div>

              {/* Quick Metrics */}
              <div className="watchlist-metrics-grid">
                <div className="quick-metric">
                  <span className="metric-label">Estimated Size</span>
                  <span className="metric-val">{formatDiameter(neo.estimated_diameter_min_km, neo.estimated_diameter_max_km)}</span>
                </div>
                <div className="quick-metric">
                  <span className="metric-label">Brightness</span>
                  <span className="metric-val">{neo.absolute_magnitude_h ? `${neo.absolute_magnitude_h} H` : 'N/A'}</span>
                </div>
                <div className="quick-metric">
                  <span className="metric-label">Closest Approach</span>
                  <span className="metric-val highlight">{formatDistance(neo.closest_miss_distance_km)}</span>
                </div>
                <div className="quick-metric">
                  <span className="metric-label">Closest Date</span>
                  <span className="metric-val">{formatDate(neo.closest_approach_date)}</span>
                </div>
              </div>

              {/* Quick Action Footer */}
              <div className="watchlist-card-actions">
                <button
                  type="button"
                  className="card-action-btn primary"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectNeo(neo.id);
                  }}
                >
                  🔍 View Details & AI Risk
                </button>
                <button
                  type="button"
                  className="card-action-btn secondary"
                  onClick={(e) => {
                    e.stopPropagation();
                    onPredictTarget(neo.id);
                  }}
                >
                  🔭 Visibility
                </button>
                <button
                  type="button"
                  className="card-action-btn secondary"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSwitchNav('skymap');
                  }}
                >
                  🌌 Sky Map
                </button>
              </div>

              <div className="watchlist-added-timestamp">
                Bookmarked: {formatDate(neo.added_at)}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
