import React, { useState, useEffect, useMemo } from 'react';

/**
 * Helper to format relative time (e.g. "5m ago", "2h ago", "3d ago")
 */
function formatRelativeTime(dateStr) {
  if (!dateStr) return '';
  const now = Date.now();
  const past = new Date(dateStr).getTime();
  const diffSec = Math.floor((now - past) / 1000);

  if (diffSec < 60) return 'Just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 30) return `${diffDays}d ago`;
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function NotificationCenter({
  isOpen,
  onClose,
  token,
  currentUser,
  onSelectNeo,
  onRequireAuth,
  onNotificationsChanged
}) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [checkingAlerts, setCheckingAlerts] = useState(false);
  const [filterTab, setFilterTab] = useState('all'); // 'all' | 'unread' | 'flyby' | 'refinement' | 'hazard'
  const [browserPushEnabled, setBrowserPushEnabled] = useState(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      return Notification.permission === 'granted';
    }
    return false;
  });

  // Fetch notifications whenever opened
  useEffect(() => {
    if (!isOpen) return;

    if (!token || !currentUser) {
      if (onRequireAuth) onRequireAuth();
      onClose();
      return;
    }

    fetchNotifications();
  }, [isOpen, token]);

  const fetchNotifications = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch('/api/notifications', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
        if (onNotificationsChanged) {
          onNotificationsChanged(data.unreadCount || 0);
        }
      }
    } catch (err) {
      console.warn('Failed to fetch notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  // Run alert evaluation engine
  const handleCheckAlerts = async () => {
    if (!token) return;
    setCheckingAlerts(true);
    try {
      const res = await fetch('/api/notifications/check-alerts', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        await fetchNotifications();
      }
    } catch (err) {
      console.warn('Alert check failed:', err);
    } finally {
      setCheckingAlerts(false);
    }
  };

  // Mark single notification as read
  const handleMarkAsRead = async (id, e) => {
    if (e) e.stopPropagation();
    try {
      const res = await fetch(`/api/notifications/${id}/read`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setNotifications(prev =>
          prev.map(n => (n.id === id ? { ...n, is_read: true } : n))
        );
        if (onNotificationsChanged) {
          const remainingUnread = notifications.filter(n => n.id !== id && !n.is_read).length;
          onNotificationsChanged(remainingUnread);
        }
      }
    } catch (err) {
      console.warn(err);
    }
  };

  // Mark all as read
  const handleMarkAllAsRead = async () => {
    try {
      const res = await fetch('/api/notifications/read-all', {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
        if (onNotificationsChanged) onNotificationsChanged(0);
      }
    } catch (err) {
      console.warn(err);
    }
  };

  // Dismiss single notification
  const handleDeleteNotification = async (id, e) => {
    if (e) e.stopPropagation();
    try {
      const res = await fetch(`/api/notifications/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setNotifications(prev => prev.filter(n => n.id !== id));
        if (onNotificationsChanged) {
          const remainingUnread = notifications.filter(n => n.id !== id && !n.is_read).length;
          onNotificationsChanged(remainingUnread);
        }
      }
    } catch (err) {
      console.warn(err);
    }
  };

  // Clear all
  const handleClearAll = async () => {
    if (!window.confirm('Clear all notification alerts?')) return;
    try {
      const res = await fetch('/api/notifications', {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setNotifications([]);
        if (onNotificationsChanged) onNotificationsChanged(0);
      }
    } catch (err) {
      console.warn(err);
    }
  };

  // Enable Browser Native Desktop Notifications
  const handleRequestPush = async () => {
    if (!('Notification' in window)) {
      alert('Your browser does not support desktop notifications.');
      return;
    }
    try {
      const perm = await Notification.requestPermission();
      if (perm === 'granted') {
        setBrowserPushEnabled(true);
        new Notification('NEO Watch Alerts Enabled ☄️', {
          body: 'You will receive desktop alerts for asteroid close approaches and orbital refinements.',
          icon: '/favicon.ico'
        });
      } else {
        setBrowserPushEnabled(false);
      }
    } catch (err) {
      console.warn(err);
    }
  };

  // Filtered notifications list
  const filteredNotifications = useMemo(() => {
    return notifications.filter(n => {
      if (filterTab === 'unread') return !n.is_read;
      if (filterTab === 'flyby') return n.type === 'close_approach';
      if (filterTab === 'refinement') return n.type === 'refinement';
      if (filterTab === 'hazard') return n.type === 'hazard_shift';
      return true;
    });
  }, [notifications, filterTab]);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  if (!isOpen) return null;

  return (
    <div className="notif-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="notif-drawer" onClick={(e) => e.stopPropagation()}>
        {/* Drawer Header */}
        <div className="notif-header">
          <div className="notif-header-title-group">
            <div className="notif-title-row">
              <span className="notif-bell-icon">🔔</span>
              <h2 className="notif-title">Alerts & Refinements</h2>
              {unreadCount > 0 && (
                <span className="notif-unread-badge">{unreadCount} New</span>
              )}
            </div>
            <p className="notif-subtitle">
              Orbital refinements, upcoming close approaches & risk alerts for your watchlisted asteroids.
            </p>
          </div>
          <button
            type="button"
            className="notif-close-btn"
            onClick={onClose}
            aria-label="Close Notification Center"
          >
            &times;
          </button>
        </div>

        {/* Global Action Toolbar */}
        <div className="notif-toolbar">
          <div className="notif-toolbar-actions">
            <button
              type="button"
              className="notif-tool-btn"
              onClick={handleCheckAlerts}
              disabled={checkingAlerts}
              title="Evaluate watchlisted asteroids for fresh alerts"
            >
              {checkingAlerts ? '⏳ Checking...' : '🔄 Scan Watchlist'}
            </button>
            {unreadCount > 0 && (
              <button
                type="button"
                className="notif-tool-btn"
                onClick={handleMarkAllAsRead}
                title="Mark all notifications as read"
              >
                ✓ Mark All Read
              </button>
            )}
            {notifications.length > 0 && (
              <button
                type="button"
                className="notif-tool-btn danger"
                onClick={handleClearAll}
                title="Clear all alerts"
              >
                🗑️ Clear All
              </button>
            )}
          </div>

          {'Notification' in window && !browserPushEnabled && (
            <button
              type="button"
              className="notif-push-opt-in-btn"
              onClick={handleRequestPush}
              title="Enable browser desktop notifications"
            >
              🔔 Enable Desktop Alerts
            </button>
          )}
        </div>

        {/* Filter Navigation Chips */}
        <div className="notif-filter-chips">
          <button
            type="button"
            className={`notif-chip ${filterTab === 'all' ? 'active' : ''}`}
            onClick={() => setFilterTab('all')}
          >
            All ({notifications.length})
          </button>
          <button
            type="button"
            className={`notif-chip ${filterTab === 'unread' ? 'active' : ''}`}
            onClick={() => setFilterTab('unread')}
          >
            Unread ({unreadCount})
          </button>
          <button
            type="button"
            className={`notif-chip ${filterTab === 'flyby' ? 'active' : ''}`}
            onClick={() => setFilterTab('flyby')}
          >
            🚀 Flybys
          </button>
          <button
            type="button"
            className={`notif-chip ${filterTab === 'hazard' ? 'active' : ''}`}
            onClick={() => setFilterTab('hazard')}
          >
            ⚠️ Hazards
          </button>
          <button
            type="button"
            className={`notif-chip ${filterTab === 'refinement' ? 'active' : ''}`}
            onClick={() => setFilterTab('refinement')}
          >
            🔬 Refinements
          </button>
        </div>

        {/* Notifications Body List */}
        <div className="notif-body">
          {loading ? (
            <div className="loading-box">
              <div className="spinner" />
              <p>Scanning orbital telemetry & alerts...</p>
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="notif-empty-state">
              <div className="empty-icon">✨</div>
              <h3>All Quiet on the Orbit Front</h3>
              <p>
                {filterTab === 'unread'
                  ? 'You have read all your alerts! Bookmark more asteroids to monitor their trajectory updates.'
                  : 'No alerts match this filter. As NASA astrometry updates and close passes approach, alerts will appear here.'}
              </p>
              <button
                type="button"
                className="notif-refresh-btn"
                onClick={handleCheckAlerts}
                disabled={checkingAlerts}
              >
                {checkingAlerts ? 'Checking Watchlist...' : '🔄 Scan Watchlist Now'}
              </button>
            </div>
          ) : (
            <div className="notif-cards-list">
              {filteredNotifications.map((n) => {
                const isUnread = !n.is_read;
                const severityClass = n.severity === 'alert' ? 'alert' : n.severity === 'warning' ? 'warning' : 'info';

                return (
                  <article
                    key={n.id}
                    className={`notif-card ${severityClass} ${isUnread ? 'unread' : 'read'}`}
                    onClick={() => {
                      if (isUnread) handleMarkAsRead(n.id);
                      if (n.neo_object_id && onSelectNeo) {
                        onSelectNeo(n.neo_object_id);
                        onClose();
                      }
                    }}
                  >
                    <div className="notif-card-header">
                      <div className="notif-card-title-row">
                        <span className={`notif-type-tag ${severityClass}`}>
                          {n.type === 'close_approach' ? '🚀 Flyby' : n.type === 'hazard_shift' ? '⚠️ PHA Notice' : '🔬 Refinement'}
                        </span>
                        <h4 className="notif-card-title">{n.title}</h4>
                      </div>
                      <span className="notif-time-tag">{formatRelativeTime(n.created_at)}</span>
                    </div>

                    <p className="notif-message-text">{n.message}</p>

                    <div className="notif-card-footer">
                      {n.neo_name && (
                        <div className="notif-neo-badge">
                          <span>☄️ {n.neo_name}</span>
                          {n.is_potentially_hazardous && <span className="pha-indicator">NASA PHA</span>}
                        </div>
                      )}

                      <div className="notif-card-actions">
                        {isUnread && (
                          <button
                            type="button"
                            className="notif-action-btn read-btn"
                            title="Mark as read"
                            onClick={(e) => handleMarkAsRead(n.id, e)}
                          >
                            Mark Read
                          </button>
                        )}
                        <button
                          type="button"
                          className="notif-action-btn delete-btn"
                          title="Dismiss alert"
                          onClick={(e) => handleDeleteNotification(n.id, e)}
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
