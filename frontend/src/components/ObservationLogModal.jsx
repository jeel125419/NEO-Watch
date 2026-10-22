import React, { useState, useEffect, useMemo } from 'react';

export default function ObservationLogModal({
  isOpen,
  onClose,
  token,
  currentUser,
  preselectedNeoId,
  preselectedNeoName,
  onObservationAdded,
  onRequireAuth
}) {
  const [activeTab, setActiveTab] = useState('list'); // 'list' | 'create'
  const [observations, setObservations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Catalog cache for asteroid selector
  const [neoOptions, setNeoOptions] = useState([]);
  const [neoSearch, setNeoSearch] = useState('');
  const [loadingNeos, setLoadingNeos] = useState(false);

  // Form State
  const [selectedNeoId, setSelectedNeoId] = useState('');
  const [observedAt, setObservedAt] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [notes, setNotes] = useState('');
  const [geoLocating, setGeoLocating] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Edit State
  const [editingId, setEditingId] = useState(null);
  const [editingNotes, setEditingNotes] = useState('');
  const [updatingId, setUpdatingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  // Helper to format ISO to datetime-local string
  const toLocalDatetimeInput = (date = new Date()) => {
    const pad = (n) => String(n).padStart(2, '0');
    const y = date.getFullYear();
    const m = pad(date.getMonth() + 1);
    const d = pad(date.getDate());
    const hh = pad(date.getHours());
    const mm = pad(date.getMinutes());
    return `${y}-${m}-${d}T${hh}:${mm}`;
  };

  // Reset or initialize form when opened or preselected target changes
  useEffect(() => {
    if (!isOpen) return;

    if (!token || !currentUser) {
      if (onRequireAuth) onRequireAuth();
      onClose();
      return;
    }

    // Set default datetime to now
    setObservedAt(toLocalDatetimeInput());
    setError(null);
    setSuccessMsg(null);

    // Fetch user sightings
    fetchObservations();

    // Fetch asteroid list if not already loaded
    fetchNeoCatalog();

    // If preselected NEO provided, open directly in 'create' tab with target chosen
    if (preselectedNeoId) {
      setSelectedNeoId(String(preselectedNeoId));
      setActiveTab('create');
    } else {
      setActiveTab('list');
    }
  }, [isOpen, preselectedNeoId, token]);

  // Fetch observations from backend
  const fetchObservations = async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/observations', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!res.ok) {
        if (res.status === 401 && onRequireAuth) {
          onRequireAuth();
          onClose();
          return;
        }
        throw new Error('Failed to load observation logs.');
      }
      const data = await res.json();
      setObservations(data.observations || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Fetch asteroid catalog for dropdown
  const fetchNeoCatalog = async () => {
    if (neoOptions.length > 0) return;
    setLoadingNeos(true);
    try {
      const res = await fetch('/api/neos?limit=100&sortBy=name&sortOrder=ASC');
      if (res.ok) {
        const data = await res.json();
        setNeoOptions(data.data || []);
      }
    } catch (err) {
      console.warn('Could not load asteroid catalog for selector:', err);
    } finally {
      setLoadingNeos(false);
    }
  };

  // Browser Geolocation auto-fill
  const handleAutoGeolocate = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser.');
      return;
    }
    setGeoLocating(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const latVal = Number(pos.coords.latitude.toFixed(5));
        const lonVal = Number(pos.coords.longitude.toFixed(5));
        setLatitude(latVal);
        setLongitude(lonVal);
        setGeoLocating(false);
        const accuracyNote = pos.coords.accuracy ? ` (±${Math.round(pos.coords.accuracy)}m accuracy)` : '';
        setSuccessMsg(`📍 Location acquired: ${latVal}°, ${lonVal}°${accuracyNote}`);
        setTimeout(() => setSuccessMsg(null), 4000);
      },
      (err) => {
        setGeoLocating(false);
        setError(`Could not detect location: ${err.message}. Please enter coordinates manually.`);
      },
      { timeout: 15000, enableHighAccuracy: true, maximumAge: 0 }
    );
  };

  // Handle Form Submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    const neoId = parseInt(selectedNeoId, 10);
    if (!neoId) {
      setError('Please select a target asteroid.');
      return;
    }

    if (!observedAt) {
      setError('Observation date and time is required.');
      return;
    }

    const obsDate = new Date(observedAt);
    if (isNaN(obsDate.getTime())) {
      setError('Invalid date format.');
      return;
    }
    if (obsDate.getTime() > Date.now() + 5 * 60 * 1000) {
      setError('Observation time cannot be in the future.');
      return;
    }

    const latNum = parseFloat(latitude);
    const lonNum = parseFloat(longitude);
    if (isNaN(latNum) || latNum < -90 || latNum > 90) {
      setError('Please provide a valid latitude between -90 and +90.');
      return;
    }
    if (isNaN(lonNum) || lonNum < -180 || lonNum > 180) {
      setError('Please provide a valid longitude between -180 and +180.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/observations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          neo_object_id: neoId,
          observed_at: obsDate.toISOString(),
          lat: latNum,
          long: lonNum,
          notes: notes.trim()
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit observation.');
      }

      // Success
      setSuccessMsg('✨ Asteroid sighting logged successfully!');
      setObservations(prev => [data.observation, ...prev]);
      setNotes('');
      if (onObservationAdded) {
        onObservationAdded(data.observation);
      }

      // Switch back to list after short pause
      setTimeout(() => {
        setActiveTab('list');
        setSuccessMsg(null);
      }, 1200);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Delete
  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this observation record?')) return;

    setDeletingId(id);
    try {
      const res = await fetch(`/api/observations/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete observation.');
      }
      setObservations(prev => prev.filter(o => o.id !== id));
      if (onObservationAdded) {
        onObservationAdded({ id, deleted: true });
      }
    } catch (err) {
      alert(err.message);
    } finally {
      setDeletingId(null);
    }
  };

  // Handle Update Notes
  const handleStartEdit = (obs) => {
    setEditingId(obs.id);
    setEditingNotes(obs.notes || '');
  };

  const handleSaveEdit = async (id) => {
    setUpdatingId(id);
    try {
      const res = await fetch(`/api/observations/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ notes: editingNotes })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update observation.');
      }
      setObservations(prev => prev.map(o => (o.id === id ? { ...o, notes: data.observation.notes } : o)));
      setEditingId(null);
    } catch (err) {
      alert(err.message);
    } finally {
      setUpdatingId(null);
    }
  };

  // Filtered dropdown options based on search query
  const filteredNeoOptions = useMemo(() => {
    if (!neoSearch.trim()) return neoOptions;
    const q = neoSearch.toLowerCase();
    return neoOptions.filter(n =>
      (n.name && n.name.toLowerCase().includes(q)) ||
      (n.neo_reference_id && String(n.neo_reference_id).includes(q))
    );
  }, [neoOptions, neoSearch]);

  if (!isOpen) return null;

  return (
    <div className="obs-drawer-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="obs-drawer-panel" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="obs-drawer-header">
          <div className="obs-drawer-title-group">
            <div className="obs-drawer-title-row">
              <span className="obs-icon">📓</span>
              <h2 className="obs-drawer-title">Citizen Science Observation Log</h2>
            </div>
            <p className="obs-drawer-subtitle">
              Record amateur telescope observations, sky notes & visual sightings.
            </p>
          </div>
          <button
            type="button"
            className="obs-drawer-close-btn"
            onClick={onClose}
            aria-label="Close Observation Log"
          >
            &times;
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="obs-drawer-nav">
          <button
            type="button"
            id="tab-obs-list-btn"
            className={`obs-nav-tab ${activeTab === 'list' ? 'active' : ''}`}
            onClick={() => setActiveTab('list')}
          >
            <span>🔭 My Sightings</span>
            <span className="obs-badge-count">{observations.length}</span>
          </button>
          <button
            type="button"
            id="tab-obs-create-btn"
            className={`obs-nav-tab ${activeTab === 'create' ? 'active' : ''}`}
            onClick={() => setActiveTab('create')}
          >
            <span>➕ Log New Sighting</span>
          </button>
        </div>

        {/* Alerts */}
        {error && (
          <div className="obs-alert error">
            <span>⚠️ {error}</span>
          </div>
        )}
        {successMsg && (
          <div className="obs-alert success">
            <span>{successMsg}</span>
          </div>
        )}

        {/* Content Body */}
        <div className="obs-drawer-body">
          {/* TAB 1: SIGHTINGS LIST */}
          {activeTab === 'list' && (
            <div className="obs-list-view">
              {loading ? (
                <div className="loading-box">
                  <div className="spinner" />
                  <p>Loading your observation records...</p>
                </div>
              ) : observations.length === 0 ? (
                <div className="obs-empty-state">
                  <div className="obs-empty-icon">🪐</div>
                  <h3>No Sightings Recorded Yet</h3>
                  <p>
                    Have you spotted an asteroid through your telescope, binoculars, or observatory camera? 
                    Log your observations to build your personal citizen science astronomy archive.
                  </p>
                  <button
                    type="button"
                    className="cta-explore-btn"
                    onClick={() => setActiveTab('create')}
                  >
                    ➕ Record Your First Sighting
                  </button>
                </div>
              ) : (
                <div className="obs-cards-list">
                  {observations.map((obs) => {
                    const obsDate = new Date(obs.observed_at);
                    const isEditing = editingId === obs.id;

                    return (
                      <article key={obs.id} className="obs-entry-card">
                        <div className="obs-card-header">
                          <div className="obs-card-target">
                            <span className="target-name">☄️ {obs.neo_name || `Asteroid #${obs.neo_object_id}`}</span>
                            {obs.neo_reference_id && (
                              <span className="neo-ref-id">Ref #{obs.neo_reference_id}</span>
                            )}
                          </div>
                          <div className="obs-card-actions">
                            {!isEditing && (
                              <button
                                type="button"
                                className="obs-edit-btn"
                                title="Edit notes"
                                onClick={() => handleStartEdit(obs)}
                              >
                                ✏️
                              </button>
                            )}
                            <button
                              type="button"
                              className="obs-delete-btn"
                              title="Delete sighting record"
                              disabled={deletingId === obs.id}
                              onClick={(e) => handleDelete(obs.id, e)}
                            >
                              {deletingId === obs.id ? '⏳' : '🗑️'}
                            </button>
                          </div>
                        </div>

                        {/* Metadata Pills */}
                        <div className="obs-meta-pills">
                          <span className="obs-pill" title="Observation timestamp">
                            📅 {obsDate.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })} at {obsDate.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          <span className="obs-pill location" title="Observer geographic coordinates">
                            📍 {Number(obs.lat).toFixed(4)}°, {Number(obs.long).toFixed(4)}°
                          </span>
                        </div>

                        {/* Observation Notes */}
                        <div className="obs-notes-section">
                          {isEditing ? (
                            <div className="obs-edit-box">
                              <textarea
                                className="obs-edit-textarea"
                                value={editingNotes}
                                maxLength={1000}
                                onChange={(e) => setEditingNotes(e.target.value)}
                                placeholder="Edit your observation equipment, magnitude, or sky conditions..."
                                rows={3}
                              />
                              <div className="obs-edit-actions">
                                <button
                                  type="button"
                                  className="obs-save-edit-btn"
                                  disabled={updatingId === obs.id}
                                  onClick={() => handleSaveEdit(obs.id)}
                                >
                                  {updatingId === obs.id ? 'Saving...' : '💾 Save'}
                                </button>
                                <button
                                  type="button"
                                  className="obs-cancel-edit-btn"
                                  onClick={() => setEditingId(null)}
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <p className="obs-notes-text">
                              {obs.notes ? obs.notes : <em className="text-muted">No notes recorded for this sighting.</em>}
                            </p>
                          )}
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: LOG NEW SIGHTING FORM */}
          {activeTab === 'create' && (
            <form className="obs-form" onSubmit={handleSubmit}>
              {/* Asteroid Target Selector */}
              <div className="obs-form-group">
                <label htmlFor="obs-target-select" className="obs-form-label">
                  Target Asteroid <span className="req">*</span>
                </label>
                
                {preselectedNeoId && preselectedNeoName ? (
                  <div className="obs-preselected-target">
                    <span>☄️ <strong>{preselectedNeoName}</strong> (ID #{preselectedNeoId})</span>
                    <button
                      type="button"
                      className="obs-change-target-btn"
                      onClick={() => {
                        setSelectedNeoId('');
                      }}
                    >
                      Change
                    </button>
                  </div>
                ) : (
                  <div className="obs-select-wrapper">
                    {neoOptions.length > 10 && (
                      <input
                        type="text"
                        className="obs-filter-input"
                        placeholder="Filter asteroids by name..."
                        value={neoSearch}
                        onChange={(e) => setNeoSearch(e.target.value)}
                      />
                    )}
                    <select
                      id="obs-target-select"
                      className="obs-select"
                      value={selectedNeoId}
                      onChange={(e) => setSelectedNeoId(e.target.value)}
                      required
                    >
                      <option value="">-- Choose Target Asteroid --</option>
                      {filteredNeoOptions.map(n => (
                        <option key={n.id} value={n.id}>
                          {n.name} {n.is_potentially_hazardous ? '(⚠️ PHA)' : ''}
                        </option>
                      ))}
                    </select>
                    {loadingNeos && <span className="obs-hint">Loading catalog list...</span>}
                  </div>
                )}
              </div>

              {/* Observed At Date-Time */}
              <div className="obs-form-group">
                <label htmlFor="obs-datetime-input" className="obs-form-label">
                  Observation Date & Time (Local) <span className="req">*</span>
                </label>
                <input
                  id="obs-datetime-input"
                  type="datetime-local"
                  className="obs-input"
                  value={observedAt}
                  max={toLocalDatetimeInput()}
                  onChange={(e) => setObservedAt(e.target.value)}
                  required
                />
                <span className="obs-hint">Cannot be in the future. Defaults to current moment.</span>
              </div>

              {/* Observer Geolocation */}
              <div className="obs-form-group">
                <div className="obs-label-with-action">
                  <label className="obs-form-label">Observer Location <span className="req">*</span></label>
                  <button
                    type="button"
                    className="obs-geo-btn"
                    onClick={handleAutoGeolocate}
                    disabled={geoLocating}
                  >
                    {geoLocating ? '📡 Locating...' : '📍 Auto-Detect GPS'}
                  </button>
                </div>
                <div className="obs-coords-row">
                  <div className="obs-coord-field">
                    <span className="coord-label">Latitude</span>
                    <input
                      type="number"
                      step="any"
                      min="-90"
                      max="90"
                      className="obs-input"
                      placeholder="e.g. 34.0522"
                      value={latitude}
                      onChange={(e) => setLatitude(e.target.value)}
                      required
                    />
                  </div>
                  <div className="obs-coord-field">
                    <span className="coord-label">Longitude</span>
                    <input
                      type="number"
                      step="any"
                      min="-180"
                      max="180"
                      className="obs-input"
                      placeholder="e.g. -118.2437"
                      value={longitude}
                      onChange={(e) => setLongitude(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <span className="obs-hint">Auto-detected GPS or enter custom coordinates with any precision. (100m ~ 0.0009° has negligible impact on orbital angles).</span>
              </div>

              {/* Notes / Optical Setup */}
              <div className="obs-form-group">
                <div className="obs-label-with-action">
                  <label htmlFor="obs-notes-textarea" className="obs-form-label">
                    Telescope, Equipment & Sky Notes
                  </label>
                  <span className="char-counter">{notes.length}/1000</span>
                </div>
                <textarea
                  id="obs-notes-textarea"
                  className="obs-textarea"
                  rows={4}
                  maxLength={1000}
                  placeholder="E.g., Sky transparency 4/5, Celestron 8-inch SCT, Sony A7s III, 30s exposure, apparent mag ~14.1..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
                <span className="obs-hint">
                  Include telescope aperture, eyepiece/camera, sky transparency, seeing quality, and estimated visual brightness.
                </span>
              </div>

              {/* Form Buttons */}
              <div className="obs-form-actions">
                <button
                  type="submit"
                  id="obs-submit-btn"
                  className="obs-submit-btn"
                  disabled={submitting}
                >
                  {submitting ? '🚀 Logging Sighting...' : '🚀 Save Observation Record'}
                </button>
                <button
                  type="button"
                  className="obs-cancel-btn"
                  onClick={() => setActiveTab('list')}
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
