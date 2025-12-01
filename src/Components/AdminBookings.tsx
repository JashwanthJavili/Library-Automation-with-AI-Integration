import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  CircularProgress,
  Alert,
  AppBar,
  Toolbar,
  IconButton,
  Avatar,
  Tabs,
  Tab,
  Stack,
  Card,
  CardContent,
  Snackbar,
  Tooltip,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import PendingIcon from '@mui/icons-material/Pending';
import EventIcon from '@mui/icons-material/Event';
import RefreshIcon from '@mui/icons-material/Refresh';
import { apiService } from '../services/api';

interface AdminBookingsProps {
  onReturn: () => void;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div role="tabpanel" hidden={value !== index} {...other}>
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

const AdminBookings: React.FC<AdminBookingsProps> = ({ onReturn }) => {
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  const [comments, setComments] = useState('');
  const [action, setAction] = useState<'approve' | 'reject' | null>(null);
  const [tabValue, setTabValue] = useState(0);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });
  const [stats, setStats] = useState({ pending: 0, approved: 0, rejected: 0, cancelled: 0 });

  useEffect(() => {
    loadBookings();
    const interval = setInterval(loadBookings, 15000); // Auto-refresh every 15s
    return () => clearInterval(interval);
  }, []);

  async function loadBookings() {
    setLoading(true);
    setError('');
    try {
      const res = await apiService.getBookings({}); // Load ALL bookings
      if (res.success && res.data) {
        const allBookings = res.data.bookings || [];
        setBookings(allBookings);
        
        // Calculate stats
        setStats({
          pending: allBookings.filter((b: any) => b.status === 'pending').length,
          approved: allBookings.filter((b: any) => b.status === 'approved').length,
          rejected: allBookings.filter((b: any) => b.status === 'rejected').length,
          cancelled: allBookings.filter((b: any) => b.status === 'cancelled').length,
        });
      } else {
        setError(res.message || 'Failed to load bookings');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load bookings');
    } finally {
      setLoading(false);
    }
  }

  async function handleAction(bookingId: number, approve: boolean) {
    try {
      const res = await apiService.approveBooking(bookingId, approve ? 'approve' : 'reject', comments || undefined);

      if (res.success) {
        setSnackbar({
          open: true,
          message: approve ? 'Booking approved successfully!' : 'Booking rejected successfully!',
          severity: 'success'
        });
        loadBookings(); // Reload all bookings
        setSelectedBooking(null);
        setComments('');
        setAction(null);
      } else {
        setSnackbar({ open: true, message: res.message || 'Action failed', severity: 'error' });
      }
    } catch (err: any) {
      setSnackbar({ open: true, message: err.message || 'Action failed', severity: 'error' });
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'success';
      case 'pending': return 'warning';
      case 'rejected': return 'error';
      case 'cancelled': return 'default';
      default: return 'default';
    }
  };

  const formatDateTime = (dt: string) => {
    if (!dt) return '-';
    try {
      return new Date(dt).toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dt;
    }
  };

  const filterBookings = (status: string) => {
    return bookings.filter(b => b.status === status);
  };

  const renderBookingsTable = (filteredBookings: any[]) => {
    if (loading) {
      return (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      );
    }

    if (filteredBookings.length === 0) {
      return (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <EventIcon sx={{ fontSize: 80, color: '#cbd5e1', mb: 2 }} />
          <Typography variant="h6" color="text.secondary">No bookings found</Typography>
        </Box>
      );
    }

    return (
      <TableContainer>
        <Table>
          <TableHead>
            <TableRow sx={{ bgcolor: '#f8fafc' }}>
              <TableCell sx={{ fontWeight: 700 }}>Hall</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Requester</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Start Time</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>End Time</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Students</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>From / Purpose</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredBookings.map((booking) => {
              let purpose = { title: '-', description: '-' };
              try {
                const p = typeof booking.purpose === 'string' ? JSON.parse(booking.purpose) : booking.purpose;
                if (p) {
                  purpose = { title: p.title || '-', description: p.description || '-' };
                }
              } catch {
                purpose = { title: booking.purpose || '-', description: '' };
              }

              return (
                <TableRow key={booking.id} hover>
                  <TableCell>
                    <Typography variant="body2" fontWeight={600}>{booking.hall_name}</Typography>
                  </TableCell>
                  <TableCell>{booking.requester_name}</TableCell>
                  <TableCell>{formatDateTime(booking.start_datetime)}</TableCell>
                  <TableCell>{formatDateTime(booking.end_datetime)}</TableCell>
                  <TableCell>{booking.num_students}</TableCell>
                  <TableCell>
                    <Box>
                      {purpose.title !== '-' && (
                        <Typography variant="body2" fontWeight={600} color="primary">
                          {purpose.title}
                        </Typography>
                      )}
                      <Tooltip title={purpose.description}>
                        <Typography variant="caption" color="text.secondary" sx={{
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden'
                        }}>
                          {purpose.description}
                        </Typography>
                      </Tooltip>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={booking.status.toUpperCase()}
                      color={getStatusColor(booking.status) as any}
                      size="small"
                      sx={{ fontWeight: 600 }}
                    />
                  </TableCell>
                  <TableCell>
                    {booking.status === 'pending' ? (
                      <Stack direction="row" spacing={1}>
                        <Button
                          size="small"
                          variant="contained"
                          color="success"
                          startIcon={<CheckCircleIcon />}
                          onClick={() => {
                            setSelectedBooking(booking);
                            setAction('approve');
                          }}
                        >
                          Approve
                        </Button>
                        <Button
                          size="small"
                          variant="outlined"
                          color="error"
                          startIcon={<CancelIcon />}
                          onClick={() => {
                            setSelectedBooking(booking);
                            setAction('reject');
                          }}
                        >
                          Reject
                        </Button>
                      </Stack>
                    ) : (
                      <Typography variant="caption" color="text.secondary">
                        {booking.approved_by_name && `By: ${booking.approved_by_name}`}
                        {booking.approved_at && ` on ${formatDateTime(booking.approved_at)}`}
                        {booking.admin_comments ? ` — Comment: ${booking.admin_comments}` : ''}
                      </Typography>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    );
  };

  return (
    <Box sx={{ 
      minHeight: '100vh', 
      height: '100%',
      width: '100vw',
      maxWidth: '100%',
      bgcolor: '#f5f7fa',
      overflow: 'auto',
      boxSizing: 'border-box'
    }}>
      {/* Professional Header */}
      <AppBar position="static" elevation={0} sx={{ bgcolor: '#ffffff', borderBottom: '2px solid #e3e8f0' }}>
        <Toolbar sx={{ px: { xs: 2, md: 4 }, py: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexGrow: 1 }}>
            <Avatar src="/src/assets/Kare_Logo.png" alt="KARE" sx={{ width: 52, height: 52 }} />
            <Box>
              <Typography variant="h5" sx={{ color: '#1e3a8a', fontWeight: 700, letterSpacing: '-0.5px' }}>
                LMS – KARE
              </Typography>
              <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 500 }}>
                Library Management System
              </Typography>
            </Box>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{ textAlign: 'right', display: { xs: 'none', md: 'block' } }}>
              <Typography variant="subtitle1" sx={{ color: '#475569', fontWeight: 600 }}>
                Admin: Manage Bookings
              </Typography>
              <Typography variant="caption" sx={{ color: '#94a3b8' }}>
                Approve or reject booking requests
              </Typography>
            </Box>
            <Tooltip title="Refresh Data">
              <IconButton 
                onClick={loadBookings} 
                sx={{ 
                  bgcolor: '#dbeafe', 
                  mr: 1, 
                  '&:hover': { bgcolor: '#bfdbfe', transform: 'rotate(180deg)' },
                  transition: 'all 0.3s'
                }}
              >
                <RefreshIcon sx={{ color: '#1e3a8a' }} />
              </IconButton>
            </Tooltip>
            <IconButton 
              onClick={onReturn} 
              sx={{ 
                bgcolor: '#eef2ff', 
                '&:hover': { bgcolor: '#dbeafe', transform: 'scale(1.05)' },
                transition: 'all 0.2s'
              }}
            >
              <ArrowBackIcon sx={{ color: '#1e3a8a' }} />
            </IconButton>
          </Box>
        </Toolbar>
      </AppBar>

      <Box sx={{ width: '100%', p: { xs: 2, md: 4 }, boxSizing: 'border-box' }}>
        {error && (
          <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        {/* Stats Cards */}
        <Box sx={{ 
          display: 'grid', 
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
          gap: 3,
          mb: 4 
        }}>
          <Card elevation={2} sx={{ background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)', color: '#fff' }}>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={2}>
                <PendingIcon sx={{ fontSize: 48, opacity: 0.9 }} />
                <Box>
                  <Typography variant="h4" fontWeight={700}>{stats.pending}</Typography>
                  <Typography variant="body2">Pending</Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
          <Card elevation={2} sx={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: '#fff' }}>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={2}>
                <CheckCircleIcon sx={{ fontSize: 48, opacity: 0.9 }} />
                <Box>
                  <Typography variant="h4" fontWeight={700}>{stats.approved}</Typography>
                  <Typography variant="body2">Approved</Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
          <Card elevation={2} sx={{ background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)', color: '#fff' }}>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={2}>
                <CancelIcon sx={{ fontSize: 48, opacity: 0.9 }} />
                <Box>
                  <Typography variant="h4" fontWeight={700}>{stats.rejected}</Typography>
                  <Typography variant="body2">Rejected</Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
          <Card elevation={2} sx={{ background: 'linear-gradient(135deg, #94a3b8 0%, #64748b 100%)', color: '#fff' }}>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={2}>
                <CancelIcon sx={{ fontSize: 48, opacity: 0.9 }} />
                <Box>
                  <Typography variant="h4" fontWeight={700}>{stats.cancelled}</Typography>
                  <Typography variant="body2">Cancelled</Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Box>

        {/* Tabs */}
        <Paper elevation={2} sx={{ borderRadius: 3 }}>
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs value={tabValue} onChange={(_e, newValue) => setTabValue(newValue)}>
              <Tab label={`Pending (${stats.pending})`} />
              <Tab label={`Approved (${stats.approved})`} />
              <Tab label={`Rejected (${stats.rejected})`} />
              <Tab label={`Cancelled (${stats.cancelled})`} />
              <Tab label="All Bookings" />
            </Tabs>
          </Box>

          <TabPanel value={tabValue} index={0}>
            {renderBookingsTable(filterBookings('pending'))}
          </TabPanel>
          <TabPanel value={tabValue} index={1}>
            {renderBookingsTable(filterBookings('approved'))}
          </TabPanel>
          <TabPanel value={tabValue} index={2}>
            {renderBookingsTable(filterBookings('rejected'))}
          </TabPanel>
          <TabPanel value={tabValue} index={3}>
            {renderBookingsTable(filterBookings('cancelled'))}
          </TabPanel>
          <TabPanel value={tabValue} index={4}>
            {renderBookingsTable(bookings)}
          </TabPanel>
        </Paper>

        {/* Action Dialog */}
        <Dialog open={!!selectedBooking} onClose={() => setSelectedBooking(null)} maxWidth="sm" fullWidth>
          <DialogTitle sx={{ bgcolor: action === 'approve' ? '#ecfdf5' : '#fef2f2' }}>
            <Stack direction="row" spacing={1} alignItems="center">
              {action === 'approve' ? <CheckCircleIcon color="success" /> : <CancelIcon color="error" />}
              <Typography variant="h6">
                {action === 'approve' ? 'Approve' : 'Reject'} Booking
              </Typography>
            </Stack>
          </DialogTitle>
          <DialogContent sx={{ mt: 2 }}>
            {selectedBooking && (
              <Box sx={{ mb: 2, p: 2, bgcolor: '#f8fafc', borderRadius: 2 }}>
                <Typography variant="body2" color="text.secondary">Hall: <strong>{selectedBooking.hall_name}</strong></Typography>
                <Typography variant="body2" color="text.secondary">Requester: <strong>{selectedBooking.requester_name}</strong></Typography>
                <Typography variant="body2" color="text.secondary">
                  Time: <strong>{formatDateTime(selectedBooking.start_datetime)}</strong> to <strong>{formatDateTime(selectedBooking.end_datetime)}</strong>
                </Typography>
              </Box>
            )}
            <TextField
              fullWidth
              multiline
              rows={3}
              label="Admin Comments (optional)"
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              placeholder="Add any notes or reasons for this decision..."
            />
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={() => { setSelectedBooking(null); setComments(''); setAction(null); }}>
              Cancel
            </Button>
            <Button
              variant="contained"
              onClick={() => selectedBooking && handleAction(selectedBooking.id, action === 'approve')}
              color={action === 'approve' ? 'success' : 'error'}
              startIcon={action === 'approve' ? <CheckCircleIcon /> : <CancelIcon />}
            >
              Confirm {action === 'approve' ? 'Approval' : 'Rejection'}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={snackbar.severity as any} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default AdminBookings;
