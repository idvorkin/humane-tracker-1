import React from 'react';
import { db } from '../config/db';
import './Login.css';

export const Login: React.FC = () => {
  const handleLogin = async () => {
    try {
      // Dexie Cloud provides a login UI
      await db.cloud.login();
    } catch (error) {
      console.error('Error signing in:', error);
      alert('Failed to sign in. Please try again.');
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <h1>Humane Tracker</h1>
          <p>Track your wellness habits and build healthy routines</p>
        </div>

        <div className="login-features">
          <div className="feature-item">
            <span className="feature-icon">📊</span>
            <span>Track 27+ habits across 5 categories</span>
          </div>
          <div className="feature-item">
            <span className="feature-icon">🎯</span>
            <span>Set weekly targets and monitor progress</span>
          </div>
          <div className="feature-item">
            <span className="feature-icon">☁️</span>
            <span>Sync across all your devices</span>
          </div>
          <div className="feature-item">
            <span className="feature-icon">🔒</span>
            <span>Your data is private and secure</span>
          </div>
          <div className="feature-item">
            <span className="feature-icon">📱</span>
            <span>Works offline with automatic sync</span>
          </div>
        </div>

        <button className="google-signin-btn" onClick={handleLogin}>
          Sign In
        </button>

        <p className="privacy-note">
          We only store your email and name to identify your account.
          Your habit data stays private and syncs across your devices.
        </p>
      </div>
    </div>
  );
};
