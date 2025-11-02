import React, { useState, useEffect } from 'react';
import { HabitTracker } from './components/HabitTracker';
import { Login } from './components/Login';
import { db } from './config/db';
import { useObservable } from 'dexie-react-hooks';
import './App.css';

const DEXIE_CLOUD_URL = process.env.REACT_APP_DEXIE_CLOUD_URL;
const isCloudConfigured = DEXIE_CLOUD_URL && DEXIE_CLOUD_URL !== 'https://your-db.dexie.cloud';

function App() {
  const currentUser = useObservable(
    () => db.cloud.currentUser,
    [db]
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if we have a user (including loading state)
    const checkAuth = async () => {
      try {
        // Wait a bit for Dexie Cloud to initialize
        await new Promise(resolve => setTimeout(resolve, 500));
        setLoading(false);
      } catch (error) {
        console.error('Error checking auth:', error);
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const handleSignOut = async () => {
    try {
      if (isCloudConfigured) {
        await db.cloud.logout();
      } else {
        // In local mode, just clear data and reload
        localStorage.removeItem('localUserId');
        window.location.reload();
      }
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner">Loading...</div>
      </div>
    );
  }

  // Local mode - use a fixed user ID or create one
  if (!isCloudConfigured) {
    let localUserId = localStorage.getItem('localUserId');
    if (!localUserId) {
      localUserId = 'local-user-' + Date.now();
      localStorage.setItem('localUserId', localUserId);
    }

    return (
      <div className="App">
        <div className="app-header">
          <div className="user-info">
            <div className="user-avatar">L</div>
            <span className="user-name">Local User</span>
            <span className="local-mode-badge">Local Mode</span>
            <button className="sign-out-btn" onClick={handleSignOut}>
              Reset
            </button>
          </div>
        </div>
        <HabitTracker userId={localUserId} />
      </div>
    );
  }

  // Cloud mode - require authentication
  if (!currentUser || !currentUser.userId) {
    return <Login />;
  }

  return (
    <div className="App">
      <div className="app-header">
        <div className="user-info">
          <div className="user-avatar">
            {currentUser.name ? currentUser.name[0].toUpperCase() : '?'}
          </div>
          <span className="user-name">{currentUser.name || currentUser.email || 'User'}</span>
          <button className="sign-out-btn" onClick={handleSignOut}>
            Sign Out
          </button>
        </div>
      </div>
      <HabitTracker userId={currentUser.userId} />
    </div>
  );
}

export default App;
