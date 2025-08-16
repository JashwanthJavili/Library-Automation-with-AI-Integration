import React, { useState } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  Card,
  CardContent,
  AppBar,
  Toolbar,
  Avatar,
  InputAdornment,
  Alert,
  Snackbar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import QrCodeScannerIcon from '@mui/icons-material/QrCodeScanner';
import LockIcon from '@mui/icons-material/Lock';
import { apiService } from '../services/api';

const LOGO_URL = '/src/assets/Kare_Logo.png';

const quoteText = "AN ANT ON THE MOVE DOES MORE THAN A DOZING OX.";
const libraryTimings = "Mon-Fri: 8AM to 8PM | Sat: 9AM to 2PM";

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
    userName: string;
    timeSpent?: string;
    timestamp: string;
  }>({ show: false, type: 'entry', userName: '', timestamp: '' });
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regNumber.trim() || isProcessing) return;
    
    setIsProcessing(true);
    setSubmitMsg('');
    
    try {
      // First try to record entry
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
            userName: `${user?.firstName} ${user?.lastName}`,
            timestamp
          });
          
          setRegNumber('');
          
          // Auto-hide after 2 seconds
          setTimeout(() => {
            setSuccessMessage(prev => ({ ...prev, show: false }));
          }, 2000);
          
          return;
        }
      } catch (entryError: any) {
        // If entry fails because user is already inside, try exit
        if (entryError.message?.includes('already inside')) {
          try {
            const exitResponse = await apiService.recordExit({
              registrationNumber: regNumber.trim(),
              method: 'manual_entry',
              location: 'main_gate'
            });
            
            if (exitResponse.success) {
              const user = exitResponse.data?.exit?.user;
              const timeSpent = exitResponse.data?.exit?.timeSpent || 'Unknown';
              console.log('Exit response timeSpent:', timeSpent);
              const timestamp = new Date().toLocaleString();
              
              setSuccessMessage({
                show: true,
                type: 'exit',
                userName: `${user?.firstName} ${user?.lastName}`,
                timeSpent,
                timestamp
              });
              
              setRegNumber('');
              
              // Auto-hide after 2 seconds
              setTimeout(() => {
                setSuccessMessage(prev => ({ ...prev, show: false }));
              }, 2000);
              
              return;
            }
          } catch (exitError: any) {
            throw exitError;
          }
        } else {
          throw entryError;
        }
      }
      
    } catch (error: any) {
      console.error('Entry/Exit error:', error);
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
                value={regNumber}
                onChange={e => setRegNumber(e.target.value)}
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
                disabled={isProcessing}
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
                {isProcessing ? 'Processing...' : 'Submit'}
              </Button>
            </form>

            {/* Success Message Display */}
            {successMessage.show && (
              <Box sx={{ 
                mt: 4, 
                p: 4, 
                bgcolor: '#f8f9fa',
                borderRadius: 3,
                border: '2px solid #e9ecef',
                textAlign: 'center',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
              }}>
                <Typography variant="h4" sx={{ 
                  color: '#1e3a8a',
                  fontWeight: 800,
                  mb: 2,
                  fontSize: '2rem'
                }}>
                  {successMessage.type === 'entry' ? 'ENTRY SUCCESSFUL' : 'EXIT SUCCESSFUL'}
                </Typography>
                
                <Typography variant="h5" sx={{ 
                  fontWeight: 700, 
                  mb: 2,
                  color: '#2c3e50',
                  fontSize: '1.5rem'
                }}>
                  {successMessage.userName}
                </Typography>
                
                <Typography variant="h6" sx={{ 
                  color: '#6c757d', 
                  mb: 2,
                  fontSize: '1.2rem',
                  fontWeight: 500
                }}>
                  {successMessage.timestamp}
                </Typography>
                
                {successMessage.type === 'exit' && successMessage.timeSpent && (
                  <Box sx={{
                    mt: 3,
                    p: 2,
                    bgcolor: '#e3f2fd',
                    borderRadius: 2,
                    border: '1px solid #bbdefb'
                  }}>
                    <Typography variant="h6" sx={{ 
                      color: '#1565c0', 
                      fontWeight: 700,
                      fontSize: '1.3rem'
                    }}>
                      Time Spent: {successMessage.timeSpent}
                    </Typography>
                  </Box>
                )}
              </Box>
            )}

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
