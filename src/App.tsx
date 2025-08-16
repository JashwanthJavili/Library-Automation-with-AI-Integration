import { useState } from 'react'
import LoginPage from './Components/LoginPage'
import './App.css'

function App() {
  const [user, setUser] = useState<string | null>(null);

  const handleLogin = (username: string) => {
    setUser(username);
    // Here you will go to Dashboard in later phases
  };

  return (
    <>
      {user ? (
        <div>
          {/* Placeholder for Dashboard */}
          <h2>Welcome, {user}!</h2>
        </div>
      ) : (
        <LoginPage onLogin={handleLogin} />
      )}
    </>
  )
}

export default App
