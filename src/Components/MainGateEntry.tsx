import React, { useState } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  AppBar,
  Toolbar,
  Avatar,
  InputAdornment,
  Alert,
  Snackbar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Paper,
  IconButton,
  Tooltip
} from '@mui/material';
import QrCodeScannerIcon from '@mui/icons-material/QrCodeScanner';
import LockIcon from '@mui/icons-material/Lock';
import { apiService } from '../services/api';

const LOGO_URL = '/src/assets/Kare_Logo.png';
const BACKGROUND_IMAGE = '/src/assets/KAREUniversity.jpg';

const MainGateEntry: React.FC<{ onReturn: () => void }> = ({ onReturn }) => {
  const [regNumber, setRegNumber] = useState('');
  const [submitMsg, setSubmitMsg] = useState('');
  const [showReturnDialog, setShowReturnDialog] = useState(false);
  const [returnPass, setReturnPass] = useState('');
  const [returnError, setReturnError] = useState('');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' | 'warning' | 'info' });
  const [successMessage, setSuccessMessage] = useState<{
    show: boolean;
    type: 'entry' | 'exit';
    registrationNumber: string;
    userName: string;
    timeSpent?: string;
    timestamp: string;
  }>({ show: false, type: 'entry', registrationNumber: '', userName: '', timestamp: '' });
  const [isProcessing, setIsProcessing] = useState(false);

  const formatTimeSpent = (minutes: number): string => {
    if (!minutes || minutes < 1) {
      const seconds = Math.round((minutes || 0) * 60);
      return `${seconds}s`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = Math.floor(minutes % 60);
    const secs = Math.round((minutes % 1) * 60);
    if (hours > 0) {
      return secs > 0 ? `${hours}h ${mins}m ${secs}s` : `${hours}h ${mins}m`;
    }
    return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
  };

  // Handle form submission for entry or exit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regNumber.trim() || isProcessing) return;
    
    setIsProcessing(true);
    setSubmitMsg('');
    
    try {
      // Attempt to record entry
      try {
        const entryResponse = await apiService.recordEntry({
          registrationNumber: regNumber.trim(),
          method: 'manual_entry',
          purpose: 'study',
          location: 'main_gate'
        });
        
        if (entryResponse.success) {
          const user = entryResponse.data?.entry?.user;
          const timestamp = new Date().toLocaleString();

          setSuccessMessage({
            show: true,
            type: 'entry',
            registrationNumber: user?.studentId || regNumber.trim(),
            userName: `${user?.firstName} ${user?.lastName}`,
            timeSpent: undefined,
            timestamp
          });
          
          setRegNumber('');
          
          // Auto-hide success message after 2 seconds
          setTimeout(() => {
            setSuccessMessage(prev => ({ ...prev, show: false }));
          }, 2000);
          
          return;
        }
      } catch (entryError: any) {
        // If user is already inside, attempt exit instead
        if (entryError.message?.includes('already inside')) {
          const exitResponse = await apiService.recordExit({
            registrationNumber: regNumber.trim(),
            method: 'manual_entry',
            location: 'main_gate'
          });
          
          if (exitResponse.success) {
            const exit = exitResponse.data?.exit;
            const user = exit?.user;
            let timeSpentStr = exit?.timeSpent as string | undefined;

            if (!timeSpentStr) {
              // Prefer explicit duration (assumed minutes), else compute from timestamps
              if (typeof exit?.duration === 'number') {
                timeSpentStr = formatTimeSpent(exit.duration);
              } else if (exit?.entryTime && exit?.timestamp) {
                const entryMs = new Date(exit.entryTime as any).getTime();
                const exitMs = new Date(exit.timestamp as any).getTime();
                const minutes = (exitMs - entryMs) / (1000 * 60);
                timeSpentStr = formatTimeSpent(minutes);
              } else {
                timeSpentStr = '0s';
              }
            }

            const timestamp = new Date().toLocaleString();

            setSuccessMessage({
              show: true,
              type: 'exit',
              registrationNumber: user?.studentId || regNumber.trim(),
              userName: `${user?.firstName} ${user?.lastName}`,
              timeSpent: timeSpentStr,
              timestamp
            });
            
            setRegNumber('');
            
            // Auto-hide success message after 2 seconds
            setTimeout(() => {
              setSuccessMessage(prev => ({ ...prev, show: false }));
            }, 2000);
            
            return;
          }
        } else {
          throw entryError;
        }
      }
    } catch (error: any) {
      setSubmitMsg(error.message || 'Failed to process request. Please try again.');
      setSnackbar({
        open: true,
        message: error.message || 'Failed to process request. Please try again.',
        severity: 'error'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const openReturnDialog = () => setShowReturnDialog(true);

  // Handle return confirmation with password check
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
    <Box sx={{ 
      width: '100vw',
      minHeight: '100vh', 
      backgroundImage: `linear-gradient(rgba(255, 255, 255, 0.3), rgba(255, 255, 255, 0.3)), url(${BACKGROUND_IMAGE})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundAttachment: 'fixed',
      backgroundRepeat: 'no-repeat',
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* Header */}
      <AppBar 
        position="static" 
        elevation={0} 
        sx={{ 
          bgcolor: 'rgba(255, 255, 255, 0.95)', 
          borderBottom: '1px solid #e5e7eb'
        }}
      >
        <Toolbar disableGutters sx={{ px: { xs: 2, sm: 4 } }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexGrow: 1 }}>
            <Avatar 
              src={LOGO_URL} 
              alt="KARE Logo" 
              variant="rounded" 
              sx={{ width: 32, height: 32 }} 
            />
            <Typography variant="h6" sx={{ fontWeight: 600, color: '#111827' }}>
              LMS – KARE
            </Typography>
          </Box>
          <Tooltip title="Return">
            <IconButton
              onClick={openReturnDialog}
              size="small"
              sx={{ 
                border: '1px solid #d1d5db',
                color: '#374151',
                '&:hover': { borderColor: '#9ca3af', bgcolor: 'rgba(0,0,0,0.02)' }
              }}
              aria-label="return"
            >
              <LockIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Toolbar>
      </AppBar>

      {/* Main Content */}
      <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', py: 4, px: { xs: 2, sm: 4 } }}>
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            flexGrow: 1,
            maxWidth: 600,
            mx: 'auto'
          }}
        >
          {/* Entry Form */}
          <Paper
            sx={{
              p: { xs: 2, sm: 2.5 },
              borderRadius: 3,
              bgcolor: 'rgba(255, 255, 255, 0.85)',
              boxShadow: '0 10px 30px rgba(2, 6, 23, 0.06)',
              textAlign: 'center',
              width: '100%'
            }}
          >
            <Typography variant="h6" sx={{ mb: 1, fontWeight: 700, color: '#0f172a', letterSpacing: 0.2 }}>
              Entry Management
            </Typography>
            <Typography variant="body2" sx={{ mb: 1, color: '#6b7280' }}>
              Central Library Main Gate
            </Typography>
            <Typography variant="body2" sx={{ mb: 2, color: '#3b82f6', fontWeight: 700, letterSpacing: 1 }}>
              SCAN YOUR ID CARD
            </Typography>
            <Typography variant="caption" sx={{ mb: 3, display: 'block', color: '#6b7280' }}>
              Or enter your registration number below
            </Typography>
            <form onSubmit={handleSubmit}>
              <TextField
                label="Registration Number"
                value={regNumber}
                onChange={e => setRegNumber(e.target.value)}
                fullWidth
                autoFocus
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <QrCodeScannerIcon sx={{ color: '#9ca3af' }} />
                    </InputAdornment>
                  )
                }}
                sx={{ mb: 2 }}
                required
              />
              <Button
                variant="contained"
                type="submit"
                fullWidth
                disabled={isProcessing}
                sx={{
                  py: 1.25,
                  fontWeight: 700,
                  borderRadius: 2,
                  bgcolor: '#1d4ed8',
                  boxShadow: '0 8px 16px rgba(29,78,216,0.15)',
                  '&:hover': { bgcolor: '#1e40af', boxShadow: '0 10px 18px rgba(30,64,175,0.2)' },
                  '&:disabled': { bgcolor: '#9ca3af' }
                }}
              >
                {isProcessing ? 'Processing...' : 'Submit'}
              </Button>
            </form>
            {successMessage.show && (
              <Box sx={{
                mt: 2.5,
                p: 2,
                borderRadius: 3,
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 1.25,
                bgcolor: successMessage.type === 'entry' ? 'rgba(236, 253, 245, 0.95)' : 'rgba(254, 242, 242, 0.95)',
                border: successMessage.type === 'entry' ? '1px solid #a7f3d0' : '1px solid #fecaca',
                boxShadow: '0 12px 24px rgba(2,6,23,0.06)'
              }}>
                <Box sx={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'center', mb: 1 }}>
                  <Typography variant="subtitle1" sx={{
                    fontWeight: 900,
                    letterSpacing: 2,
                    color: successMessage.type === 'entry' ? '#047857' : '#b91c1c'
                  }}>
                    {successMessage.type === 'entry' ? 'IN' : 'OUT'}
                  </Typography>
                </Box>
                <Paper elevation={0} sx={{ p: 1.25, textAlign: 'left', bgcolor: 'transparent' }}>
                  <Typography variant="caption" sx={{ color: '#6b7280' }}>Registration No.</Typography>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700, fontFamily: 'monospace', color: '#111827' }}>
                    {successMessage.registrationNumber}
                  </Typography>
                </Paper>
                <Paper elevation={0} sx={{ p: 1.25, textAlign: 'left', bgcolor: 'transparent' }}>
                  <Typography variant="caption" sx={{ color: '#6b7280' }}>Name</Typography>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#111827' }}>
                    {successMessage.userName}
                  </Typography>
                </Paper>
                <Paper elevation={0} sx={{ p: 1.25, textAlign: 'left', bgcolor: 'transparent', gridColumn: '1 / -1' }}>
                  <Typography variant="caption" sx={{ color: '#6b7280' }}>Timestamp</Typography>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#111827' }}>
                    {successMessage.timestamp}
                  </Typography>
                </Paper>
                {successMessage.type === 'exit' && successMessage.timeSpent && (
                  <Paper elevation={0} sx={{ p: 1.25, textAlign: 'left', bgcolor: 'transparent', gridColumn: '1 / -1' }}>
                    <Typography variant="caption" sx={{ color: '#6b7280' }}>Time Spent</Typography>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#111827' }}>
                      {successMessage.timeSpent}
                    </Typography>
                  </Paper>
                )}
              </Box>
            )}
            {submitMsg && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {submitMsg}
              </Alert>
            )}
          </Paper>
        </Box>
      </Box>

      {/* Return Dialog */}
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
            sx={{ mt: 1 }}
          />
          {returnError && <Alert severity="error" sx={{ mt: 2 }}>{returnError}</Alert>}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowReturnDialog(false)} color="inherit">Cancel</Button>
          <Button onClick={handleReturnConfirm} variant="contained">Confirm</Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
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

