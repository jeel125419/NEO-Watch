import React, { useState, useEffect } from 'react';
import VisibilityPredictor from './components/VisibilityPredictor.jsx';
import SkyMap from './components/SkyMap.jsx';
import AuthModal from './components/AuthModal.jsx';
import WatchlistView from './components/WatchlistView.jsx';
import ObservationLogModal from './components/ObservationLogModal.jsx';
import AstroDeepLinks from './components/AstroDeepLinks.jsx';
import NotificationCenter from './components/NotificationCenter.jsx';
import ThemeModal, { THEMES } from './components/ThemeModal.jsx';
import './App.css';

export default function App() {
  const [activeNav, setActiveNav] = useState('catalog'); // 'catalog' | 'visibility' | 'skymap' | 'watchlist'
  const [predictTargetNeoId, setPredictTargetNeoId] = useState(null);

  // UI Theme & Template State
  const [currentTheme, setCurrentTheme] = useState(() => {
    try {
      return localStorage.getItem('neo_theme') || 'deep-space';
    } catch {
      return 'deep-space';
    }
  });
  const [showThemeModal, setShowThemeModal] = useState(false);

  // Sync theme attribute to document element
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', currentTheme);
    try {
      localStorage.setItem('neo_theme', currentTheme);
    } catch (e) {
      console.warn('Could not persist theme:', e);
    }
  }, [currentTheme]);

  // Authentication & Watchlist State (Phase 7)
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem('neo_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState(() => localStorage.getItem('neo_token') || null);
  const [watchlistIds, setWatchlistIds] = useState(new Set());
  const [showAuthModal, setShowAuthModal] = useState(false);

  // Citizen Science Observations State (Phase 8)
  const [showObsModal, setShowObsModal] = useState(false);
  const [obsTargetNeo, setObsTargetNeo] = useState(null);
  const [totalObsCount, setTotalObsCount] = useState(0);
  const [obsCountByNeo, setObsCountByNeo] = useState({});

  // Notifications State (Phase 9)
  const [showNotifModal, setShowNotifModal] = useState(false);
  const [unreadNotifCount, setUnreadNotifCount] = useState(0);

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

  // Sync Watchlist IDs when authenticated
  useEffect(() => {
    if (!token) {
      setWatchlistIds(new Set());
      return;
    }

    fetch('/api/watchlist/ids', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
      .then(res => {
        if (res.status === 401) {
          handleLogout();
          throw new Error('Session expired');
        }
        return res.json();
      })
      .then(data => {
        if (data.ids && Array.isArray(data.ids)) {
          setWatchlistIds(new Set(data.ids));
        }
      })
      .catch(err => {
        console.warn('[Watchlist Sync]', err.message);
      });
  }, [token]);

  // Sync Observations count & distribution when authenticated (Phase 8)
  const fetchObservationStats = () => {
    if (!token) {
      setTotalObsCount(0);
      setObsCountByNeo({});
      return;
    }

    fetch('/api/observations', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
      .then(res => {
        if (res.status === 401) {
          handleLogout();
          throw new Error('Session expired');
        }
        return res.json();
      })
      .then(data => {
        if (data.observations && Array.isArray(data.observations)) {
          setTotalObsCount(data.observations.length);
          const counts = {};
          for (const obs of data.observations) {
            counts[obs.neo_object_id] = (counts[obs.neo_object_id] || 0) + 1;
          }
          setObsCountByNeo(counts);
        }
      })
      .catch(err => {
        console.warn('[Observations Sync]', err.message);
      });
  };

  useEffect(() => {
    fetchObservationStats();
  }, [token]);

  // Sync Unread Notifications count & auto-check alerts (Phase 9)
  const syncNotifications = () => {
    if (!token) {
      setUnreadNotifCount(0);
      return;
    }

    fetch('/api/notifications/unread-count', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        if (data && typeof data.unreadCount === 'number') {
          setUnreadNotifCount(data.unreadCount);
        }
      })
      .catch(err => console.warn('[Notif Sync]', err));
  };

  useEffect(() => {
    syncNotifications();
    if (token) {
      fetch('/api/notifications/check-alerts', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      })
        .then(() => syncNotifications())
        .catch(err => console.warn(err));
    }
  }, [token]);

  const handleAuthSuccess = (userData, userToken) => {
    setCurrentUser(userData);
    setToken(userToken);
    try {
      localStorage.setItem('neo_user', JSON.stringify(userData));
      localStorage.setItem('neo_token', userToken);
    } catch (e) {
      console.error(e);
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setToken(null);
    setWatchlistIds(new Set());
    setTotalObsCount(0);
    setObsCountByNeo({});
    setUnreadNotifCount(0);
    try {
      localStorage.removeItem('neo_user');
      localStorage.removeItem('neo_token');
    } catch (e) {
      console.error(e);
    }
    if (activeNav === 'watchlist') {
      setActiveNav('catalog');
    }
  };

  const handleOpenObservationModal = (targetNeo = null) => {
    if (!currentUser || !token) {
      setShowAuthModal(true);
      return;
    }
    setObsTargetNeo(targetNeo ? { id: targetNeo.id, name: targetNeo.name } : null);
    setShowObsModal(true);
  };

  const handleObservationAdded = () => {
    fetchObservationStats();
  };

  const handleToggleWatchlist = async (neoId, e) => {
    if (e) e.stopPropagation();

    if (!currentUser || !token) {
      setShowAuthModal(true);
      return;
    }

    const isAlreadyIn = watchlistIds.has(neoId);

    // Optimistic toggle
    setWatchlistIds(prev => {
      const next = new Set(prev);
      if (isAlreadyIn) {
        next.delete(neoId);
      } else {
        next.add(neoId);
      }
      return next;
    });

    try {
      const endpoint = `/api/watchlist/${neoId}`;
      const method = isAlreadyIn ? 'DELETE' : 'POST';
      const res = await fetch(endpoint, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!res.ok) {
        // Revert on failure
        setWatchlistIds(prev => {
          const next = new Set(prev);
          if (isAlreadyIn) next.add(neoId);
          else next.delete(neoId);
          return next;
        });
        const errData = await res.json();
        alert(errData.error || 'Failed to update watchlist.');
      } else if (!isAlreadyIn) {
        // Evaluate alerts for newly bookmarked asteroid
        fetch('/api/notifications/check-alerts', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` }
        })
          .then(() => syncNotifications())
          .catch(err => console.warn(err));
      }
    } catch (err) {
      console.error('Watchlist toggle error:', err);
      // Revert on network error
      setWatchlistIds(prev => {
        const next = new Set(prev);
        if (isAlreadyIn) next.add(neoId);
        else next.delete(neoId);
        return next;
      });
    }
  };

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
            <p className="brand-subtitle">Near-Earth Asteroid Explorer & Orbital Telemetry</p>
          </div>
        </div>

        <div className="header-badges">
          <button
            type="button"
            id="header-theme-selector-btn"
            className="header-theme-btn"
            onClick={() => setShowThemeModal(true)}
            title="Preview and change UI template / theme style"
          >
            <span>🎨</span>
            <span>{THEMES.find(t => t.id === currentTheme)?.name || 'Theme'}</span>
          </button>

          <div className="status-badge" id="backend-status-badge">
            <span className={`status-dot ${backendHealthy ? 'active' : 'fallback'}`} />
            <span>Backend: {backendHealthy ? 'Connected' : 'Offline'}</span>
          </div>

          {currentUser ? (
            <div className="user-profile-pill" id="user-profile-pill">
              <span className="user-email-text" title={currentUser.email}>
                👤 {currentUser.email.split('@')[0]}
              </span>
              <button
                type="button"
                className="watchlist-quick-badge"
                title="View your saved asteroid watchlist"
                onClick={() => setActiveNav('watchlist')}
              >
                ⭐ {watchlistIds.size}
              </button>
              <button
                type="button"
                className="obs-quick-badge"
                title="Open Citizen Science Observation Log"
                onClick={() => handleOpenObservationModal(null)}
              >
                📓 {totalObsCount}
              </button>
              <button
                type="button"
                id="header-notif-bell-btn"
                className={`notif-quick-badge ${unreadNotifCount > 0 ? 'has-unread' : ''}`}
                title="View Notifications & Refinement Alerts"
                onClick={() => setShowNotifModal(true)}
              >
                <span>🔔</span>
                {unreadNotifCount > 0 && (
                  <span className="notif-bubble-count">{unreadNotifCount}</span>
                )}
              </button>
              <button
                type="button"
                className="auth-logout-btn"
                title="Sign out of your account"
                onClick={handleLogout}
              >
                Sign Out
              </button>
            </div>
          ) : (
            <button
              type="button"
              id="header-sign-in-btn"
              className="auth-login-pill-btn"
              onClick={() => setShowAuthModal(true)}
            >
              🔑 Sign In
            </button>
          )}
        </div>
      </header>

      {/* Main Navigation Tabs */}
      <nav className="app-main-nav" aria-label="Main Navigation">
        <button
          id="nav-catalog-btn"
          type="button"
          className={`main-nav-btn ${activeNav === 'catalog' ? 'active' : ''}`}
          onClick={() => setActiveNav('catalog')}
        >
          <span>☄️ Asteroid Catalog</span>
        </button>
        <button
          id="nav-visibility-btn"
          type="button"
          className={`main-nav-btn ${activeNav === 'visibility' ? 'active' : ''}`}
          onClick={() => setActiveNav('visibility')}
        >
          <span>🔭 Tonight’s Visibility Predictor</span>
        </button>
        <button
          id="nav-skymap-btn"
          type="button"
          className={`main-nav-btn ${activeNav === 'skymap' ? 'active' : ''}`}
          onClick={() => setActiveNav('skymap')}
        >
          <span>🌌 Interactive Sky Map</span>
        </button>
        <button
          id="nav-watchlist-btn"
          type="button"
          className={`main-nav-btn ${activeNav === 'watchlist' ? 'active' : ''}`}
          onClick={() => {
            if (!currentUser) {
              setShowAuthModal(true);
            } else {
              setActiveNav('watchlist');
            }
          }}
        >
          <span>⭐ My Watchlist {currentUser && watchlistIds.size > 0 ? `(${watchlistIds.size})` : ''}</span>
        </button>
        <button
          id="nav-observations-btn"
          type="button"
          className="main-nav-btn obs-nav-trigger"
          onClick={() => handleOpenObservationModal(null)}
        >
          <span>📓 Observation Log {currentUser && totalObsCount > 0 ? `(${totalObsCount})` : ''}</span>
        </button>
      </nav>

      {/* VIEW 1: Asteroid Catalog */}
      {activeNav === 'catalog' && (
        <>
          {/* Educational Banner */}
          <section className="info-banner" aria-label="Educational context">
            <div className="info-icon">🪐</div>
            <div className="info-text">
              <h3>Understanding NASA's "Potentially Hazardous Asteroid" Classification</h3>
              <p>
                NASA designates a near-Earth object as a <strong>Potentially Hazardous Asteroid (PHA)</strong> if its orbit approaches within <strong>0.05 AU</strong> (approx. 7.5 million km or 19.5 Lunar Distances) of Earth's orbit and its estimated diameter exceeds approximately <strong>140 meters</strong>. This is an administrative threshold used by astronomers to prioritize continuous radar and optical tracking — <em>it does not mean an Earth impact is predicted</em>.
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
            <option value="">All Near-Earth Objects</option>
            <option value="true">NASA Tracked PHAs Only</option>
            <option value="false">Standard NEOs (Non-PHA)</option>
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

      {/* Quick Stats Strip (Verified Real Data Only) */}
      <section className="stats-strip" aria-label="Database statistics">
        <div className="stat-card">
          <span className="stat-label">Cataloged Near-Earth Objects</span>
          <span className="stat-value">{pagination.total}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Active Catalog Page</span>
          <span className="stat-value">{page} / {pagination.totalPages || 1}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Orbit Calculation Ephemeris</span>
          <span className="stat-value" style={{ fontSize: '1.2rem', color: 'var(--accent-lavender)' }}>
            NASA JPL HORIZONS
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
                className={`neo-card ${neo.is_potentially_hazardous ? 'pha-tracked' : ''}`}
                onClick={() => setSelectedNeoId(neo.id)}
              >
                <div className="neo-card-header">
                  <div>
                    <h2 className="neo-card-title">{neo.name}</h2>
                    <span className="neo-ref-id">Ref #{neo.neo_reference_id}</span>
                  </div>

                  <div className="neo-card-actions-cluster">
                    <button
                      type="button"
                      id={`star-btn-${neo.id}`}
                      className={`star-bookmark-btn ${watchlistIds.has(neo.id) ? 'active' : ''}`}
                      title={watchlistIds.has(neo.id) ? 'Remove from Watchlist' : 'Add to Watchlist'}
                      onClick={(e) => handleToggleWatchlist(neo.id, e)}
                      aria-label={watchlistIds.has(neo.id) ? `Remove ${neo.name} from watchlist` : `Add ${neo.name} to watchlist`}
                    >
                      {watchlistIds.has(neo.id) ? '★' : '☆'}
                    </button>
                    <span className={`hazard-badge ${neo.is_potentially_hazardous ? 'pha-tracked' : 'standard-neo'}`}>
                      {neo.is_potentially_hazardous ? '⚠️ NASA Tracked PHA' : 'Standard NEO'}
                    </span>
                  </div>
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
                  <div className="card-encounter-preview">
                    <span className="card-encounter-label">Closest Approach: </span>
                    <strong className="card-encounter-val">
                      {neo.closest_miss_distance_km ? formatKm(neo.closest_miss_distance_km) : 'Historical'}
                    </strong>
                    {neo.closest_miss_distance_km && (
                      <span className="card-ld-note"> ({formatLunarDistance(neo.closest_miss_distance_km)})</span>
                    )}
                  </div>
                  <div className="card-footer-actions">
                    <button
                      type="button"
                      className="card-vis-btn"
                      title="Check tonight's sky visibility from your location"
                      onClick={(e) => {
                        e.stopPropagation();
                        setPredictTargetNeoId(neo.id);
                        setActiveNav('visibility');
                      }}
                    >
                      🔭 Stargaze
                    </button>
                    <span className="card-view-cta">
                      Details &rarr;
                    </span>
                  </div>
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
      </>
      )}

      {/* VIEW 2: Tonight's Visibility Predictor (Phase 5) */}
      {activeNav === 'visibility' && (
        <VisibilityPredictor
          initialNeoId={predictTargetNeoId}
          onSelectNeoModal={(id) => setSelectedNeoId(id)}
        />
      )}

      {/* VIEW 3: Interactive Celestial Sky Map (Phase 6) */}
      {activeNav === 'skymap' && (
        <SkyMap
          onSelectNeoDetail={(id) => setSelectedNeoId(id)}
          watchlistIds={watchlistIds}
          onToggleWatchlist={handleToggleWatchlist}
        />
      )}

      {/* VIEW 4: Personal Asteroid Watchlist (Phase 7) */}
      {activeNav === 'watchlist' && (
        <WatchlistView
          token={token}
          user={currentUser}
          onSelectNeo={(id) => setSelectedNeoId(id)}
          onSwitchNav={(nav) => setActiveNav(nav)}
          onPredictTarget={(id) => {
            setPredictTargetNeoId(id);
            setActiveNav('visibility');
          }}
          onWatchlistChanged={(id, isAdded) => {
            setWatchlistIds(prev => {
              const next = new Set(prev);
              if (isAdded) next.add(id);
              else next.delete(id);
              return next;
            });
          }}
          onLogObservation={(neo) => handleOpenObservationModal(neo)}
          obsCountByNeo={obsCountByNeo}
        />
      )}

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
                    <div className="modal-title-row">
                      <h2>{selectedNeoDetail.name}</h2>
                      <div className="modal-actions-toolbar">
                        <button
                          type="button"
                          id="modal-watchlist-toggle-btn"
                          className={`modal-watchlist-btn ${watchlistIds.has(selectedNeoDetail.id) ? 'active' : ''}`}
                          onClick={(e) => handleToggleWatchlist(selectedNeoDetail.id, e)}
                          title={watchlistIds.has(selectedNeoDetail.id) ? 'Remove from Watchlist' : 'Add to Watchlist'}
                        >
                          <span>{watchlistIds.has(selectedNeoDetail.id) ? '★' : '☆'}</span>
                          <span>{watchlistIds.has(selectedNeoDetail.id) ? 'Tracked' : 'Watchlist'}</span>
                        </button>
                        <button
                          type="button"
                          id="modal-obs-log-btn"
                          className="modal-obs-action-btn"
                          onClick={() => handleOpenObservationModal(selectedNeoDetail)}
                          title="Record an amateur telescope or optical observation"
                        >
                          <span>📓 Log Sighting</span>
                          {obsCountByNeo[selectedNeoDetail.id] > 0 && (
                            <span className="modal-pill-badge">{obsCountByNeo[selectedNeoDetail.id]}</span>
                          )}
                        </button>
                      </div>
                    </div>
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
                  {/* LAYER 1: Always Visible, Plain-Language Scientific Classification */}
                  <section className="plain-language-card" aria-label="NASA classification and scientific context">
                    <div className="tier-headline">
                      <span className={`hazard-badge ${selectedNeoDetail.is_potentially_hazardous ? 'pha-tracked' : 'standard-neo'}`} style={{ fontSize: '0.85rem', padding: '0.4rem 0.9rem' }}>
                        {selectedNeoDetail.is_potentially_hazardous ? '⚠️ NASA Tracked PHA' : 'Standard Near-Earth Object'}
                      </span>
                      <span className="tier-text">
                        {selectedNeoDetail.is_potentially_hazardous
                          ? 'Meets NASA size and orbital proximity criteria for continuous tracking'
                          : 'Does not meet NASA Potentially Hazardous Asteroid criteria'}
                      </span>
                    </div>

                    <p className="plain-explanation">
                      {selectedNeoDetail.is_potentially_hazardous ? (
                        <>
                          This asteroid meets NASA’s official <strong>Potentially Hazardous Asteroid (PHA)</strong> eligibility criteria because its orbit approaches within <strong>0.05 AU</strong> (approx. 7.5 million km or 19.5 Lunar Distances) of Earth's orbit and its estimated diameter exceeds approximately <strong>140 meters</strong>. <em>This classification is an administrative monitoring priority, not a prediction of an impact.</em> It ensures global astronomical observatories maintain continuous optical and radar astrometry to refine its orbit.
                        </>
                      ) : (
                        <>
                          This object does not meet NASA’s Potentially Hazardous Asteroid threshold because its orbit does not intersect within 0.05 AU of Earth or its diameter is under 140 meters. It follows a standard near-Earth orbital path and is not flagged for specialized PHA monitoring.
                        </>
                      )}
                    </p>

                    {/* Official Data Source Attribution */}
                    <div className="source-banner official-source" id="nasa-source-banner">
                      <span>🪐</span>
                      <div>
                        <strong>Authoritative Data Source:</strong> Official NASA JPL Small-Body Database (HORIZONS Ephemeris & NeoWs API). Orbit and close-approach calculations are deterministic astronomical physics solutions.
                      </div>
                    </div>
                  </section>

                  {/* Phase 5 Stargazing Quick Action Banner */}
                  <div className="modal-vis-cta-box">
                    <div className="modal-vis-cta-text">
                      <h4>🔭 Can you see this asteroid tonight?</h4>
                      <p>Calculate topocentric altitude, moon glare interference, and exact viewing window from your location.</p>
                    </div>
                    <button
                      id="modal-open-visibility-btn"
                      type="button"
                      className="modal-vis-action-btn"
                      onClick={() => {
                        setPredictTargetNeoId(selectedNeoDetail.id);
                        setSelectedNeoId(null);
                        setActiveNav('visibility');
                      }}
                    >
                      Check Sky Visibility &rarr;
                    </button>
                  </div>

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

                        {/* External Astronomy Apps & Telescope GoTo Mount Integration */}
                        <AstroDeepLinks
                          neo={selectedNeoDetail}
                          compact={false}
                        />
                      </div>
                    )}
                  </section>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Phase 7: Authentication Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onSuccess={handleAuthSuccess}
      />

      {/* Phase 8: Citizen Science Observation Log Modal Drawer */}
      <ObservationLogModal
        isOpen={showObsModal}
        onClose={() => {
          setShowObsModal(false);
          setObsTargetNeo(null);
        }}
        token={token}
        currentUser={currentUser}
        preselectedNeoId={obsTargetNeo?.id}
        preselectedNeoName={obsTargetNeo?.name}
        onObservationAdded={handleObservationAdded}
        onRequireAuth={() => setShowAuthModal(true)}
      />

      {/* Phase 9: Notifications & Refinement Alerts Center */}
      <NotificationCenter
        isOpen={showNotifModal}
        onClose={() => setShowNotifModal(false)}
        token={token}
        currentUser={currentUser}
        onSelectNeo={(id) => setSelectedNeoId(id)}
        onRequireAuth={() => setShowAuthModal(true)}
        onNotificationsChanged={(unread) => setUnreadNotifCount(unread)}
      />

      {/* Theme & Template Switcher Modal */}
      <ThemeModal
        isOpen={showThemeModal}
        onClose={() => setShowThemeModal(false)}
        currentTheme={currentTheme}
        onSelectTheme={(themeId) => setCurrentTheme(themeId)}
      />
    </div>
  );
}
