import { useState, useEffect } from 'react';
import LoginPage from './Components/LoginPage';
import Dashboard from './Components/Dashboard';
import MainGateEntry from './Components/MainGateEntry';
import AdvancedAnalytics from './Components/AdvancedAnalytics';
import HallBooking from './Components/HallBooking';
import AdminBookings from './Components/AdminBookings';
import AIAssistant from './Components/AIAssistant';
import { apiService } from './services/api';
import type { User } from './services/api';

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [page, setPage] = useState<'dashboard' | 'mainGateEntry' | 'analytics' | 'hallBooking' | 'adminBookings'>('dashboard');

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

  const handleLogin = (userData: User) => {
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
    } else if (category === 'Hall/Room Booking') {
      setPage('hallBooking');
    } else if (category === 'Manage Bookings') {
      setPage('adminBookings');
    }
    // Add further navigation logic here for other categories if needed
  };


  if (!user) {
    return <LoginPage onLogin={handleLogin} />;
  }

  if (page === 'dashboard') {
    return (
      <>
        <Dashboard user={user} onLogout={handleLogout} onCategoryClick={handleCategoryClick} />
        <AIAssistant userRole={user.role} currentPage="dashboard" userName={`${user.firstName} ${user.lastName}`} />
      </>
    );
  }

  if (page === 'mainGateEntry') {
    return (
      <>
        <MainGateEntry onReturn={() => setPage('dashboard')} />
        <AIAssistant userRole={user.role} currentPage="mainGateEntry" userName={`${user.firstName} ${user.lastName}`} />
      </>
    );
  }

  if (page === 'hallBooking') {
    return (
      <>
        <HallBooking onReturn={() => setPage('dashboard')} />
        <AIAssistant userRole={user.role} currentPage="hallBooking" userName={`${user.firstName} ${user.lastName}`} />
      </>
    );
  }

  if (page === 'adminBookings') {
    return (
      <>
        <AdminBookings onReturn={() => setPage('dashboard')} />
        <AIAssistant userRole={user.role} currentPage="adminBookings" userName={`${user.firstName} ${user.lastName}`} />
      </>
    );
  }

  if (page === 'analytics') {
    return (
      <>
        <AdvancedAnalytics onReturn={() => setPage('dashboard')} />
        <AIAssistant userRole={user.role} currentPage="analytics" userName={`${user.firstName} ${user.lastName}`} />
      </>
    );
  }

  return null; // fallback
}

export default App;
