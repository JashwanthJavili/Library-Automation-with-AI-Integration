import React, { useState, useEffect } from 'react';
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
  Tooltip,
  Card,
  CardContent,
  CircularProgress,
  Fade,
  Modal
} from '@mui/material';
import QrCodeScannerIcon from '@mui/icons-material/QrCodeScanner';
import LockIcon from '@mui/icons-material/Lock';
import PeopleIcon from '@mui/icons-material/People';
import WomanIcon from '@mui/icons-material/Woman';
import ManIcon from '@mui/icons-material/Man';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import BlockIcon from '@mui/icons-material/Block';
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
  const [stats, setStats] = useState<any>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [showStats] = useState(true);
  const [showReloadBlocked, setShowReloadBlocked] = useState(false);

  // Prevent page reload and navigation
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
      setShowReloadBlocked(true);
      setTimeout(() => setShowReloadBlocked(false), 3000);
      return '';
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent F5, Ctrl+R, Ctrl+F5
      if (e.key === 'F5' || (e.ctrlKey && e.key === 'r') || (e.ctrlKey && e.shiftKey && e.key === 'R')) {
        e.preventDefault();
        setShowReloadBlocked(true);
        setTimeout(() => setShowReloadBlocked(false), 3000);
        return false;
      }
    };

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      return false;
    };

    // Add event listeners
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('contextmenu', handleContextMenu);

    // Cleanup
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('contextmenu', handleContextMenu);
    };
  }, []);

  // Fetch dashboard statistics
  const fetchStats = async () => {
    try {
      setStatsLoading(true);
      const response = await apiService.getDashboardStats();
      if (response.success) {
        setStats(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      setStatsLoading(false);
    }
  };

  // Initial stats fetch and periodic updates
  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 10000); // Update every 10 seconds
    return () => clearInterval(interval);
  }, []);

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
          
          // Refresh stats after successful entry
          fetchStats();
          
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
            
            // Refresh stats after successful exit
            fetchStats();
            
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

      {/* Main Content - Entry Management */}
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
              p: { xs: 3, sm: 4 },
              borderRadius: 3,
              bgcolor: 'rgba(255, 255, 255, 0.95)',
              boxShadow: '0 15px 35px rgba(2, 6, 23, 0.1)',
              textAlign: 'center',
              width: '100%'
            }}
          >
            <Typography variant="h5" sx={{ mb: 1, fontWeight: 700, color: '#0f172a', letterSpacing: 0.2 }}>
              Entry Management
            </Typography>
            <Typography variant="body1" sx={{ mb: 1, color: '#6b7280' }}>
              Central Library Main Gate
            </Typography>
            <Typography variant="h6" sx={{ mb: 3, color: '#3b82f6', fontWeight: 700, letterSpacing: 1 }}>
              SCAN YOUR ID CARD
            </Typography>
            <Typography variant="body2" sx={{ mb: 3, display: 'block', color: '#6b7280' }}>
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
                      <QrCodeScannerIcon sx={{ color: '#9ca3af', fontSize: 28 }} />
                    </InputAdornment>
                  )
                }}
                sx={{ mb: 3, '& .MuiInputBase-input': { fontSize: '1.1rem', py: 1.5 } }}
                required
              />
              <Button
                variant="contained"
                type="submit"
                fullWidth
                disabled={isProcessing}
                sx={{
                  py: 1.5,
                  fontWeight: 700,
                  borderRadius: 2,
                  bgcolor: '#1d4ed8',
                  boxShadow: '0 8px 16px rgba(29,78,216,0.15)',
                  '&:hover': { bgcolor: '#1e40af', boxShadow: '0 10px 18px rgba(30,64,175,0.2)' },
                  '&:disabled': { bgcolor: '#9ca3af' },
                  fontSize: '1.1rem'
                }}
              >
                {isProcessing ? 'Processing...' : 'Submit'}
              </Button>
            </form>
            {successMessage.show && (
              <Box sx={{
                mt: 2,
                p: 2,
                borderRadius: 2,
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 1.5,
                bgcolor: successMessage.type === 'entry' ? 'rgba(236, 253, 245, 0.95)' : 'rgba(254, 242, 242, 0.95)',
                border: successMessage.type === 'entry' ? '1px solid #10b981' : '1px solid #ef4444'
              }}>
                <Box sx={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'center', mb: 1 }}>
                  <Typography variant="h6" sx={{
                    fontWeight: 800,
                    letterSpacing: 1,
                    color: successMessage.type === 'entry' ? '#047857' : '#b91c1c'
                  }}>
                    {successMessage.type === 'entry' ? 'Entry Successful' : 'Exit Successful'}
                  </Typography>
                </Box>
                <Paper elevation={0} sx={{ p: 1, textAlign: 'left', bgcolor: 'transparent' }}>
                  <Typography variant="caption" sx={{ color: '#6b7280', mb: 0.25, display: 'block' }}>Registration No.</Typography>
                  <Typography variant="body1" sx={{ fontWeight: 700, fontFamily: 'monospace', color: '#111827' }}>
                    {successMessage.registrationNumber}
                  </Typography>
                </Paper>
                <Paper elevation={0} sx={{ p: 1, textAlign: 'left', bgcolor: 'transparent' }}>
                  <Typography variant="caption" sx={{ color: '#6b7280', mb: 0.25, display: 'block' }}>Name</Typography>
                  <Typography variant="body1" sx={{ fontWeight: 700, color: '#111827' }}>
                    {successMessage.userName}
                  </Typography>
                </Paper>
                <Paper elevation={0} sx={{ p: 1, textAlign: 'left', bgcolor: 'transparent', gridColumn: '1 / -1' }}>
                  <Typography variant="caption" sx={{ color: '#6b7280', mb: 0.25, display: 'block' }}>Timestamp</Typography>
                  <Typography variant="body1" sx={{ fontWeight: 600, color: '#111827' }}>
                    {successMessage.timestamp}
                  </Typography>
                </Paper>
                {successMessage.type === 'exit' && successMessage.timeSpent && (
                  <Paper elevation={0} sx={{ p: 1, textAlign: 'left', bgcolor: 'transparent', gridColumn: '1 / -1' }}>
                    <Typography variant="caption" sx={{ color: '#6b7280', mb: 0.25, display: 'block' }}>Time Spent</Typography>
                    <Typography variant="body1" sx={{ fontWeight: 700, color: '#111827' }}>
                      {successMessage.timeSpent}
                    </Typography>
                  </Paper>
                )}
              </Box>
            )}
            {submitMsg && (
              <Alert severity="error" sx={{ mt: 3 }}>
                {submitMsg}
              </Alert>
            )}
          </Paper>
        </Box>
      </Box>

      {/* Statistics Dashboard - Moved to Bottom */}
      <Fade in={showStats} timeout={1000}>
        <Box sx={{ 
          p: { xs: 0.5, sm: 1 }, 
          bgcolor: 'rgba(255, 255, 255, 0.95)',
          borderTop: '1px solid #e5e7eb'
        }}>
          <Box sx={{ 
            display: 'grid', 
            gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(4, 1fr)' }, 
            gap: 1, 
            maxWidth: 900, 
            mx: 'auto' 
          }}>
            {/* Current Students */}
            <Card sx={{ 
              textAlign: 'center', 
              bgcolor: '#f8fafc',
              border: '1px solid #e2e8f0',
              '&:hover': { boxShadow: 1 }
            }}>
              <CardContent sx={{ py: 0.75 }}>
                <PeopleIcon sx={{ fontSize: 20, color: '#3b82f6', mb: 0.25 }} />
                <Typography variant="h6" sx={{ fontWeight: 700, color: '#1e40af', mb: 0.25 }}>
                  {statsLoading ? <CircularProgress size={20} /> : (stats?.current?.totalStudents || 0)}
                </Typography>
                <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600 }}>
                  Currently Inside
                </Typography>
              </CardContent>
            </Card>

            {/* Girls Count */}
            <Card sx={{ 
              textAlign: 'center', 
              bgcolor: '#fef2f2',
              border: '1px solid #fecaca',
              '&:hover': { boxShadow: 1 }
            }}>
              <CardContent sx={{ py: 0.75 }}>
                <WomanIcon sx={{ fontSize: 20, color: '#dc2626', mb: 0.25 }} />
                <Typography variant="h6" sx={{ fontWeight: 700, color: '#b91c1c', mb: 0.25 }}>
                  {statsLoading ? <CircularProgress size={20} /> : (stats?.current?.girls || 0)}
                </Typography>
                <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600 }}>
                  Females Inside
                </Typography>
              </CardContent>
            </Card>

            {/* Boys Count */}
            <Card sx={{ 
              textAlign: 'center', 
              bgcolor: '#eff6ff',
              border: '1px solid #bfdbfe',
              '&:hover': { boxShadow: 1 }
            }}>
              <CardContent sx={{ py: 0.75 }}>
                <ManIcon sx={{ fontSize: 20, color: '#2563eb', mb: 0.25 }} />
                <Typography variant="h6" sx={{ fontWeight: 700, color: '#1d4ed8', mb: 0.25 }}>
                  {statsLoading ? <CircularProgress size={20} /> : (stats?.current?.boys || 0)}
                </Typography>
                <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600 }}>
                  Mens Inside
                </Typography>
              </CardContent>
            </Card>

            {/* Today's Total */}
            <Card sx={{ 
              textAlign: 'center', 
              bgcolor: '#f0fdf4',
              border: '1px solid #bbf7d0',
              '&:hover': { boxShadow: 1 }
            }}>
              <CardContent sx={{ py: 0.75 }}>
                <TrendingUpIcon sx={{ fontSize: 20, color: '#16a34a', mb: 0.25 }} />
                <Typography variant="h6" sx={{ fontWeight: 700, color: '#15803d', mb: 0.25 }}>
                  {statsLoading ? <CircularProgress size={20} /> : (stats?.today?.totalEntries || 0)}
                </Typography>
                <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600 }}>
                  Today's Entries
                </Typography>
              </CardContent>
            </Card>
          </Box>
        </Box>
      </Fade>

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

      {/* Reload Blocked Modal */}
      <Modal
        open={showReloadBlocked}
        onClose={() => setShowReloadBlocked(false)}
        aria-labelledby="reload-blocked-modal"
      >
        <Box sx={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: { xs: '90%', sm: 400 },
          bgcolor: 'background.paper',
          borderRadius: 3,
          boxShadow: 24,
          p: 4,
          textAlign: 'center'
        }}>
          <BlockIcon sx={{ fontSize: 64, color: '#ef4444', mb: 2 }} />
          <Typography variant="h5" sx={{ fontWeight: 700, color: '#ef4444', mb: 2 }}>
            Reload Blocked!
          </Typography>
          <Typography variant="body1" sx={{ color: '#6b7280', mb: 3 }}>
            Page reload is locked to prevent interruption of the entry process.
          </Typography>
          <Typography variant="body2" sx={{ color: '#9ca3af' }}>
            This message will disappear automatically.
          </Typography>
        </Box>
      </Modal>
    </Box>
  );
};

export default MainGateEntry;

