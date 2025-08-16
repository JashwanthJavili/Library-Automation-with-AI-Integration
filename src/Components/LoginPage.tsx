import React, { useState } from 'react';
import {
  Box,
  TextField,
  Button,
  Typography,
  Checkbox,
  FormControlLabel,
  Avatar
} from '@mui/material';

interface LoginPageProps {
  onLogin: (username: string) => void;
}

const IMAGE_URL = 'https://www.kalasalingam.ac.in/wp-content/uploads/2021/06/IMG_1793-scaled.jpg';
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
        width: '100vw',
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', md: '1.3fr 1fr' },
        bgcolor: '#f5f6fa'
      }}
    >
      {/* Left: Image and transparent logo */}
      <Box sx={{ position: 'relative', display: { xs: 'none', md: 'block' } }}>
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            backgroundImage: `url(${IMAGE_URL})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center'
          }}
        />
        <Avatar
          src={LOGO_URL}
          alt="KARE Logo"
          variant="rounded"
          sx={{
            position: 'absolute',
            top: 24,
            left: 24,
            width: 56,
            height: 56,
            boxShadow: 2,
            background: 'none', // No white background
            p: 0,
            borderRadius: 2
          }}
          imgProps={{ referrerPolicy: 'no-referrer' }}
        />
      </Box>

      {/* Right: Heading and form */}
      <Box
        sx={{
          height: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: '#fff'
        }}
      >
        <Box sx={{ width: '100%', maxWidth: 380, mx: 'auto', px: 2 }}>
          <Typography
            variant="h4"
            align="center"
            sx={{
              fontWeight: 800,
              mb: 1.2,
              letterSpacing: 1,
              color: '#1e3a8a'
            }}
          >
            LMS – KARE
          </Typography>
          <Typography
            variant="subtitle1"
            align="center"
            sx={{
              fontWeight: 400,
              color: '#606470',
              mb: 4,
              fontSize: 19
            }}
          >
            Library Management System
          </Typography>

          <form onSubmit={handleSubmit}>
            <TextField
              label="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
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
              onChange={(e) => setPassword(e.target.value)}
              fullWidth
              margin="normal"
              required
              inputProps={{ autoComplete: 'current-password' }}
            />

            <FormControlLabel
              control={
                <Checkbox
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  color="primary"
                />
              }
              label="Remember Me"
              sx={{ mt: 1, mb: 2 }}
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
                letterSpacing: 0.5,
                fontSize: 17,
                bgcolor: '#1e3a8a',
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
