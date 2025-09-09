import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
  ToggleButtonGroup,
  TextField,
  Paper,
  useTheme,
  createTheme,
  ThemeProvider,
  TableSortLabel,
  IconButton,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Stack,
  Collapse
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import PeopleIcon from '@mui/icons-material/People';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import SearchIcon from '@mui/icons-material/Search';
import FilterListIcon from '@mui/icons-material/FilterList';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import { apiService } from '../services/api';
import * as XLSX from 'xlsx';

const LOGO_URL = '/src/assets/Kare_Logo.png';

const premiumTheme = createTheme({
  palette: {
    primary: { main: '#1e3a8a' },
    secondary: { main: '#37b24d' },
    background: { default: '#f8fafc', paper: '#ffffff' },
    text: { primary: '#1e293b', secondary: '#475569' }
  },
  typography: {
    fontFamily: 'Roboto, sans-serif',
    h4: { fontWeight: 700, letterSpacing: 0.25 },
    h6: { fontWeight: 600 },
    body2: { fontWeight: 500 }
  },
  components: {
    MuiCard: { styleOverrides: { root: { borderRadius: 16, boxShadow: '0 4px 20px rgba(0,0,0,0.05)' } } },
    MuiButton: { styleOverrides: { root: { borderRadius: 8, textTransform: 'none' } } },
    MuiTableRow: { styleOverrides: { root: { '&:nth-of-type(odd)': { backgroundColor: '#f9fafb' }, '&:hover': { backgroundColor: '#f1f5f9' } } } }
  }
});

interface BaseEntry {
  id: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    studentId: string;
    department: string;
    section?: string;
    gender?: string;
    role?: string;
  };
  method: string;
  location: string;
}

interface ActiveEntry extends BaseEntry {
  timestamp: string;
  timeSpent: number;
}

interface HistoricalEntry extends BaseEntry {
  entryTime: string;
  exitTime: string;
  duration: number;
  timeSpent: string;
}

type Entry = ActiveEntry | HistoricalEntry;

interface AnalyticsProps {
  onReturn: () => void;
}

const parseTimeToMinutes = (timeStr: string): number => {
  const parts = timeStr.match(/\d+[hms]/g) || [];
  return parts.reduce((total, part) => {
    const num = parseInt(part.slice(0, -1), 10);
    if (part.endsWith('h')) return total + num * 60;
    if (part.endsWith('m')) return total + num;
    if (part.endsWith('s')) return total + num / 60;
    return total;
  }, 0);
};

const Analytics: React.FC<AnalyticsProps> = React.memo(({ onReturn }) => {
  const theme = useTheme();
  const [activeEntries, setActiveEntries] = useState<ActiveEntry[]>([]);
  const [historicalEntries, setHistoricalEntries] = useState<HistoricalEntry[]>([]);
  const [viewMode, setViewMode] = useState<'current' | 'previous'>('current');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [searchQuery, setSearchQuery] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({ key: 'entryTime', direction: 'desc' });
  const [sectionFilter, setSectionFilter] = useState<string>('all');
  const [genderFilter, setGenderFilter] = useState<string>('all');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [timeFilter, setTimeFilter] = useState<'all' | '1h' | '24h' | '7d'>('all');
  const [showFilters, setShowFilters] = useState<boolean>(false);
  const [userById, setUserById] = useState<Record<string, any>>({});

  // Fetch users to enrich entries with section, gender, role
  const fetchUsers = useCallback(async () => {
    try {
      const res = await apiService.getUsers({ page: 1, limit: 1000 });
      if (res.success) {
        const map: Record<string, any> = {};
        (res.data?.users || []).forEach((u: any) => { map[u._id] = u; });
        setUserById(map);
      }
    } catch (e) {
      // ignore, we'll just show existing fields
    }
  }, []);

  const fetchActive = useCallback(async () => {
    try {
      setError(null);
      const res = await apiService.getActiveEntries();
      if (res.success) {
        const entries = (res.data?.entries || []).filter(e => e.user?._id).map(e => ({
          id: e._id,
          user: {
            id: e.user._id,
            firstName: e.user.firstName || 'Unknown',
            lastName: e.user.lastName || 'User',
            studentId: e.user.studentId || 'N/A',
            department: e.user.department || 'Unknown',
            section: userById[e.user._id]?.section || e.user.section || '',
            gender: userById[e.user._id]?.gender || e.user.gender || '',
            role: userById[e.user._id]?.role || e.user.role || ''
          },
          timestamp: e.timestamp,
          method: e.method,
          location: e.location,
          timeSpent: (Date.now() - new Date(e.timestamp).getTime()) / 60000
        }));
        setActiveEntries(entries);
        setLastUpdated(new Date());
      } else setError(res.message || 'Failed to fetch active entries');
    } catch (err: any) {
      setError(err.message || 'Failed to fetch active entries');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchHistorical = useCallback(async () => {
    try {
      setError(null);
      const res = await apiService.getHistoricalEntries(100);
      if (res.success) {
        const entries = (res.data?.entries || []).filter(e => e.user?._id).map(e => {
          let tsStr = e.timeSpent;
          if (!tsStr || typeof tsStr !== 'string') {
            const entryT = new Date(e.entryTime || e.timestamp).getTime();
            const exitT = new Date(e.timestamp).getTime();
            const mins = (exitT - entryT) / 60000;
            tsStr = formatTimeSpent(mins);
          }
          return {
            id: e._id,
            user: {
              id: e.user._id,
              firstName: e.user.firstName || 'Unknown',
              lastName: e.user.lastName || 'User',
              studentId: e.user.studentId || 'N/A',
              department: e.user.department || 'Unknown',
              section: userById[e.user._id]?.section || e.user.section || '',
              gender: userById[e.user._id]?.gender || e.user.gender || '',
              role: userById[e.user._id]?.role || e.user.role || ''
            },
            entryTime: e.entryTime || e.timestamp,
            exitTime: e.timestamp,
            duration: e.duration || 0,
            timeSpent: tsStr,
            method: e.method,
            location: e.location
          };
        });
        setHistoricalEntries(entries);
        setLastUpdated(new Date());
      } else setError(res.message || 'Failed to fetch historical entries');
    } catch (err: any) {
      setError(err.message || 'Failed to fetch historical entries');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    viewMode === 'current' ? fetchActive() : fetchHistorical();
  }, [viewMode, fetchActive, fetchHistorical, userById]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  useEffect(() => {
    if (viewMode === 'current') {
      const id = setInterval(fetchActive, 30000);
      return () => clearInterval(id);
    }
  }, [viewMode, fetchActive]);

  useEffect(() => {
    if (viewMode === 'current' && activeEntries.length) {
      const id = setInterval(() => setActiveEntries(prev => prev.map(e => ({ ...e, timeSpent: (Date.now() - new Date(e.timestamp).getTime()) / 60000 }))), 30000);
      return () => clearInterval(id);
    }
  }, [viewMode, activeEntries.length]);

  const formatTimeSpent = (mins: number): string => {
    if (mins < 1) return `${Math.round(mins * 60)}s`;
    const h = Math.floor(mins / 60), m = Math.floor(mins % 60), s = Math.round((mins % 1) * 60);
    return h > 0 ? (s > 0 ? `${h}h ${m}m ${s}s` : `${h}h ${m}m`) : (s > 0 ? `${m}m ${s}s` : `${m}m`);
  };

  const getTimeSpentColor = (mins: number): string => mins < 60 ? theme.palette.secondary.main : mins < 180 ? '#f59f00' : '#ef4444';

  const requestSort = (key: string) => {
    const direction = sortConfig.key === key && sortConfig.direction === 'asc' ? 'desc' : 'asc';
    setSortConfig({ key, direction });
  };

  // Export function
  const handleExport = () => {
    const data = sortedFilteredEntries;
    const timestamp = new Date().toISOString().split('T')[0];
    const prefix = viewMode === 'current' ? 'Current_Students' : 'Previous_Students';
    const isFiltered = sectionFilter !== 'all' || genderFilter !== 'all' || roleFilter !== 'all' || departmentFilter !== 'all' || timeFilter !== 'all' || searchQuery !== '';
    const suffix = isFiltered ? 'Filtered' : 'All';
    
    const worksheetData = data.map(entry => ({
      'Student Name': `${entry.user.firstName} ${entry.user.lastName}`,
      'Registration No.': entry.user.studentId,
      'Department': entry.user.department,
      'Section': entry.user.section || '-',
      'Gender': entry.user.gender || '-',
      'Role': entry.user.role || '-',
      'Entry Time': viewMode === 'current' 
        ? new Date((entry as ActiveEntry).timestamp).toLocaleString()
        : new Date((entry as HistoricalEntry).entryTime).toLocaleString(),
      'Exit Time': viewMode === 'previous' 
        ? new Date((entry as HistoricalEntry).exitTime).toLocaleString()
        : '-',
      'Time Spent': viewMode === 'current' 
        ? formatTimeSpent((entry as ActiveEntry).timeSpent)
        : (entry as HistoricalEntry).timeSpent,
      'Location': entry.location.replace('_', ' ')
    }));

    const worksheet = XLSX.utils.json_to_sheet(worksheetData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Library Analytics');
    
    // Auto-size columns
    const colWidths = Object.keys(worksheetData[0] || {}).map(key => ({ wch: Math.max(key.length, 15) }));
    worksheet['!cols'] = colWidths;
    
    XLSX.writeFile(workbook, `${prefix}_${suffix}_${timestamp}.xlsx`);
  };

  const sortedFilteredEntries = useMemo(() => {
    const entries = viewMode === 'current' ? activeEntries : historicalEntries;
    const now = Date.now();
    const withinTime = (e: Entry) => {
      if (timeFilter === 'all') return true;
      const ms = timeFilter === '1h' ? 3600000 : timeFilter === '24h' ? 86400000 : 7 * 86400000;
      const t = viewMode === 'current' ? new Date((e as ActiveEntry).timestamp).getTime() : new Date((e as HistoricalEntry).exitTime).getTime();
      return now - t <= ms;
    };
    const filtered = entries
      .filter(withinTime)
      .filter(e => (sectionFilter === 'all' || (e.user.section || '').toLowerCase() === sectionFilter))
      .filter(e => (genderFilter === 'all' || (e.user.gender || '').toLowerCase() === genderFilter))
      .filter(e => (roleFilter === 'all' || (e.user.role || '').toLowerCase() === roleFilter))
      .filter(e => (departmentFilter === 'all' || (e.user.department || '').toLowerCase() === departmentFilter))
      .filter(e => `${e.user.firstName} ${e.user.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()) || e.user.studentId.toLowerCase().includes(searchQuery.toLowerCase()));
    return [...filtered].sort((a, b) => {
      let aVal: any, bVal: any;
      switch (sortConfig.key) {
        case 'studentName':
          aVal = `${a.user.firstName} ${a.user.lastName}`; bVal = `${b.user.firstName} ${b.user.lastName}`;
          break;
        case 'entryTime':
          aVal = new Date(viewMode === 'current' ? (a as ActiveEntry).timestamp : (a as HistoricalEntry).entryTime).getTime();
          bVal = new Date(viewMode === 'current' ? (b as ActiveEntry).timestamp : (b as HistoricalEntry).entryTime).getTime();
          break;
        case 'timeSpent':
          aVal = viewMode === 'current' ? (a as ActiveEntry).timeSpent : parseTimeToMinutes((a as HistoricalEntry).timeSpent);
          bVal = viewMode === 'current' ? (b as ActiveEntry).timeSpent : parseTimeToMinutes((b as HistoricalEntry).timeSpent);
          break;
        default: return 0;
      }
      return (aVal < bVal ? -1 : aVal > bVal ? 1 : 0) * (sortConfig.direction === 'asc' ? 1 : -1);
    });
  }, [activeEntries, historicalEntries, viewMode, searchQuery, sortConfig, sectionFilter, genderFilter, roleFilter, departmentFilter, timeFilter]);

  // Dynamic filter option lists based on current dataset
  const { sectionOptions, genderOptions, roleOptions, departmentOptions } = useMemo(() => {
    const entries = viewMode === 'current' ? activeEntries : historicalEntries;
    const sections = new Set<string>();
    const genders = new Set<string>();
    const roles = new Set<string>();
    const departments = new Set<string>();
    entries.forEach((e) => {
      const s = (e.user.section || '').trim(); if (s) sections.add(s);
      const g = (e.user.gender || '').trim().toLowerCase(); if (g) genders.add(g);
      const r = (e.user.role || '').trim().toLowerCase(); if (r) roles.add(r);
      const d = (e.user.department || '').trim().toLowerCase(); if (d) departments.add(d);
    });
    return {
      sectionOptions: Array.from(sections).sort((a,b) => a.localeCompare(b)),
      genderOptions: Array.from(genders).sort((a,b) => a.localeCompare(b)),
      roleOptions: Array.from(roles).sort((a,b) => a.localeCompare(b)),
      departmentOptions: Array.from(departments).sort((a,b) => a.localeCompare(b))
    };
  }, [activeEntries, historicalEntries, viewMode]);

  const stats = useMemo(() => ({
    total: activeEntries.length,
    avg: activeEntries.length ? activeEntries.reduce((sum, e) => sum + e.timeSpent, 0) / activeEntries.length : 0,
    long: activeEntries.filter(e => e.timeSpent > 180).length
  }), [activeEntries]);

  return (
    <ThemeProvider theme={premiumTheme}>
      <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', width: '100vw', maxWidth: '100%', mx: 'auto' }}>
        <AppBar position="static" elevation={0} sx={{ bgcolor: 'background.paper', borderBottom: `1px solid ${theme.palette.divider}`, width: '100%', maxWidth: '100%' }}>
          <Toolbar sx={{ px: { xs: 2, md: 4 }, width: '100%', maxWidth: '1200px', mx: 'auto' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexGrow: 1 }}>
              <Avatar src={LOGO_URL} alt="KARE Logo" variant="rounded" sx={{ width: 48, height: 48 }} imgProps={{ referrerPolicy: 'no-referrer' }} />
              <Typography variant="h5" sx={{ fontWeight: 700, color: 'primary.main' }}>
                LMS – KARE
              </Typography>
            </Box>
            <IconButton
              color="primary"
              onClick={onReturn}
              sx={{
                p: 1.5,
                bgcolor: '#e0e7ff',
                borderRadius: '50%',
                '&:hover': { bgcolor: '#bfdbfe', transform: 'scale(1.1)' },
                transition: 'all 0.3s ease',
                mr: 1
              }}
              aria-label="Return to dashboard"
            >
              <ArrowBackIcon sx={{ fontSize: 24 }} />
            </IconButton>
          </Toolbar>
        </AppBar>
        <Box sx={{ p: { xs: 2, md: 4 }, maxWidth: '1200px', mx: 'auto', width: '100%' }}>
          <Typography variant="h4" sx={{ color: 'primary.main', mb: 1 }}>Analytics & Reports</Typography>
          <Typography variant="subtitle1" sx={{ color: 'text.secondary', mb: 4 }}>Real-time library status and student activity monitoring</Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' }, gap: 3, mb: 6 }}>
            <Card><CardContent sx={{ textAlign: 'center' }}><PeopleIcon sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} /><Typography variant="h3" sx={{ color: 'primary.main', mb: 1 }}>{stats.total}</Typography><Typography variant="body1" sx={{ color: 'text.secondary' }}>Students Inside</Typography></CardContent></Card>
            <Card><CardContent sx={{ textAlign: 'center' }}><AccessTimeIcon sx={{ fontSize: 48, color: 'secondary.main', mb: 2 }} /><Typography variant="h3" sx={{ color: 'primary.main', mb: 1 }}>{formatTimeSpent(stats.avg)}</Typography><Typography variant="body1" sx={{ color: 'text.secondary' }}>Average Time Spent</Typography></CardContent></Card>
            <Card><CardContent sx={{ textAlign: 'center' }}><TrendingUpIcon sx={{ fontSize: 48, color: '#f59f00', mb: 2 }} /><Typography variant="h3" sx={{ color: 'primary.main', mb: 1 }}>{stats.long}</Typography><Typography variant="body1" sx={{ color: 'text.secondary' }}>Long Sessions (3+ hrs)</Typography></CardContent></Card>
          </Box>
          <Paper elevation={3} sx={{ borderRadius: 4, overflow: 'hidden', width: '100%' }}>
            <Box sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" sx={{ color: 'primary.main' }}>{viewMode === 'current' ? 'Students Currently Inside Library' : 'Previous Students (Recent Exits)'}</Typography>
                <ToggleButtonGroup value={viewMode} exclusive onChange={(_, v) => { if (v) { setViewMode(v); setLoading(true); setSearchQuery(''); } }} aria-label="View mode">
                  <ToggleButton value="current">Current Students</ToggleButton>
                  <ToggleButton value="previous">Previous Students</ToggleButton>
                </ToggleButtonGroup>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2, mb: 2 }}>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>Last updated: {lastUpdated.toLocaleTimeString()}</Typography>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ alignItems: 'center' }}>
                  <Button
                    variant="outlined"
                    startIcon={<FilterListIcon />}
                    onClick={() => setShowFilters(!showFilters)}
                    sx={{ minWidth: 120 }}
                  >
                    {showFilters ? 'Hide Filters' : 'Show Filters'}
                  </Button>
                  <Button
                    variant="contained"
                    startIcon={<FileDownloadIcon />}
                    onClick={handleExport}
                    sx={{ minWidth: 140, bgcolor: 'secondary.main', '&:hover': { bgcolor: 'secondary.dark' } }}
                  >
                    Export Data
                  </Button>
                </Stack>
              </Box>
              <Collapse in={showFilters}>
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap', gap: 2, mb: 2, p: 2, bgcolor: 'grey.50', borderRadius: 2 }}>
                  <FormControl size="small" sx={{ minWidth: 120 }}>
                    <InputLabel>Section</InputLabel>
                    <Select label="Section" value={sectionFilter} onChange={(e) => setSectionFilter((e.target.value as string).toLowerCase())}>
                      <MenuItem value="all">All</MenuItem>
                      {sectionOptions.map((opt) => (
                        <MenuItem key={opt} value={opt.toLowerCase()}>{opt}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  <FormControl size="small" sx={{ minWidth: 120 }}>
                    <InputLabel>Gender</InputLabel>
                    <Select label="Gender" value={genderFilter} onChange={(e) => setGenderFilter((e.target.value as string).toLowerCase())}>
                      <MenuItem value="all">All</MenuItem>
                      {genderOptions.map((opt) => (
                        <MenuItem key={opt} value={opt}>{opt.charAt(0).toUpperCase() + opt.slice(1)}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  <FormControl size="small" sx={{ minWidth: 140 }}>
                    <InputLabel>Role</InputLabel>
                    <Select label="Role" value={roleFilter} onChange={(e) => setRoleFilter((e.target.value as string).toLowerCase())}>
                      <MenuItem value="all">All</MenuItem>
                      {roleOptions.map((opt) => (
                        <MenuItem key={opt} value={opt}>{opt.charAt(0).toUpperCase() + opt.slice(1)}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  <FormControl size="small" sx={{ minWidth: 140 }}>
                    <InputLabel>Department</InputLabel>
                    <Select label="Department" value={departmentFilter} onChange={(e) => setDepartmentFilter((e.target.value as string).toLowerCase())}>
                      <MenuItem value="all">All</MenuItem>
                      {departmentOptions.map((opt) => (
                        <MenuItem key={opt} value={opt}>{opt.charAt(0).toUpperCase() + opt.slice(1)}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  <FormControl size="small" sx={{ minWidth: 140 }}>
                    <InputLabel>Time</InputLabel>
                    <Select label="Time" value={timeFilter} onChange={(e) => setTimeFilter(e.target.value as any)}>
                      <MenuItem value="all">All Time</MenuItem>
                      <MenuItem value="1h">Last 1h</MenuItem>
                      <MenuItem value="24h">Last 24h</MenuItem>
                      <MenuItem value="7d">Last 7d</MenuItem>
                    </Select>
                  </FormControl>
                  <TextField size="small" placeholder="Search by name or ID" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} InputProps={{ startAdornment: <SearchIcon sx={{ color: 'action.active', mr: 1 }} /> }} sx={{ width: { xs: '100%', sm: 240 } }} />
                </Box>
              </Collapse>
            </Box>
            <Divider />
            {loading ? <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress aria-label="Loading data" /></Box> : error ? <Box sx={{ p: 3 }}><Alert severity="error">{error}</Alert><Button variant="contained" onClick={() => viewMode === 'current' ? fetchActive() : fetchHistorical()} sx={{ mt: 2 }}>Retry</Button></Box> : !sortedFilteredEntries.length ? <Box sx={{ textAlign: 'center', py: 6 }}><PeopleIcon sx={{ fontSize: 64, color: 'action.disabled', mb: 2 }} /><Typography variant="h6" sx={{ color: 'text.secondary' }}>No Data Available</Typography></Box> : (
              <TableContainer>
                <Table aria-label="Library Analytics Table">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700 }}><TableSortLabel active={sortConfig.key === 'studentName'} direction={sortConfig.key === 'studentName' ? sortConfig.direction : 'asc'} onClick={() => requestSort('studentName')}>Student</TableSortLabel></TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Registration No.</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Department</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Section</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Gender</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Role</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}><TableSortLabel active={sortConfig.key === 'entryTime'} direction={sortConfig.key === 'entryTime' ? sortConfig.direction : 'asc'} onClick={() => requestSort('entryTime')}>Entry Date & Time</TableSortLabel></TableCell>
                      {viewMode === 'previous' && <TableCell sx={{ fontWeight: 700 }}>Exit Date & Time</TableCell>}
                      <TableCell sx={{ fontWeight: 700 }}><TableSortLabel active={sortConfig.key === 'timeSpent'} direction={sortConfig.key === 'timeSpent' ? sortConfig.direction : 'asc'} onClick={() => requestSort('timeSpent')}>Time Spent</TableSortLabel></TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Location</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {sortedFilteredEntries.map(e => (
                      <TableRow key={e.id}>
                        <TableCell sx={{ fontWeight: 600 }}>{e.user.firstName} {e.user.lastName}</TableCell>
                        <TableCell sx={{ fontFamily: 'monospace' }}>{e.user.studentId}</TableCell>
                        <TableCell>{e.user.department}</TableCell>
                        <TableCell>{e.user.section || '-'}</TableCell>
                        <TableCell sx={{ textTransform: 'capitalize' }}>{e.user.gender || '-'}</TableCell>
                        <TableCell sx={{ textTransform: 'capitalize' }}>{e.user.role || '-'}</TableCell>
                        <TableCell>{viewMode === 'current' ? new Date((e as ActiveEntry).timestamp).toLocaleString() : new Date((e as HistoricalEntry).entryTime).toLocaleString()}</TableCell>
                        {viewMode === 'previous' && <TableCell>{new Date((e as HistoricalEntry).exitTime).toLocaleString()}</TableCell>}
                        <TableCell>
                          <Chip label={viewMode === 'current' ? formatTimeSpent((e as ActiveEntry).timeSpent) : (e as HistoricalEntry).timeSpent} size="small" sx={{ bgcolor: viewMode === 'current' ? getTimeSpentColor((e as ActiveEntry).timeSpent) : getTimeSpentColor(parseTimeToMinutes((e as HistoricalEntry).timeSpent)), color: 'white', fontWeight: 600 }} />
                        </TableCell>
                        <TableCell sx={{ textTransform: 'capitalize' }}>{e.location.replace('_', ' ')}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Paper>
        </Box>
      </Box>
    </ThemeProvider>
  );
});

export default Analytics;