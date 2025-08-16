import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  AppBar,
  Toolbar,
  Avatar,
  Button,
  Alert,
  CircularProgress,
  Divider,
  ToggleButton,
  ToggleButtonGroup
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import PeopleIcon from '@mui/icons-material/People';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import { apiService } from '../services/api';

const LOGO_URL = '/src/assets/Kare_Logo.png';

interface ActiveEntry {
  id: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    studentId: string;
    department: string;
  };
  timestamp: string;
  method: string;
  purpose: string;
  location: string;
  timeSpent: number; // in minutes
}

interface HistoricalEntry {
  id: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    studentId: string;
    department: string;
  };
  entryTime: string;
  exitTime: string;
  duration: number; // in minutes
  timeSpent: string;
  method: string;
  purpose: string;
  location: string;
}

interface AnalyticsProps {
  onReturn: () => void;
}

const Analytics: React.FC<AnalyticsProps> = ({ onReturn }) => {
  const [activeEntries, setActiveEntries] = useState<ActiveEntry[]>([]);
  const [historicalEntries, setHistoricalEntries] = useState<HistoricalEntry[]>([]);
  const [viewMode, setViewMode] = useState<'current' | 'previous'>('current');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const fetchActiveEntries = async () => {
    try {
      setError(null);
      const response = await apiService.getActiveEntries();
      
      if (response.success) {
        const entries = response.data?.entries || [];
        // Transform EntryRecord to ActiveEntry format
        const transformedEntries = entries
          .filter(entry => entry.user && entry.user._id) // Filter out entries with null users
          .map(entry => ({
            id: entry._id,
            user: {
              id: entry.user._id,
              firstName: entry.user.firstName || 'Unknown',
              lastName: entry.user.lastName || 'User',
              studentId: entry.user.studentId || 'N/A',
              department: entry.user.department || 'Unknown'
            },
            timestamp: entry.timestamp,
            method: entry.method,
            purpose: entry.purpose || 'study',
            location: entry.location,
            timeSpent: (() => {
              // Calculate real-time time spent from entry timestamp
              const entryTime = new Date(entry.timestamp).getTime();
              const currentTime = new Date().getTime();
              const minutesSpent = (currentTime - entryTime) / (1000 * 60);
              return minutesSpent;
            })()
          }));
        setActiveEntries(transformedEntries);
        setLastUpdated(new Date());
      } else {
        setError(response.message || 'Failed to fetch active entries');
      }
    } catch (err: any) {
      console.error('Error fetching active entries:', err);
      setError(err.message || 'Failed to fetch active entries');
    } finally {
      setLoading(false);
    }
  };

  const fetchHistoricalEntries = async () => {
    try {
      setError(null);
      const response = await apiService.getHistoricalEntries(100);
      
      if (response.success) {
        const entries = response.data?.entries || [];
        // Transform to HistoricalEntry format
        const transformedEntries = entries
          .filter(entry => entry.user && entry.user._id && entry.entryType === 'exit')
          .map(entry => ({
            id: entry._id,
            user: {
              id: entry.user._id,
              firstName: entry.user.firstName || 'Unknown',
              lastName: entry.user.lastName || 'User',
              studentId: entry.user.studentId || 'N/A',
              department: entry.user.department || 'Unknown'
            },
            entryTime: entry.entryTime || entry.timestamp,
            exitTime: entry.timestamp,
            duration: entry.duration || 0,
            timeSpent: (() => {
              // Debug logging
              console.log('Entry data:', { 
                id: entry._id, 
                duration: entry.duration, 
                timeSpent: entry.timeSpent,
                entryTime: entry.entryTime,
                exitTime: entry.timestamp 
              });
              
              // If we have a timeSpent string from backend, use it
              if (entry.timeSpent && typeof entry.timeSpent === 'string') {
                return entry.timeSpent;
              }
              
              // Calculate duration from timestamps if available
              if (entry.entryTime && entry.timestamp) {
                const entryTime = new Date(entry.entryTime).getTime();
                const exitTime = new Date(entry.timestamp).getTime();
                const calculatedDuration = (exitTime - entryTime) / (1000 * 60); // minutes
                console.log('Calculated duration:', calculatedDuration);
                return formatTimeSpent(calculatedDuration);
              }
              
              // Fallback to duration field
              return formatTimeSpent(entry.duration || 0);
            })(),
            method: entry.method,
            purpose: entry.purpose || 'study',
            location: entry.location
          }));
        setHistoricalEntries(transformedEntries);
        setLastUpdated(new Date());
      } else {
        setError(response.message || 'Failed to fetch historical entries');
      }
    } catch (err: any) {
      console.error('Error fetching historical entries:', err);
      setError(err.message || 'Failed to fetch historical entries');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (viewMode === 'current') {
      fetchActiveEntries();
    } else {
      fetchHistoricalEntries();
    }
  }, [viewMode]);

  // Add a separate effect for real-time updates of current students
  useEffect(() => {
    if (viewMode === 'current' && activeEntries.length > 0) {
      const updateTimeSpent = () => {
        setActiveEntries(prevEntries => 
          prevEntries.map(entry => ({
            ...entry,
            timeSpent: (() => {
              const entryTime = new Date(entry.timestamp).getTime();
              const currentTime = new Date().getTime();
              const minutesSpent = (currentTime - entryTime) / (1000 * 60);
              return minutesSpent;
            })()
          }))
        );
      };

      // Update time spent every 30 seconds
      const timeUpdateInterval = setInterval(updateTimeSpent, 30000);
      
      return () => clearInterval(timeUpdateInterval);
    }
  }, [viewMode, activeEntries.length]);

  useEffect(() => {
    fetchActiveEntries();
    
    // Auto-refresh every 30 seconds for current view only
    const interval = viewMode === 'current' ? setInterval(fetchActiveEntries, 30000) : null;
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [viewMode]);

  const handleViewModeChange = (_: React.MouseEvent<HTMLElement>, newViewMode: 'current' | 'previous') => {
    if (newViewMode !== null) {
      setViewMode(newViewMode);
      setLoading(true);
    }
  };

  const formatTimeSpent = (minutes: number): string => {
    if (minutes < 1) {
      // For very short durations, show seconds
      const seconds = Math.round(minutes * 60);
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

  const getTimeSpentColor = (minutes: number): string => {
    if (minutes < 60) return '#4caf50'; // Green for < 1 hour
    if (minutes < 180) return '#ff9800'; // Orange for 1-3 hours
    return '#f44336'; // Red for > 3 hours
  };

  const totalStudentsInside = activeEntries.length;
  const averageTimeSpent = activeEntries.length > 0 
    ? Math.round(activeEntries.reduce((sum, entry) => sum + entry.timeSpent, 0) / activeEntries.length)
    : 0;

  return (
    <Box sx={{ minHeight: '100vh', width: '100vw', bgcolor: '#f8fafc' }}>
      {/* Header */}
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
            onClick={onReturn}
            sx={{ textTransform: 'none', fontWeight: 600 }}
            startIcon={<ArrowBackIcon />}
          >
            Back to Dashboard
          </Button>
        </Toolbar>
      </AppBar>

      <Box sx={{ p: { xs: 2, md: 4 }, maxWidth: 1280, mx: 'auto' }}>
        {/* Page Title */}
        <Typography variant="h4" sx={{ fontWeight: 700, color: '#1e3a8a', mb: 1 }}>
          Analytics & Reports
        </Typography>
        <Typography variant="subtitle1" sx={{ color: '#64748b', mb: 4 }}>
          Real-time library status and student activity monitoring
        </Typography>

        {/* Statistics Cards */}
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, mb: 4 }}>
          <Box sx={{ flex: { xs: '1 1 100%', sm: '1 1 calc(50% - 12px)', md: '1 1 calc(33.333% - 16px)' } }}>
            <Card sx={{ borderRadius: 3, boxShadow: 3 }}>
              <CardContent sx={{ textAlign: 'center', py: 3 }}>
                <PeopleIcon sx={{ fontSize: 48, color: '#228be6', mb: 2 }} />
                <Typography variant="h3" sx={{ fontWeight: 700, color: '#1e3a8a', mb: 1 }}>
                  {totalStudentsInside}
                </Typography>
                <Typography variant="body1" sx={{ color: '#64748b', fontWeight: 500 }}>
                  Students Inside
                </Typography>
              </CardContent>
            </Card>
          </Box>
          
          <Box sx={{ flex: { xs: '1 1 100%', sm: '1 1 calc(50% - 12px)', md: '1 1 calc(33.333% - 16px)' } }}>
            <Card sx={{ borderRadius: 3, boxShadow: 3 }}>
              <CardContent sx={{ textAlign: 'center', py: 3 }}>
                <AccessTimeIcon sx={{ fontSize: 48, color: '#37b24d', mb: 2 }} />
                <Typography variant="h3" sx={{ fontWeight: 700, color: '#1e3a8a', mb: 1 }}>
                  {formatTimeSpent(averageTimeSpent)}
                </Typography>
                <Typography variant="body1" sx={{ color: '#64748b', fontWeight: 500 }}>
                  Average Time Spent
                </Typography>
              </CardContent>
            </Card>
          </Box>
          
          <Box sx={{ flex: { xs: '1 1 100%', sm: '1 1 calc(50% - 12px)', md: '1 1 calc(33.333% - 16px)' } }}>
            <Card sx={{ borderRadius: 3, boxShadow: 3 }}>
              <CardContent sx={{ textAlign: 'center', py: 3 }}>
                <TrendingUpIcon sx={{ fontSize: 48, color: '#f59f00', mb: 2 }} />
                <Typography variant="h3" sx={{ fontWeight: 700, color: '#1e3a8a', mb: 1 }}>
                  {activeEntries.filter(entry => entry.timeSpent > 180).length}
                </Typography>
                <Typography variant="body1" sx={{ color: '#64748b', fontWeight: 500 }}>
                  Long Sessions (3+ hrs)
                </Typography>
              </CardContent>
            </Card>
          </Box>
        </Box>

        {/* Active Students Table */}
        <Card sx={{ borderRadius: 3, boxShadow: 3 }}>
          <CardContent sx={{ p: 0 }}>
            <Box sx={{ p: 3, pb: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" sx={{ fontWeight: 700, color: '#1e3a8a' }}>
                  {viewMode === 'current' ? 'Students Currently Inside Library' : 'Previous Students (Recent Exits)'}
                </Typography>
                <ToggleButtonGroup
                  value={viewMode}
                  exclusive
                  onChange={handleViewModeChange}
                  size="small"
                  sx={{ bgcolor: '#f8fafc' }}
                >
                  <ToggleButton value="current" sx={{ px: 3, fontWeight: 600 }}>
                    Current Students
                  </ToggleButton>
                  <ToggleButton value="previous" sx={{ px: 3, fontWeight: 600 }}>
                    Previous Students
                  </ToggleButton>
                </ToggleButtonGroup>
              </Box>
              <Typography variant="body2" sx={{ color: '#64748b' }}>
                Last updated: {lastUpdated.toLocaleTimeString()}
              </Typography>
            </Box>
            
            <Divider />
            
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
                <CircularProgress />
              </Box>
            ) : error ? (
              <Box sx={{ p: 3 }}>
                <Alert severity="error" sx={{ mb: 2 }}>
                  {error}
                </Alert>
                <Button variant="contained" onClick={fetchActiveEntries}>
                  Retry
                </Button>
              </Box>
            ) : (viewMode === 'current' ? activeEntries : historicalEntries).length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 6 }}>
                <PeopleIcon sx={{ fontSize: 64, color: '#cbd5e1', mb: 2 }} />
                <Typography variant="h6" sx={{ color: '#64748b', mb: 1 }}>
                  {viewMode === 'current' ? 'No Students Inside' : 'No Previous Students'}
                </Typography>
                <Typography variant="body2" sx={{ color: '#94a3b8' }}>
                  {viewMode === 'current' ? 'All students have exited the library' : 'No recent exit records found'}
                </Typography>
              </Box>
            ) : (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow sx={{ bgcolor: '#f8fafc' }}>
                      <TableCell sx={{ fontWeight: 700, color: '#374151' }}>Student</TableCell>
                      <TableCell sx={{ fontWeight: 700, color: '#374151' }}>Registration No.</TableCell>
                      <TableCell sx={{ fontWeight: 700, color: '#374151' }}>Department</TableCell>
                      <TableCell sx={{ fontWeight: 700, color: '#374151' }}>Entry Time</TableCell>
                      {viewMode === 'previous' && (
                        <TableCell sx={{ fontWeight: 700, color: '#374151' }}>Exit Time</TableCell>
                      )}
                      <TableCell sx={{ fontWeight: 700, color: '#374151' }}>Time Spent</TableCell>
                      <TableCell sx={{ fontWeight: 700, color: '#374151' }}>Purpose</TableCell>
                      <TableCell sx={{ fontWeight: 700, color: '#374151' }}>Location</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(viewMode === 'current' ? activeEntries : historicalEntries).map((entry) => (
                      <TableRow key={entry.id} sx={{ '&:hover': { bgcolor: '#f8fafc' } }}>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {entry.user.firstName} {entry.user.lastName}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                            {entry.user.studentId}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {entry.user.department}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {viewMode === 'current' 
                              ? new Date((entry as ActiveEntry).timestamp).toLocaleTimeString()
                              : new Date((entry as HistoricalEntry).entryTime).toLocaleTimeString()
                            }
                          </Typography>
                        </TableCell>
                        {viewMode === 'previous' && (
                          <TableCell>
                            <Typography variant="body2">
                              {new Date((entry as HistoricalEntry).exitTime).toLocaleTimeString()}
                            </Typography>
                          </TableCell>
                        )}
                        <TableCell>
                          <Chip
                            label={viewMode === 'current' 
                              ? formatTimeSpent((entry as ActiveEntry).timeSpent) 
                              : (entry as HistoricalEntry).timeSpent
                            }
                            size="small"
                            sx={{
                              bgcolor: viewMode === 'current' 
                                ? getTimeSpentColor((entry as ActiveEntry).timeSpent) 
                                : '#37b24d',
                              color: 'white',
                              fontWeight: 600
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={entry.purpose}
                            size="small"
                            variant="outlined"
                            sx={{ textTransform: 'capitalize' }}
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>
                            {entry.location.replace('_', ' ')}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
};

export default Analytics;
