import React, { useState } from 'react';
import LoginPage from './Components/LoginPage';
import Dashboard from './Components/Dashboard';
import MainGateEntry from './Components/MainGateEntry';

function App() {
  const [user, setUser] = useState<string | null>(null);
  const [page, setPage] = useState<'dashboard' | 'mainGateEntry'>('dashboard');

  const handleLogin = (username: string) => {
    setUser(username);
    setPage('dashboard');
  };

  const handleLogout = () => {
    setUser(null);
    setPage('dashboard'); // Reset page on logout
  };

  const handleCategoryClick = (category: string) => {
    if (category === 'Main Gate Entry/Exit') {
      setPage('mainGateEntry');
    }
    // Add further navigation logic here for other categories if needed
  };

  if (!user) {
    return <LoginPage onLogin={handleLogin} />;
  }

  if (page === 'dashboard') {
    return <Dashboard onLogout={handleLogout} onCategoryClick={handleCategoryClick} />;
  }

  if (page === 'mainGateEntry') {
    return <MainGateEntry onReturn={() => setPage('dashboard')} />;
  }

  return null; // fallback
}

export default App;
