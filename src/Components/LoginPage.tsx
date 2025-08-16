import React, { useState } from 'react';
import {
  Box,
  TextField,
  Button,
  Typography,
  Checkbox,
  FormControlLabel,
} from '@mui/material';

interface LoginPageProps {
  onLogin: (username: string) => void;
}

const IMAGE_URL = 'https://www.kalasalingam.ac.in/wp-content/uploads/2021/06/IMG_1793-scaled.jpg';
// If using Vite, logo path is usually "/src/assets/Kare_Logo.png"
const LOGO_URL = '/src/assets/Kare_Logo.png';

const LoginPage: React.FC<LoginPageProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (username === 'admin' && password === 'password') {
      onLogin(username);
    } else {
      setError('Invalid username or password.');
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        minWidth: '100vw',
        height: '100vh',
        width: '100vw',
        overflow: 'hidden',
        display: 'flex',
        position: 'fixed',   // Fixes page to viewport, no scrolling or shifting
        inset: 0,
      }}
    >
      {/* LEFT: Full-image with transparent logo */}
      <Box
        sx={{
          width: { xs: 0, md: '60%' },
          height: '100%',
          position: 'relative',
          display: { xs: 'none', md: 'flex' },
          alignItems: 'flex-start',
          justifyContent: 'flex-start',
          overflow: 'hidden',
          background: `url(${IMAGE_URL}) center center/cover no-repeat`,
        }}
      >
        <Box
          component="img"
          src={LOGO_URL}
          alt="KARE Logo"
          sx={{
            width: 70,
            height: 70,
            position: 'absolute',
            top: 36,
            left: 36,
            zIndex: 2,
            p: 0,
            bgcolor: 'transparent', // Absolutely zero background
            borderRadius: 2,
          }}
          draggable={false}
        />
      </Box>

      {/* RIGHT: Login form */}
      <Box
        sx={{
          flex: 1,
          height: '100%',
          minWidth: 0,
          background: '#fff',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          px: 3,
          boxShadow: { md: '-2px 0 30px 2px #e3e3e3' },
        }}
      >
        <Box
          sx={{
            width: '100%',
            maxWidth: 380,
            mx: 'auto',
          }}
        >
          <Typography
            variant="h3"
            align="center"
            sx={{
              fontWeight: 900,
              mb: 0.5,
              letterSpacing: 2,
              color: '#1e3a8a',
              fontFamily: `'Inter','Roboto','Segoe UI',Arial,sans-serif`,
              fontSize: { xs: 32, md: 36 },
            }}
          >
            LMS – KARE
          </Typography>
          <Typography
            variant="subtitle1"
            align="center"
            sx={{
              color: '#475569',
              fontWeight: 500,
              fontSize: 20,
              mb: 4,
              letterSpacing: 1,
            }}
          >
            Library Management System
          </Typography>

          <form onSubmit={handleSubmit}>
            <TextField
              label="Username"
              value={username}
              onChange={e => setUsername(e.target.value)}
              fullWidth
              margin="normal"
              required
              autoFocus
              inputProps={{ autoComplete: 'username' }}
            />

            <TextField
              label="Password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              fullWidth
              margin="normal"
              required
              inputProps={{ autoComplete: 'current-password' }}
            />

            <FormControlLabel
              control={
                <Checkbox
                  checked={remember}
                  onChange={e => setRemember(e.target.checked)}
                  color="primary"
                />
              }
              label="Remember Me"
              sx={{ mt: 2, mb: 1.5 }}
            />

            {error && (
              <Typography
                sx={{
                  color: 'error.main',
                  fontSize: 15,
                  mt: 1,
                  mb: 1,
                  textAlign: 'center'
                }}
              >
                {error}
              </Typography>
            )}

            <Button
              type="submit"
              variant="contained"
              fullWidth
              sx={{
                mt: 1,
                py: 1.3,
                fontWeight: 700,
                fontSize: 18,
                bgcolor: '#1e3a8a',
                letterSpacing: 1,
                boxShadow: 2,
                ':hover': { bgcolor: '#174185' }
              }}
            >
              Login
            </Button>
          </form>
        </Box>
      </Box>
    </Box>
  );
};

export default LoginPage;
