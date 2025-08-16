import React, { useState } from 'react';
import {
  Box,
  AppBar,
  Toolbar,
  Typography,
  Avatar,
  Card,
  CardContent,
  TextField,
  Button,
  InputAdornment,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Snackbar
} from '@mui/material';
import QrCodeScannerIcon from '@mui/icons-material/QrCodeScanner';
import LockIcon from '@mui/icons-material/Lock';
import { apiService } from '../services/api';

const LOGO_URL = '/src/assets/Kare_Logo.png';

const quoteText = "AN ANT ON THE MOVE DOES MORE THAN A DOZING OX.";
const libraryTimings = "Mon-Fri: 8AM to 8PM | Sat: 9AM to 2PM";

const MainGateEntry: React.FC<{ onReturn: () => void }> = ({ onReturn }) => {
  const [regNo, setRegNo] = useState('');
  const [submitMsg, setSubmitMsg] = useState('');
  const [showReturnDialog, setShowReturnDialog] = useState(false);
  const [returnPass, setReturnPass] = useState('');
  const [returnError, setReturnError] = useState('');
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success'
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regNo.trim()) return;
    
    setLoading(true);
    setSubmitMsg('');
    
    try {
      const response = await apiService.recordEntry({
        registrationNumber: regNo.trim(),
        method: 'manual_entry',
        purpose: 'study',
        location: 'main_gate'
      });
      
      if (response.success) {
        setSubmitMsg(`Entry recorded successfully for ${response.data?.entry?.user?.firstName} ${response.data?.entry?.user?.lastName}`);
        setSnackbar({
          open: true,
          message: 'Entry recorded successfully!',
          severity: 'success'
        });
        setRegNo('');
      } else {
        setSubmitMsg(response.message || 'Failed to record entry');
        setSnackbar({
          open: true,
          message: response.message || 'Failed to record entry',
          severity: 'error'
        });
      }
    } catch (error: any) {
      console.error('Entry error:', error);
      setSubmitMsg(error.message || 'Failed to record entry. Please try again.');
      setSnackbar({
        open: true,
        message: error.message || 'Failed to record entry. Please try again.',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const openReturnDialog = () => setShowReturnDialog(true);

  const handleReturnConfirm = () => {
    if (returnPass === 'comeback') {
      setReturnError('');
      setReturnPass('');
      setShowReturnDialog(false);
      onReturn();
    } else {
      setReturnError('Incorrect password');
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', width: '100vw', bgcolor: '#f8fafc' }}>
      <AppBar position="static" elevation={2} color="inherit" sx={{ bgcolor: '#fff', borderBottom: '1px solid #e2e8f0' }}>
        <Toolbar sx={{ maxWidth: 1280, mx: 'auto', width: '100%', px: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Avatar src={LOGO_URL} alt="KARE Logo" variant="rounded" sx={{ width: 48, height: 48 }} imgProps={{ referrerPolicy: 'no-referrer' }} />
            <Typography variant="h5" sx={{ fontWeight: 700, letterSpacing: 1, color: '#1e3a8a', ml: 1, fontSize: { xs: 21, sm: 24 } }}>
              LMS – KARE
            </Typography>
          </Box>
          <Button
            variant="outlined"
            color="primary"
            onClick={openReturnDialog}
            sx={{ textTransform: 'none', fontWeight: 600 }}
            startIcon={<LockIcon />}
          >
            Return
          </Button>
        </Toolbar>
      </AppBar>

      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          minHeight: 'calc(100vh - 64px)',
          width: '100%'
        }}
      >
        {/* Left: Quote and Timings */}
        <Box sx={{ flex: 1.1, bgcolor: '#eaf1fb', display: 'flex', justifyContent: 'center', alignItems: 'center', px: { xs: 2, md: 6 } }}>
          <Card sx={{ maxWidth: 440, bgcolor: '#16213e', borderRadius: 4, boxShadow: 6, p: 3, color: 'white', textAlign: 'center' }}>
            <CardContent>
              <Typography variant="overline" sx={{ fontWeight: 800, color: '#81bff8', letterSpacing: 1.3, mb: 2, fontSize: 13 }}>
                Quote for the Thought
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 700, fontSize: 18, letterSpacing: 1.1, lineHeight: 1.2 }}>
                {quoteText}
              </Typography>
              <Box sx={{ borderTop: '1px dashed #a1caff', pt: 2, mt: 3 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, fontSize: 20, color: '#7bc5d6' }}>
                  Library Timings
                </Typography>
                <Typography variant="body1" sx={{ fontWeight: 500, mt: 0.5 }}>
                  {libraryTimings}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Box>

        {/* Right: Entry UI */}
        <Box sx={{flex: 1.4, bgcolor: 'white', display: 'flex', justifyContent: 'center', alignItems: 'center', px: { xs: 2, md: 8 } }}>
          <Box sx={{ width: '100%', maxWidth: 400, textAlign: 'center' }}>
            <Typography variant="h5" sx={{ fontWeight: 700, color: '#263247', mb: 0.6, letterSpacing: 1.2 }}>
              In Out Management System
            </Typography>
            <Typography sx={{ color: '#7b7c7e', fontWeight: 500, fontSize: 18, mb: 2 }}>
              Central Library Main Gate
            </Typography>
            <Typography variant="h6" sx={{ color: '#18bc9c', fontWeight: 900, letterSpacing: 1.6, mb: 1 }}>
              SCAN YOUR ID CARD
            </Typography>
            <Typography sx={{ color: '#8d8fa3', mb: 2.5, fontSize: 14, fontWeight: 400 }}>
              (Or enter your Register Number below)
            </Typography>

            <form onSubmit={handleSubmit}>
              <TextField
                label="Register Number"
                value={regNo}
                onChange={e => setRegNo(e.target.value)}
                fullWidth
                autoFocus
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <QrCodeScannerIcon sx={{ color: '#95a5a6', fontSize: 28 }} />
                    </InputAdornment>
                  ),
                  sx: { fontSize: 19 }
                }}
                sx={{ mb: 3, '& input': { textAlign: "center" } }}
                inputProps={{ style: { fontWeight: 700, letterSpacing: 1.7, fontSize: 19 } }}
                required
              />

              <Button
                variant="contained"
                color="primary"
                type="submit"
                fullWidth
                disabled={loading}
                sx={{
                  py: 1.2,
                  fontWeight: 700,
                  bgcolor: '#1e3a8a',
                  fontSize: 18,
                  letterSpacing: 1.2,
                  borderRadius: 2,
                  boxShadow: 3,
                  mt: 1
                }}
              >
                {loading ? (
                  <CircularProgress size={24} color="inherit" />
                ) : (
                  'Submit'
                )}
              </Button>
            </form>

            {submitMsg && (
              <Alert severity="warning" sx={{ mt: 2 }}>
                {submitMsg}
              </Alert>
            )}
          </Box>
        </Box>
      </Box>

      {/* Return Password Dialog */}
      <Dialog open={showReturnDialog} onClose={() => setShowReturnDialog(false)}>
        <DialogTitle>Enter Password to Return</DialogTitle>
        <DialogContent>
          <TextField
            label="Password"
            type="password"
            fullWidth
            value={returnPass}
            onChange={(e) => setReturnPass(e.target.value)}
            autoFocus
          />
          {returnError && <Alert severity="error" sx={{ mt: 1 }}>{returnError}</Alert>}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowReturnDialog(false)}>Cancel</Button>
          <Button onClick={handleReturnConfirm} variant="contained">Confirm</Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
     );
 };

export default MainGateEntry;
