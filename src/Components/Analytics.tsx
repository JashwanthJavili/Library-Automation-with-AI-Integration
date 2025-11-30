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

type GateLog = {
  sl: number;
  cardnumber: string;
  name: string;
  gender: 'M' | 'F';
  entry_date: string;
  entry_time: string;
  exit_time: string | null;
  status: 'IN' | 'OUT';
  loc: string;
  cc: string;
  branch: string;
  sort1: string | null;
  sort2: string | null;
  email: string | null;
  mob: string | null;
  userid: string | null;
  entry_timestamp: string | null;
  exit_timestamp: string | null;
};

interface AnalyticsProps {
  onReturn: () => void;
}


const Analytics: React.FC<AnalyticsProps> = React.memo(({ onReturn }) => {
  const theme = useTheme();
  const [logs, setLogs] = useState<GateLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [searchQuery, setSearchQuery] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({ key: 'entry_timestamp', direction: 'desc' });
  const [genderFilter, setGenderFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [branchFilter, setBranchFilter] = useState<string>('all');
  const [showFilters, setShowFilters] = useState<boolean>(false);
  const [dateFilter, setDateFilter] = useState<string>('');
  const [presentOnly, setPresentOnly] = useState<boolean>(false);

  const fetchLogs = useCallback(async () => {
    try {
      setError(null);
      const res = await apiService.getGateLogs({ limit: 500, date: dateFilter || undefined });
      if (res.success) {
        setLogs(res.data?.logs || []);
        setLastUpdated(new Date());
      } else setError(res.message || 'Failed to fetch gate logs');
    } catch (err: any) {
      setError(err.message || 'Failed to fetch gate logs');
    } finally {
      setLoading(false);
    }
  }, [dateFilter]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  useEffect(() => {
    const id = setInterval(fetchLogs, 30000);
    return () => clearInterval(id);
  }, [fetchLogs]);

  const formatTimeSpent = (mins: number): string => {
    if (mins < 1) return `${Math.round(mins * 60)}s`;
    const h = Math.floor(mins / 60), m = Math.floor(mins % 60), s = Math.round((mins % 1) * 60);
    return h > 0 ? (s > 0 ? `${h}h ${m}m ${s}s` : `${h}h ${m}m`) : (s > 0 ? `${m}m ${s}s` : `${m}m`);
  };

  // removed unused getTimeSpentColor helper to avoid lint warnings

  const requestSort = (key: string) => {
    const direction = sortConfig.key === key && sortConfig.direction === 'asc' ? 'desc' : 'asc';
    setSortConfig({ key, direction });
  };

  // Export function
  const handleExport = () => {
    const data = sortedFilteredLogs;
    const timestamp = new Date().toISOString().split('T')[0];
    const prefix = 'Gate_Logs';
    const isFiltered = genderFilter !== 'all' || statusFilter !== 'all' || branchFilter !== 'all' || dateFilter !== '' || searchQuery !== '';
    const suffix = isFiltered ? 'Filtered' : 'All';
    
    const worksheetData = data.map(r => ({
      sl: r.sl,
      cardnumber: r.cardnumber,
      name: r.name,
      gender: r.gender,
      entry_date: r.entry_date,
      entry_time: r.entry_time,
      exit_time: r.exit_time || '-',
      status: r.status,
      loc: r.loc,
      cc: r.cc,
      branch: r.branch,
      sort1: r.sort1 || '-',
      sort2: r.sort2 || '-',
      email: r.email || '-',
      mob: r.mob || '-',
      userid: r.userid || '-',
      entry_timestamp: r.entry_timestamp || '-',
      exit_timestamp: r.exit_timestamp || '-',
      time_spent: (() => {
        try {
          const entryTs = r.entry_timestamp ? new Date(r.entry_timestamp) : null;
          const exitTs = r.exit_timestamp ? new Date(r.exit_timestamp) : null;
          const now = new Date();
          let mins = 0;
          if (entryTs && exitTs) mins = (exitTs.getTime() - entryTs.getTime()) / (1000 * 60);
          else if (entryTs) mins = (now.getTime() - entryTs.getTime()) / (1000 * 60);
          return formatTimeSpent(Math.max(0, mins));
        } catch (e) { return '-'; }
      })()
    }));

    const worksheet = XLSX.utils.json_to_sheet(worksheetData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Library Analytics');
    
    // Auto-size columns
    const colWidths = Object.keys(worksheetData[0] || {}).map(key => ({ wch: Math.max(key.length, 15) }));
    worksheet['!cols'] = colWidths;
    
    XLSX.writeFile(workbook, `${prefix}_${suffix}_${timestamp}.xlsx`);
  };

  const sortedFilteredLogs = useMemo(() => {
    const filtered = logs
      .filter(r => (genderFilter === 'all' || (r.gender || '').toLowerCase() === genderFilter))
      .filter(r => (statusFilter === 'all' || (r.status || '').toLowerCase() === statusFilter))
      .filter(r => (branchFilter === 'all' || (r.branch || '').toLowerCase() === branchFilter))
      .filter(r => (!presentOnly || (r.status === 'IN')))
      .filter(r => (r.name || '').toLowerCase().includes(searchQuery.toLowerCase()) || (r.cardnumber || '').toLowerCase().includes(searchQuery.toLowerCase()) || (r.userid || '').toLowerCase().includes(searchQuery.toLowerCase()));
    return [...filtered].sort((a, b) => {
      let aVal: any = a[sortConfig.key as keyof GateLog];
      let bVal: any = b[sortConfig.key as keyof GateLog];
      return (aVal < bVal ? -1 : aVal > bVal ? 1 : 0) * (sortConfig.direction === 'asc' ? 1 : -1);
    });
  }, [logs, searchQuery, sortConfig, genderFilter, statusFilter, branchFilter]);

  // Dynamic filter option lists based on current dataset
  const { genderOptions, statusOptions, branchOptions } = useMemo(() => {
    const genders = new Set<string>();
    const statuses = new Set<string>();
    const branches = new Set<string>();
    logs.forEach((r) => {
      const g = (r.gender || '').trim().toLowerCase(); if (g) genders.add(g);
      const s = (r.status || '').trim().toLowerCase(); if (s) statuses.add(s);
      const b = (r.branch || '').trim().toLowerCase(); if (b) branches.add(b);
    });
    return {
      genderOptions: Array.from(genders).sort((a,b) => a.localeCompare(b)),
      statusOptions: Array.from(statuses).sort((a,b) => a.localeCompare(b)),
      branchOptions: Array.from(branches).sort((a,b) => a.localeCompare(b))
    };
  }, [logs]);

  const stats = useMemo(() => ({
    total: logs.filter(l => l.status === 'IN').length,
    avg: 0,
    long: logs.filter(l => l.status === 'IN').length
  }), [logs]);

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
                <Typography variant="h6" sx={{ color: 'primary.main' }}>Gate Logs</Typography>
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
                      variant={presentOnly ? 'contained' : 'outlined'}
                      color="primary"
                      onClick={() => setPresentOnly(p => !p)}
                      sx={{ minWidth: 140 }}
                    >
                      {presentOnly ? 'Showing Present' : 'Show Present'}
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
                    <InputLabel>Gender</InputLabel>
                    <Select label="Gender" value={genderFilter} onChange={(e) => setGenderFilter((e.target.value as string).toLowerCase())}>
                      <MenuItem value="all">All</MenuItem>
                      {genderOptions.map((opt) => (
                        <MenuItem key={opt} value={opt}>{opt.charAt(0).toUpperCase() + opt.slice(1)}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  <FormControl size="small" sx={{ minWidth: 140 }}>
                    <InputLabel>Status</InputLabel>
                    <Select label="Status" value={statusFilter} onChange={(e) => setStatusFilter((e.target.value as string).toLowerCase())}>
                      <MenuItem value="all">All</MenuItem>
                      {statusOptions.map((opt) => (
                        <MenuItem key={opt} value={opt}>{opt.toUpperCase()}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  <FormControl size="small" sx={{ minWidth: 140 }}>
                    <InputLabel>Branch</InputLabel>
                    <Select label="Branch" value={branchFilter} onChange={(e) => setBranchFilter((e.target.value as string).toLowerCase())}>
                      <MenuItem value="all">All</MenuItem>
                      {branchOptions.map((opt) => (
                        <MenuItem key={opt} value={opt}>{opt.toUpperCase()}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  <TextField size="small" type="date" label="Date" InputLabelProps={{ shrink: true }} value={dateFilter} onChange={e => setDateFilter(e.target.value)} />
                  <TextField size="small" placeholder="Search by name or ID" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} InputProps={{ startAdornment: <SearchIcon sx={{ color: 'action.active', mr: 1 }} /> }} sx={{ width: { xs: '100%', sm: 240 } }} />
                </Box>
              </Collapse>
            </Box>
            <Divider />
            {loading ? <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress aria-label="Loading data" /></Box> : error ? <Box sx={{ p: 3 }}><Alert severity="error">{error}</Alert><Button variant="contained" onClick={() => fetchLogs()} sx={{ mt: 2 }}>Retry</Button></Box> : !sortedFilteredLogs.length ? <Box sx={{ textAlign: 'center', py: 6 }}><PeopleIcon sx={{ fontSize: 64, color: 'action.disabled', mb: 2 }} /><Typography variant="h6" sx={{ color: 'text.secondary' }}>No Data Available</Typography></Box> : (
              <TableContainer>
                <Table aria-label="Library Analytics Table">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700 }}><TableSortLabel active={sortConfig.key === 'sl'} direction={sortConfig.key === 'sl' ? sortConfig.direction : 'asc'} onClick={() => requestSort('sl')}>SL</TableSortLabel></TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Card Number</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Name</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Gender</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Entry Date</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Entry Time</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Exit Time</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Loc</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>CC</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Branch</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Sort1</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Sort2</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Email</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Mob</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>UserID</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}><TableSortLabel active={sortConfig.key === 'entry_timestamp'} direction={sortConfig.key === 'entry_timestamp' ? sortConfig.direction : 'asc'} onClick={() => requestSort('entry_timestamp')}>Entry TS</TableSortLabel></TableCell>
                      <TableCell sx={{ fontWeight: 700 }}><TableSortLabel active={sortConfig.key === 'exit_timestamp'} direction={sortConfig.key === 'exit_timestamp' ? sortConfig.direction : 'asc'} onClick={() => requestSort('exit_timestamp')}>Exit TS</TableSortLabel></TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Time Spent</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {sortedFilteredLogs.map(r => (
                      <TableRow key={r.sl}>
                        <TableCell sx={{ fontFamily: 'monospace' }}>{r.sl}</TableCell>
                        <TableCell sx={{ fontFamily: 'monospace' }}>{r.cardnumber}</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>{r.name}</TableCell>
                        <TableCell>{r.gender}</TableCell>
                        <TableCell>{r.entry_date}</TableCell>
                        <TableCell>{r.entry_time}</TableCell>
                        <TableCell>{r.exit_time || '-'}</TableCell>
                        <TableCell><Chip label={r.status} size="small" color={r.status === 'IN' ? 'secondary' : 'default'} sx={{ color: 'white', fontWeight: 600 }} /></TableCell>
                        <TableCell>{r.loc}</TableCell>
                        <TableCell>{r.cc}</TableCell>
                        <TableCell>{r.branch}</TableCell>
                        <TableCell>{r.sort1 || '-'}</TableCell>
                        <TableCell>{r.sort2 || '-'}</TableCell>
                        <TableCell>{r.email || '-'}</TableCell>
                        <TableCell>{r.mob || '-'}</TableCell>
                        <TableCell>{r.userid || '-'}</TableCell>
                        {/* Show raw DB timestamps without converting to local time to avoid altering stored values */}
                        <TableCell>{r.entry_timestamp || '-'}</TableCell>
                        <TableCell>{r.exit_timestamp || '-'}</TableCell>
                        <TableCell>{(() => {
                          try {
                            const entryTs = r.entry_timestamp ? new Date(r.entry_timestamp) : null;
                            const exitTs = r.exit_timestamp ? new Date(r.exit_timestamp) : null;
                            const now = new Date();
                            let mins = 0;
                            if (entryTs && exitTs) mins = (exitTs.getTime() - entryTs.getTime()) / (1000 * 60);
                            else if (entryTs) mins = (now.getTime() - entryTs.getTime()) / (1000 * 60);
                            return formatTimeSpent(Math.max(0, mins));
                          } catch (e) { return '-'; }
                        })()}</TableCell>
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