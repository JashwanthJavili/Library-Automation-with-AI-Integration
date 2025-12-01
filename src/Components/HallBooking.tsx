import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Button,
  TextField,
  MenuItem,
  Alert,
  Paper,
  AppBar,
  Toolbar,
  Avatar,
  IconButton,
  Card,
  CardContent,
  Chip,
  Stack,
  Divider,
  Snackbar
} from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { TimePicker } from '@mui/x-date-pickers/TimePicker';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import EventIcon from '@mui/icons-material/Event';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import PeopleIcon from '@mui/icons-material/People';
import RoomIcon from '@mui/icons-material/Room';
import dayjs, { Dayjs } from 'dayjs';
import { apiService } from '../services/api';

interface HallBookingProps { onReturn: () => void }

const HallBooking: React.FC<HallBookingProps> = ({ onReturn }) => {
  const [halls, setHalls] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string>('');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });
  
  const [form, setForm] = useState({
    hall_ids: [] as (string|number)[],
    start_date: null as Dayjs | null,
    start_time: null as Dayjs | null,
    end_date: null as Dayjs | null,
    end_time: null as Dayjs | null,
    num_students: 10,
    purpose_title: '',
    purpose_description: ''
  });
  
  const [bookings, setBookings] = useState<any[]>([]);

  useEffect(() => {
    loadHalls();
    loadMyBookings();
    const interval = setInterval(loadMyBookings, 10000); // Auto-refresh every 10s
    return () => clearInterval(interval);
  }, []);

  async function loadHalls() {
    setLoading(true);
    try {
      const res = await apiService.getHalls();
      if (res.success && res.data) setHalls(res.data.halls || []);
    } catch {
      setSnackbar({ open: true, message: 'Failed to load halls', severity: 'error' });
    } finally {
      setLoading(false);
    }
  }

  async function loadMyBookings() {
    try {
      const res = await apiService.getBookings({ mine: true });
      if (res.success && res.data) setBookings(res.data.bookings || []);
    } catch (err) {
      console.error('Failed to load bookings:', err);
    }
  }

  function handleChange(key: string, value: any) {
    setForm(prev => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    
    if (!form.hall_ids.length || !form.start_date || !form.start_time || !form.end_date || !form.end_time) {
      setError('Please fill all required fields');
      return;
    }

    // Combine date and time
    const startDateTime = form.start_date
      .hour(form.start_time.hour())
      .minute(form.start_time.minute())
      .second(0);
    
    const endDateTime = form.end_date
      .hour(form.end_time.hour())
      .minute(form.end_time.minute())
      .second(0);
    
    if (endDateTime.isBefore(startDateTime) || endDateTime.isSame(startDateTime)) {
      setError('End time must be after start time');
      return;
    }

    setSubmitting(true);
    try {
      for (const hallId of form.hall_ids) {
        const res = await apiService.createBooking({
          hall_id: Number(hallId),
          start_datetime: startDateTime.toISOString(),
          end_datetime: endDateTime.toISOString(),
          num_students: Number(form.num_students || 0),
          purpose_title: form.purpose_title,
          purpose_description: form.purpose_description
        });
        if (!res.success) {
          throw new Error(res.message || 'Failed to create one of the bookings');
        }
      }
      setSnackbar({ open: true, message: 'Booking submitted successfully! Awaiting admin approval.', severity: 'success' });
      setForm({
        hall_ids: [],
        start_date: null,
        start_time: null,
        end_date: null,
        end_time: null,
        num_students: 10,
        purpose_title: '',
        purpose_description: ''
      });
      loadMyBookings();
    } catch (err: any) {
      setSnackbar({ open: true, message: err?.message || 'Failed to create booking', severity: 'error' });
    } finally {
      setSubmitting(false);
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
                Hall / Room Booking
              </Typography>
              <Typography variant="caption" sx={{ color: '#94a3b8' }}>
                Request facility reservations
              </Typography>
            </Box>
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
          <Alert 
            severity="error" 
            sx={{ mb: 3, borderRadius: 2 }} 
            onClose={() => setError('')}
          >
            {error}
          </Alert>
        )}
        {/* Booking Form Card */}
        <Paper 
          elevation={3} 
          sx={{ 
            p: { xs: 3, md: 5 }, 
            mb: 4, 
            borderRadius: 3, 
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', 
            color: '#fff',
            boxShadow: '0 10px 40px rgba(102, 126, 234, 0.3)',
            width: '100%'
          }}
        >
          <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 4 }}>
            <RoomIcon sx={{ fontSize: 48, filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))' }} />
            <Box>
              <Typography variant="h4" sx={{ fontWeight: 700, mb: 0.5 }}>
                Book a Hall / Room
              </Typography>
              <Typography variant="body1" sx={{ opacity: 0.95 }}>
                Reserve facilities for your academic activities • Fill in the details below
              </Typography>
            </Box>
          </Stack>

          <Paper sx={{ p: { xs: 3, md: 4 }, bgcolor: '#ffffff', borderRadius: 2 }}>
            <form onSubmit={handleSubmit}>
              <LocalizationProvider dateAdapter={AdapterDayjs}>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  {/* Hall Selection */}
                  <TextField
                    select
                    fullWidth
                    SelectProps={{ multiple: true, renderValue: (selected) => Array.isArray(selected) ? selected.map(id => halls.find(h => String(h.id) === String(id))?.name || id).join(', ') : '' }}
                    label="Select Halls / Rooms *"
                    value={form.hall_ids}
                    onChange={e => handleChange('hall_ids', typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value)}
                    required
                    disabled={loading}
                    sx={{ 
                      '& .MuiOutlinedInput-root': { 
                        bgcolor: '#f8fafc',
                        '&:hover': { bgcolor: '#f1f5f9' }
                      }
                    }}
                  >
                    {halls.map(h => (
                      <MenuItem key={h.id} value={h.id}>
                        <Stack direction="row" spacing={1} alignItems="center" sx={{ width: '100%' }}>
                          <RoomIcon sx={{ color: '#667eea', fontSize: 20 }} />
                          <Box sx={{ flex: 1 }}>
                            <Typography variant="body1" fontWeight={600}>{h.name}</Typography>
                            <Typography variant="caption" color="text.secondary">
                              {h.location} • Capacity: {h.capacity} students
                            </Typography>
                          </Box>
                        </Stack>
                      </MenuItem>
                    ))}
                  </TextField>

                  {/* Date & Time Section - Side by Side Layout */}
                  <Box sx={{ 
                    display: 'grid', 
                    gridTemplateColumns: { xs: '1fr', lg: 'repeat(2, 1fr)' }, 
                    gap: 3,
                  }}>
                    {/* Start Date & Time */}
                    <Box sx={{ 
                      p: 3,
                      bgcolor: '#f8fafc',
                      borderRadius: 2,
                      border: '1px solid #e2e8f0'
                    }}>
                      <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2, color: '#475569', display: 'flex', alignItems: 'center', gap: 1 }}>
                        <EventIcon sx={{ color: '#667eea' }} />
                        Start Date & Time
                      </Typography>
                      
                      <Stack spacing={2}>
                        <DatePicker
                          label="Start Date *"
                          value={form.start_date}
                          onChange={(newValue) => handleChange('start_date', newValue)}
                          minDate={dayjs()}
                          slotProps={{
                            textField: {
                              fullWidth: true,
                              required: true,
                              sx: { bgcolor: '#ffffff' }
                            }
                          }}
                        />
                        
                        <TimePicker
                          label="Start Time *"
                          value={form.start_time}
                          onChange={(newValue) => handleChange('start_time', newValue)}
                          slotProps={{
                            textField: {
                              fullWidth: true,
                              required: true,
                              sx: { bgcolor: '#ffffff' }
                            }
                          }}
                        />
                      </Stack>
                    </Box>

                    {/* End Date & Time */}
                    <Box sx={{ 
                      p: 3,
                      bgcolor: '#f8fafc',
                      borderRadius: 2,
                      border: '1px solid #e2e8f0'
                    }}>
                      <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2, color: '#475569', display: 'flex', alignItems: 'center', gap: 1 }}>
                        <AccessTimeIcon sx={{ color: '#667eea' }} />
                        End Date & Time
                      </Typography>
                      
                      <Stack spacing={2}>
                        <DatePicker
                          label="End Date *"
                          value={form.end_date}
                          onChange={(newValue) => handleChange('end_date', newValue)}
                          minDate={form.start_date || dayjs()}
                          slotProps={{
                            textField: {
                              fullWidth: true,
                              required: true,
                              sx: { bgcolor: '#ffffff' }
                            }
                          }}
                        />
                        
                        <TimePicker
                          label="End Time *"
                          value={form.end_time}
                          onChange={(newValue) => handleChange('end_time', newValue)}
                          slotProps={{
                            textField: {
                              fullWidth: true,
                              required: true,
                              sx: { bgcolor: '#ffffff' }
                            }
                          }}
                        />
                      </Stack>
                    </Box>
                  </Box>

                  {/* Number of Students */}
                  <TextField
                    fullWidth
                    label="Number of Students"
                    type="number"
                    value={form.num_students}
                    onChange={e => handleChange('num_students', Number(e.target.value))}
                    inputProps={{ min: 1, max: 500 }}
                    InputProps={{
                      startAdornment: (
                        <PeopleIcon sx={{ mr: 1.5, color: '#667eea' }} />
                      )
                    }}
                    sx={{ 
                      '& .MuiOutlinedInput-root': { 
                        bgcolor: '#f8fafc',
                        '&:hover': { bgcolor: '#f1f5f9' }
                      }
                    }}
                  />

                  {/* Purpose Section */}
                  <Box sx={{ 
                    p: 3,
                    bgcolor: '#f8fafc',
                    borderRadius: 2,
                    border: '1px solid #e2e8f0'
                  }}>
                    <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2, color: '#475569' }}>
                      Purpose Details
                    </Typography>
                    
                    <Stack spacing={2}>
                      <TextField
                        fullWidth
                        label="From (Department / Person)"
                        value={form.purpose_title}
                        onChange={e => handleChange('purpose_title', e.target.value)}
                        placeholder="e.g., Department of Computer Science / Dr. Sharma"
                        sx={{ 
                          '& .MuiOutlinedInput-root': { 
                            bgcolor: '#ffffff'
                          }
                        }}
                      />
                      
                      <TextField
                        fullWidth
                        multiline
                        rows={4}
                        label="Purpose Description"
                        value={form.purpose_description}
                        onChange={e => handleChange('purpose_description', e.target.value)}
                        placeholder="Describe the purpose of this booking, agenda, and any special requirements..."
                        sx={{ 
                          '& .MuiOutlinedInput-root': { 
                            bgcolor: '#ffffff'
                          }
                        }}
                      />
                    </Stack>
                  </Box>

                  {/* Submit Buttons */}
                  <Stack direction="row" spacing={2} sx={{ pt: 2 }}>
                    <Button
                      type="submit"
                      variant="contained"
                      size="large"
                      disabled={submitting}
                      sx={{
                        px: 5,
                        py: 1.5,
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        fontWeight: 600,
                        fontSize: '1rem',
                        boxShadow: '0 4px 12px rgba(102, 126, 234, 0.4)',
                        '&:hover': {
                          background: 'linear-gradient(135deg, #5568d3 0%, #6a3f8f 100%)',
                          boxShadow: '0 6px 16px rgba(102, 126, 234, 0.5)',
                        }
                      }}
                    >
                      {submitting ? 'Submitting...' : 'Submit Booking Request'}
                    </Button>
                    <Button 
                      variant="outlined" 
                      size="large" 
                      onClick={onReturn} 
                      sx={{ 
                        px: 4,
                        borderWidth: 2,
                        '&:hover': { borderWidth: 2 }
                      }}
                    >
                      Cancel
                    </Button>
                  </Stack>
                </Box>
              </LocalizationProvider>
            </form>
          </Paper>
        </Paper>

        {/* My Bookings History */}
        <Paper 
          elevation={3} 
          sx={{ 
            p: 4, 
            borderRadius: 3,
            background: '#ffffff',
            border: '1px solid #e2e8f0'
          }}
        >
          <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 3 }}>
            <Box sx={{ 
              p: 1.5, 
              borderRadius: 2, 
              bgcolor: '#eef2ff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <EventIcon sx={{ fontSize: 32, color: '#667eea' }} />
            </Box>
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 700, color: '#1e3a8a', mb: 0.5 }}>
                My Booking History
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Track all your hall booking requests and their status
              </Typography>
            </Box>
          </Stack>
          <Divider sx={{ mb: 4 }} />

          {bookings.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 8 }}>
              <RoomIcon sx={{ fontSize: 80, color: '#cbd5e1', mb: 2 }} />
              <Typography variant="h6" color="text.secondary">No bookings yet</Typography>
              <Typography variant="body2" color="text.secondary">Your booking requests will appear here</Typography>
            </Box>
          ) : (
            <Box sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' },
              gap: 3
            }}>
              {bookings.map(booking => {
                let purpose = { title: '', description: '' };
                try {
                  const p = typeof booking.purpose === 'string' ? JSON.parse(booking.purpose) : booking.purpose;
                  if (p) purpose = { title: p.title || '', description: p.description || '' };
                } catch {}

                return (
                  <Card elevation={2} sx={{ height: '100%', borderLeft: `4px solid ${getStatusColor(booking.status) === 'success' ? '#10b981' : getStatusColor(booking.status) === 'warning' ? '#f59e0b' : '#ef4444'}` }} key={booking.id}>
                    <CardContent>
                      <Stack direction="row" justifyContent="space-between" alignItems="start" sx={{ mb: 2 }}>
                        <Typography variant="h6" sx={{ fontWeight: 700, color: '#1e3a8a' }}>
                          {booking.hall_name || 'Hall'}
                        </Typography>
                        <Chip
                          label={booking.status.toUpperCase()}
                          color={getStatusColor(booking.status) as any}
                          size="small"
                          sx={{ fontWeight: 600 }}
                        />
                      </Stack>

                      <Stack spacing={1.5}>
                        <Box>
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>Start</Typography>
                          <Typography variant="body2" fontWeight={600}>{formatDateTime(booking.start_datetime)}</Typography>
                        </Box>
                        <Box>
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>End</Typography>
                          <Typography variant="body2" fontWeight={600}>{formatDateTime(booking.end_datetime)}</Typography>
                        </Box>
                        {purpose.title && (
                          <Box>
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>From</Typography>
                            <Typography variant="body2">{purpose.title}</Typography>
                          </Box>
                        )}
                        {purpose.description && (
                          <Box>
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>Purpose</Typography>
                            <Typography variant="body2" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                              {purpose.description}
                            </Typography>
                          </Box>
                        )}
                        <Box>
                          <Typography variant="caption" color="text.secondary">Requested: {formatDateTime(booking.created_at)}</Typography>
                        </Box>
                        {booking.admin_comments && (
                          <Box>
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>Admin Comment</Typography>
                            <Typography variant="body2" color="text.secondary">{booking.admin_comments}</Typography>
                          </Box>
                        )}
                      </Stack>
                    </CardContent>
                  </Card>
                );
              })}
            </Box>
          )}
        </Paper>
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

export default HallBooking;