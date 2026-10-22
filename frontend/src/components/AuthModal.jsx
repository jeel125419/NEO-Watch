import React, { useState } from 'react';

export default function AuthModal({ isOpen, onClose, onSuccess }) {
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  if (!isOpen) return null;

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setError(null);
    setSuccessMsg(null);
  };

  const switchMode = (newMode) => {
    setMode(newMode);
    setError(null);
    setSuccessMsg(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError('Please enter your email address.');
      return;
    }

    if (!password) {
      setError('Please enter your password.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    if (mode === 'register' && password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);

    try {
      const endpoint = mode === 'register' ? '/api/auth/register' : '/api/auth/login';
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmedEmail, password })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Authentication request failed.');
      }

      // Success
      setSuccessMsg(mode === 'register' ? 'Account created! Signing in...' : 'Signed in successfully!');
      setTimeout(() => {
        onSuccess(data.user, data.token);
        resetForm();
        onClose();
      }, 400);
    } catch (err) {
      setError(err.message || 'An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div
        className="auth-modal-card"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="auth-modal-header">
          <div className="auth-brand-badge">
            <span className="auth-brand-icon">☄️</span>
            <div>
              <h2 className="auth-modal-title">
                {mode === 'login' ? 'Welcome Back to NEO Watch' : 'Create Free Account'}
              </h2>
              <p className="auth-modal-subtitle">
                {mode === 'login'
                  ? 'Sign in to access your asteroid watchlists and stargazing targets.'
                  : 'Track close-approach asteroids, save hazardous targets, and plan observations.'}
              </p>
            </div>
          </div>
          <button
            type="button"
            className="auth-close-btn"
            onClick={onClose}
            aria-label="Close authentication modal"
          >
            ✕
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="auth-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'login'}
            className={`auth-tab-btn ${mode === 'login' ? 'active' : ''}`}
            onClick={() => switchMode('login')}
          >
            🔑 Sign In
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'register'}
            className={`auth-tab-btn ${mode === 'register' ? 'active' : ''}`}
            onClick={() => switchMode('register')}
          >
            ✨ Create Account
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="auth-form">
          {error && (
            <div className="auth-alert error" role="alert">
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="auth-alert success" role="status">
              <span>✅</span>
              <span>{successMsg}</span>
            </div>
          )}

          <div className="auth-input-group">
            <label htmlFor="auth-email" className="auth-label">
              Email Address
            </label>
            <input
              id="auth-email"
              type="email"
              className="auth-input"
              placeholder="e.g. observer@neowatch.org"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
              autoComplete="email"
            />
          </div>

          <div className="auth-input-group">
            <label htmlFor="auth-password" className="auth-label">
              Password {mode === 'register' && <span className="auth-hint">(6+ characters)</span>}
            </label>
            <input
              id="auth-password"
              type="password"
              className="auth-input"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
            />
          </div>

          {mode === 'register' && (
            <div className="auth-input-group">
              <label htmlFor="auth-confirm-password" className="auth-label">
                Confirm Password
              </label>
              <input
                id="auth-confirm-password"
                type="password"
                className="auth-input"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                autoComplete="new-password"
              />
            </div>
          )}

          <button
            type="submit"
            id="auth-submit-btn"
            className="auth-submit-btn"
            disabled={loading}
          >
            {loading ? (
              <span className="auth-spinner-label">
                <span className="spinner-small" /> Processing...
              </span>
            ) : mode === 'login' ? (
              'Sign In to Account'
            ) : (
              'Create My Free Account'
            )}
          </button>
        </form>

        <div className="auth-footer">
          {mode === 'login' ? (
            <p>
              Don't have an account yet?{' '}
              <button
                type="button"
                className="auth-switch-link"
                onClick={() => switchMode('register')}
              >
                Create one now
              </button>
            </p>
          ) : (
            <p>
              Already have an account?{' '}
              <button
                type="button"
                className="auth-switch-link"
                onClick={() => switchMode('login')}
              >
                Sign In
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
