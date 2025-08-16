import React, { useState, useEffect } from 'react';
import LoginPage from './Components/LoginPage';
import Dashboard from './Components/Dashboard';
import MainGateEntry from './Components/MainGateEntry';
import Analytics from './Components/Analytics';
import { apiService } from './services/api';
import type { User } from './services/api';

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [page, setPage] = useState<'dashboard' | 'mainGateEntry' | 'analytics'>('dashboard');

  // Check if user is already logged in on component mount
  useEffect(() => {
    const token = apiService.getToken();
    if (token) {
      // Verify token and get user profile
      apiService.getProfile()
        .then(response => {
          if (response.success && response.data) {
            setUser(response.data.user);
          } else {
            apiService.clearToken();
          }
        })
        .catch(() => {
          apiService.clearToken();
        });
    }
  }, []);

  const handleLogin = (username: string, userData: User) => {
    setUser(userData);
    setPage('dashboard');
  };

  const handleLogout = () => {
    apiService.clearToken();
    setUser(null);
    setPage('dashboard'); // Reset page on logout
  };

  const handleCategoryClick = (category: string) => {
    if (category === 'Main Gate Entry/Exit') {
      setPage('mainGateEntry');
    } else if (category === 'Analytics & Reports') {
      setPage('analytics');
    }
    // Add further navigation logic here for other categories if needed
  };

  if (!user) {
    return <LoginPage onLogin={handleLogin} />;
  }

  if (page === 'dashboard') {
    return <Dashboard user={user} onLogout={handleLogout} onCategoryClick={handleCategoryClick} />;
  }

  if (page === 'mainGateEntry') {
    return <MainGateEntry onReturn={() => setPage('dashboard')} />;
  }

  if (page === 'analytics') {
    return <Analytics onReturn={() => setPage('dashboard')} />;
  }

  return null; // fallback
}

export default App;
