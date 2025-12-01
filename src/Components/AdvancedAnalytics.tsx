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
  createTheme,
  ThemeProvider,
  TableSortLabel,
  IconButton,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Stack,
  Collapse,
  Checkbox,
  FormControlLabel,
  FormGroup,
  Popover,
  Tooltip,
  TablePagination,
  Tabs,
  Tab,
  ToggleButtonGroup,
  ToggleButton,
} from '@mui/material';
import { DatePicker, LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs, { Dayjs } from 'dayjs';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import PeopleIcon from '@mui/icons-material/People';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import SearchIcon from '@mui/icons-material/Search';
import FilterListIcon from '@mui/icons-material/FilterList';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import ViewColumnIcon from '@mui/icons-material/ViewColumn';
import PrintIcon from '@mui/icons-material/Print';
import RefreshIcon from '@mui/icons-material/Refresh';
import AssessmentIcon from '@mui/icons-material/Assessment';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import TimelineIcon from '@mui/icons-material/Timeline';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart,
} from 'recharts';
import { apiService } from '../services/api';
import { parseStudentId, getBatchYears, getDepartments } from '../utils/studentParser';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const LOGO_URL = '/src/assets/Kare_Logo.png';

const advancedTheme = createTheme({
  palette: {
    primary: { main: '#1e40af', light: '#3b82f6', dark: '#1e3a8a' },
    secondary: { main: '#10b981', light: '#34d399', dark: '#059669' },
    error: { main: '#ef4444' },
    warning: { main: '#f59e0b' },
    info: { main: '#3b82f6' },
    success: { main: '#10b981' },
    background: { default: '#f8fafc', paper: '#ffffff' },
    text: { primary: '#0f172a', secondary: '#475569' },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h4: { fontWeight: 800, letterSpacing: -0.5 },
    h5: { fontWeight: 700, letterSpacing: -0.25 },
    h6: { fontWeight: 600 },
    subtitle1: { fontWeight: 500 },
    body1: { fontSize: '0.95rem' },
    body2: { fontWeight: 500, fontSize: '0.875rem' },
  },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
          border: '1px solid rgba(0,0,0,0.05)',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          textTransform: 'none',
          fontWeight: 600,
          padding: '8px 20px',
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        head: { fontWeight: 700, backgroundColor: '#f1f5f9', color: '#0f172a' },
        body: { fontSize: '0.875rem' },
      },
    },
  },
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

interface AdvancedAnalyticsProps {
  onReturn: () => void;
}

type ColumnKey = keyof GateLog | 'batch' | 'department' | 'timeSpent';

const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

const AdvancedAnalytics: React.FC<AdvancedAnalyticsProps> = ({ onReturn }) => {

  // Data state
  const [logs, setLogs] = useState<GateLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  // Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [genderFilter, setGenderFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [branchFilter, setBranchFilter] = useState<string>('all');
  const [batchYearFilter, setBatchYearFilter] = useState<string>('all');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [dateRangeStart, setDateRangeStart] = useState<Dayjs | null>(null);
  const [dateRangeEnd, setDateRangeEnd] = useState<Dayjs | null>(null);
  const [presentOnly, setPresentOnly] = useState<boolean>(false);

  // UI state
  const [showFilters, setShowFilters] = useState<boolean>(true);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({
    key: 'entry_timestamp',
    direction: 'desc',
  });
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [columnAnchor, setColumnAnchor] = useState<null | HTMLElement>(null);
  const [activeTab, setActiveTab] = useState(0); // 0=Table, 1=Charts, 2=Reports
  const [reportType, setReportType] = useState<'daily' | 'weekly' | 'monthly'>('daily');

  // Column visibility state
  const [visibleColumns, setVisibleColumns] = useState<Set<ColumnKey>>(
    new Set([
      'sl',
      'cardnumber',
      'name',
      'gender',
      'batch',
      'department',
      'entry_date',
      'entry_time',
      'exit_time',
      'status',
      'timeSpent',
    ])
  );

  const allColumns: { key: ColumnKey; label: string }[] = [
    { key: 'sl', label: 'SL' },
    { key: 'cardnumber', label: 'Card Number' },
    { key: 'name', label: 'Name' },
    { key: 'gender', label: 'Gender' },
    { key: 'batch', label: 'Batch' },
    { key: 'department', label: 'Department' },
    { key: 'entry_date', label: 'Entry Date' },
    { key: 'entry_time', label: 'Entry Time' },
    { key: 'exit_time', label: 'Exit Time' },
    { key: 'status', label: 'Status' },
    { key: 'loc', label: 'Location' },
    { key: 'cc', label: 'Category' },
    { key: 'branch', label: 'Branch' },
    { key: 'email', label: 'Email' },
    { key: 'mob', label: 'Mobile' },
    { key: 'userid', label: 'User ID' },
    { key: 'entry_timestamp', label: 'Entry Timestamp' },
    { key: 'exit_timestamp', label: 'Exit Timestamp' },
    { key: 'timeSpent', label: 'Time Spent' },
  ];

  // Fetch logs
  const fetchLogs = useCallback(async () => {
    try {
      setError(null);
      const res = await apiService.getGateLogs({ limit: 5000 });
      if (res.success) {
        setLogs(res.data?.logs || []);
        setLastUpdated(new Date());
      } else {
        setError(res.message || 'Failed to fetch gate logs');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch gate logs');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  useEffect(() => {
    const interval = setInterval(fetchLogs, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, [fetchLogs]);

  // Compute time spent
  const computeTimeSpent = (entry_timestamp: string | null, exit_timestamp: string | null): number => {
    try {
      const entryTs = entry_timestamp ? new Date(entry_timestamp) : null;
      const exitTs = exit_timestamp ? new Date(exit_timestamp) : null;
      const now = new Date();
      let mins = 0;
      if (entryTs && exitTs) mins = (exitTs.getTime() - entryTs.getTime()) / (1000 * 60);
      else if (entryTs) mins = (now.getTime() - entryTs.getTime()) / (1000 * 60);
      return Math.max(0, mins);
    } catch {
      return 0;
    }
  };

  const formatTimeSpent = (minutes: number): string => {
    if (minutes < 1) return `${Math.round(minutes * 60)}s`;
    const h = Math.floor(minutes / 60);
    const m = Math.floor(minutes % 60);
    const s = Math.round((minutes % 1) * 60);
    if (h > 0) return s > 0 ? `${h}h ${m}m ${s}s` : `${h}h ${m}m`;
    return s > 0 ? `${m}m ${s}s` : `${m}m`;
  };

  // Augment logs with computed fields
  const augmentedLogs = useMemo(
    () =>
      logs.map((log) => {
        const studentInfo = parseStudentId(log.userid);
        return {
          ...log,
          batch: studentInfo.batch,
          department: studentInfo.department || 'N/A',
          timeSpent: computeTimeSpent(log.entry_timestamp, log.exit_timestamp),
        };
      }),
    [logs]
  );

  // Extract filter options
  const filterOptions = useMemo(() => {
    const genders = new Set<string>();
    const statuses = new Set<string>();
    const branches = new Set<string>();
    augmentedLogs.forEach((r) => {
      if (r.gender) genders.add(r.gender.toLowerCase());
      if (r.status) statuses.add(r.status.toLowerCase());
      if (r.branch) branches.add(r.branch.toLowerCase());
    });
    const batchYears = getBatchYears(augmentedLogs.map((l) => l.userid));
    const departments = getDepartments(augmentedLogs.map((l) => l.userid));
    return {
      genders: Array.from(genders).sort(),
      statuses: Array.from(statuses).sort(),
      branches: Array.from(branches).sort(),
      batchYears,
      departments,
    };
  }, [augmentedLogs]);

  // Apply filters and search
  const filteredLogs = useMemo(() => {
    return augmentedLogs.filter((r) => {
      // Gender
      if (genderFilter !== 'all' && (r.gender || '').toLowerCase() !== genderFilter) return false;
      // Status
      if (statusFilter !== 'all' && (r.status || '').toLowerCase() !== statusFilter) return false;
      // Branch
      if (branchFilter !== 'all' && (r.branch || '').toLowerCase() !== branchFilter) return false;
      // Present only
      if (presentOnly && r.status !== 'IN') return false;
      // Batch year
      if (batchYearFilter !== 'all') {
        const info = parseStudentId(r.userid);
        if (!info.year || info.year !== parseInt(batchYearFilter, 10)) return false;
      }
      // Department
      if (departmentFilter !== 'all') {
        const info = parseStudentId(r.userid);
        if (info.department !== departmentFilter) return false;
      }
      // Date range
      if (dateRangeStart && r.entry_date) {
        const entryDate = dayjs(r.entry_date);
        if (entryDate.isBefore(dateRangeStart, 'day')) return false;
      }
      if (dateRangeEnd && r.entry_date) {
        const entryDate = dayjs(r.entry_date);
        if (entryDate.isAfter(dateRangeEnd, 'day')) return false;
      }
      // Search
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (
          (r.name || '').toLowerCase().includes(q) ||
          (r.cardnumber || '').toLowerCase().includes(q) ||
          (r.userid || '').toLowerCase().includes(q) ||
          (r.batch || '').toLowerCase().includes(q) ||
          (r.department || '').toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [
    augmentedLogs,
    genderFilter,
    statusFilter,
    branchFilter,
    presentOnly,
    batchYearFilter,
    departmentFilter,
    dateRangeStart,
    dateRangeEnd,
    searchQuery,
  ]);

  // Sorting
  const sortedLogs = useMemo(() => {
    return [...filteredLogs].sort((a: any, b: any) => {
      const aVal = a[sortConfig.key];
      const bVal = b[sortConfig.key];
      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortConfig.direction === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      return sortConfig.direction === 'asc' ? (aVal < bVal ? -1 : 1) : aVal > bVal ? -1 : 1;
    });
  }, [filteredLogs, sortConfig]);

  // Pagination
  const paginatedLogs = useMemo(
    () => sortedLogs.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage),
    [sortedLogs, page, rowsPerPage]
  );

  // Stats
  const stats = useMemo(() => {
    const totalVisits = filteredLogs.length;
    const currentlyInside = filteredLogs.filter((l) => l.status === 'IN').length;
    const avgTimeSpent =
      filteredLogs.reduce((sum, l) => sum + l.timeSpent, 0) / (filteredLogs.length || 1);
    const longSessions = filteredLogs.filter((l) => l.timeSpent >= 180).length; // >3hrs

    // Gender breakdown
    const maleCount = filteredLogs.filter((l) => l.gender?.toUpperCase() === 'M').length;
    const femaleCount = filteredLogs.filter((l) => l.gender?.toUpperCase() === 'F').length;

    // Department breakdown
    const deptMap: Record<string, number> = {};
    filteredLogs.forEach((l) => {
      const dept = l.department || 'N/A';
      deptMap[dept] = (deptMap[dept] || 0) + 1;
    });

    // Batch breakdown
    const batchMap: Record<string, number> = {};
    filteredLogs.forEach((l) => {
      batchMap[l.batch] = (batchMap[l.batch] || 0) + 1;
    });

    // Hourly distribution
    const hourMap: Record<number, number> = {};
    filteredLogs.forEach((l) => {
      if (l.entry_time) {
        const hour = parseInt(l.entry_time.split(':')[0], 10);
        hourMap[hour] = (hourMap[hour] || 0) + 1;
      }
    });

    // Daily distribution
    const dailyMap: Record<string, number> = {};
    filteredLogs.forEach((l) => {
      if (l.entry_date) {
        const date = dayjs(l.entry_date).format('MMM DD');
        dailyMap[date] = (dailyMap[date] || 0) + 1;
      }
    });

    return {
      totalVisits,
      currentlyInside,
      avgTimeSpent,
      longSessions,
      maleCount,
      femaleCount,
      deptMap,
      batchMap,
      hourMap,
      dailyMap,
    };
  }, [filteredLogs]);

  // Chart data
  const hourlyChartData = useMemo(
    () =>
      Array.from({ length: 24 }, (_, i) => ({
        hour: `${i.toString().padStart(2, '0')}:00`,
        count: stats.hourMap[i] || 0,
      })),
    [stats.hourMap]
  );

  const departmentChartData = useMemo(
    () =>
      Object.entries(stats.deptMap).map(([dept, count]) => ({
        name: dept,
        value: count,
      })),
    [stats.deptMap]
  );

  const genderChartData = useMemo(
    () => [
      { name: 'Male', value: stats.maleCount },
      { name: 'Female', value: stats.femaleCount },
    ],
    [stats.maleCount, stats.femaleCount]
  );

  const dailyChartData = useMemo(
    () =>
      Object.entries(stats.dailyMap)
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => a.date.localeCompare(b.date)),
    [stats.dailyMap]
  );

  // Handlers
  const handleSort = (key: string) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  const toggleColumn = (key: ColumnKey) => {
    setVisibleColumns((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(key)) newSet.delete(key);
      else newSet.add(key);
      return newSet;
    });
  };

  const handleExport = (format: 'xlsx' | 'csv' | 'pdf') => {
    const data = sortedLogs;
    const timestamp = new Date().toISOString().split('T')[0];

    if (format === 'xlsx' || format === 'csv') {
      const worksheetData = data.map((r) => ({
        SL: r.sl,
        CardNumber: r.cardnumber,
        Name: r.name,
        Gender: r.gender,
        Batch: r.batch,
        Department: r.department,
        EntryDate: r.entry_date,
        EntryTime: r.entry_time,
        ExitTime: r.exit_time || '-',
        Status: r.status,
        Location: r.loc,
        Category: r.cc,
        Branch: r.branch,
        Email: r.email || '-',
        Mobile: r.mob || '-',
        UserID: r.userid || '-',
        EntryTimestamp: r.entry_timestamp || '-',
        ExitTimestamp: r.exit_timestamp || '-',
        TimeSpent: formatTimeSpent(r.timeSpent),
      }));

      const worksheet = XLSX.utils.json_to_sheet(worksheetData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Analytics');
      XLSX.writeFile(workbook, `Library_Analytics_${timestamp}.${format === 'xlsx' ? 'xlsx' : 'csv'}`);
    } else if (format === 'pdf') {
      const doc = new jsPDF('landscape');
      doc.setFontSize(18);
      doc.text('Library Analytics Report', 14, 20);
      doc.setFontSize(10);
      doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 28);
      doc.text(`Total Records: ${data.length}`, 14, 34);

      const tableData = data.map((r) => [
        r.sl,
        r.cardnumber,
        r.name,
        r.gender,
        r.batch,
        r.department,
        r.entry_date,
        r.entry_time,
        r.exit_time || '-',
        r.status,
        formatTimeSpent(r.timeSpent),
      ]);

      autoTable(doc, {
        head: [['SL', 'Card', 'Name', 'Gender', 'Batch', 'Dept', 'Date', 'In', 'Out', 'Status', 'Time']],
        body: tableData,
        startY: 40,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [30, 64, 175] },
      });

      doc.save(`Library_Analytics_${timestamp}.pdf`);
    }
  };

  const resetFilters = () => {
    setSearchQuery('');
    setGenderFilter('all');
    setStatusFilter('all');
    setBranchFilter('all');
    setBatchYearFilter('all');
    setDepartmentFilter('all');
    setDateRangeStart(null);
    setDateRangeEnd(null);
    setPresentOnly(false);
  };

  const getCellValue = (row: any, key: ColumnKey): React.ReactNode => {
    if (key === 'batch') return row.batch;
    if (key === 'department') return row.department;
    if (key === 'timeSpent') return formatTimeSpent(row.timeSpent);
    if (key === 'status')
      return (
        <Chip
          label={row.status}
          size="small"
          color={row.status === 'IN' ? 'success' : 'default'}
          sx={{ fontWeight: 700, minWidth: 60 }}
        />
      );
    const value = row[key];
    return value || '-';
  };

  return (
    <ThemeProvider theme={advancedTheme}>
      <LocalizationProvider dateAdapter={AdapterDayjs}>
        <Box sx={{ minHeight: '100vh', minWidth: '100vw', bgcolor: 'background.default', display: 'flex', flexDirection: 'column', m: 0, p: 0 }}>
          {/* Header */}
          <AppBar position="static" elevation={0} sx={{ bgcolor: 'background.paper', borderBottom: '2px solid #e2e8f0' }}>
            <Toolbar sx={{ px: { xs: 2, md: 4 } }}>
              <Avatar
                src={LOGO_URL}
                alt="KARE Logo"
                variant="rounded"
                sx={{ width: 48, height: 48, mr: 2 }}
              />
              <Typography variant="h5" sx={{ flexGrow: 1, fontWeight: 800, color: 'primary.main' }}>
                Advanced Library Analytics
              </Typography>
              <Tooltip title="Refresh Data">
                <IconButton onClick={fetchLogs} color="primary">
                  <RefreshIcon />
                </IconButton>
              </Tooltip>
              <Tooltip title="Return to Dashboard">
                <IconButton onClick={onReturn} color="primary" sx={{ ml: 1 }}>
                  <ArrowBackIcon />
                </IconButton>
              </Tooltip>
            </Toolbar>
          </AppBar>

          <Box sx={{ px: { xs: 2, md: 4 }, pt: 3, flex: 1, overflow: 'auto' }}>
            {/* Quick Stats */}
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3} sx={{ mb: 4, flexWrap: 'wrap' }}>
              <Box sx={{ flex: '1 1 200px', minWidth: { xs: '100%', sm: '45%', md: '22%' } }}>
                <Card>
                  <CardContent sx={{ textAlign: 'center' }}>
                    <PeopleIcon sx={{ fontSize: 48, color: 'primary.main', mb: 1 }} />
                    <Typography variant="h4" sx={{ color: 'primary.main', fontWeight: 800 }}>
                      {stats.currentlyInside}
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'text.secondary', mt: 1 }}>
                      Currently Inside
                    </Typography>
                  </CardContent>
                </Card>
              </Box>
              <Box sx={{ flex: '1 1 200px', minWidth: { xs: '100%', sm: '45%', md: '22%' } }}>
                <Card>
                  <CardContent sx={{ textAlign: 'center' }}>
                    <TrendingUpIcon sx={{ fontSize: 48, color: 'secondary.main', mb: 1 }} />
                    <Typography variant="h4" sx={{ color: 'secondary.main', fontWeight: 800 }}>
                      {stats.totalVisits}
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'text.secondary', mt: 1 }}>
                      Total Visits (Filtered)
                    </Typography>
                  </CardContent>
                </Card>
              </Box>
              <Box sx={{ flex: '1 1 200px', minWidth: { xs: '100%', sm: '45%', md: '22%' } }}>
                <Card>
                  <CardContent sx={{ textAlign: 'center' }}>
                    <AccessTimeIcon sx={{ fontSize: 48, color: 'warning.main', mb: 1 }} />
                    <Typography variant="h4" sx={{ color: 'warning.main', fontWeight: 800 }}>
                      {formatTimeSpent(stats.avgTimeSpent)}
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'text.secondary', mt: 1 }}>
                      Avg Time Spent
                    </Typography>
                  </CardContent>
                </Card>
              </Box>
              <Box sx={{ flex: '1 1 200px', minWidth: { xs: '100%', sm: '45%', md: '22%' } }}>
                <Card>
                  <CardContent sx={{ textAlign: 'center' }}>
                    <TimelineIcon sx={{ fontSize: 48, color: 'error.main', mb: 1 }} />
                    <Typography variant="h4" sx={{ color: 'error.main', fontWeight: 800 }}>
                      {stats.longSessions}
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'text.secondary', mt: 1 }}>
                      Long Sessions (&gt;3h)
                    </Typography>
                  </CardContent>
                </Card>
              </Box>
            </Stack>

            {/* Tabs */}
            <Paper sx={{ mb: 3 }}>
              <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} indicatorColor="primary">
                <Tab label="Data Table" icon={<AssessmentIcon />} iconPosition="start" />
                <Tab label="Charts & Graphs" icon={<TimelineIcon />} iconPosition="start" />
                <Tab label="Reports" icon={<CalendarTodayIcon />} iconPosition="start" />
              </Tabs>
            </Paper>

            {/* Table View */}
            {activeTab === 0 && (
              <Paper elevation={3} sx={{ borderRadius: 3, overflow: 'hidden' }}>
                {/* Toolbar */}
                <Box sx={{ p: 3, borderBottom: '1px solid #e2e8f0' }}>
                  <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap" sx={{ mb: 2 }}>
                    <TextField
                      placeholder="Search by name, card, ID, batch, dept..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      size="small"
                      InputProps={{
                        startAdornment: <SearchIcon sx={{ color: 'action.active', mr: 1 }} />,
                      }}
                      sx={{ minWidth: 300, flexGrow: 1 }}
                    />
                    <Button
                      variant={showFilters ? 'contained' : 'outlined'}
                      startIcon={<FilterListIcon />}
                      onClick={() => setShowFilters(!showFilters)}
                    >
                      Filters
                    </Button>
                    <Button
                      variant="outlined"
                      startIcon={<ViewColumnIcon />}
                      onClick={(e) => setColumnAnchor(e.currentTarget)}
                    >
                      Columns
                    </Button>
                    <Button variant="outlined" startIcon={<PrintIcon />} onClick={() => window.print()}>
                      Print
                    </Button>
                    <Button
                      variant="contained"
                      color="secondary"
                      startIcon={<FileDownloadIcon />}
                      onClick={() => handleExport('xlsx')}
                    >
                      Export XLSX
                    </Button>
                  </Stack>

                  {/* Filters */}
                  <Collapse in={showFilters}>
                    <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 2, mt: 2 }}>
                      <Stack direction="row" spacing={2} flexWrap="wrap">
                        <FormControl size="small" sx={{ minWidth: { xs: '100%', sm: '45%', md: '22%' }, flex: '1 1 200px' }}>
                          <InputLabel>Gender</InputLabel>
                          <Select value={genderFilter} label="Gender" onChange={(e) => setGenderFilter(e.target.value)}>
                            <MenuItem value="all">All</MenuItem>
                            {filterOptions.genders.map((g) => (
                              <MenuItem key={g} value={g}>
                                {g.toUpperCase()}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                        <FormControl size="small" sx={{ minWidth: { xs: '100%', sm: '45%', md: '22%' }, flex: '1 1 200px' }}>
                          <InputLabel>Status</InputLabel>
                          <Select value={statusFilter} label="Status" onChange={(e) => setStatusFilter(e.target.value)}>
                            <MenuItem value="all">All</MenuItem>
                            {filterOptions.statuses.map((s) => (
                              <MenuItem key={s} value={s}>
                                {s.toUpperCase()}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                        <FormControl size="small" sx={{ minWidth: { xs: '100%', sm: '45%', md: '22%' }, flex: '1 1 200px' }}>
                          <InputLabel>Batch Year</InputLabel>
                          <Select value={batchYearFilter} label="Batch Year" onChange={(e) => setBatchYearFilter(e.target.value)}>
                            <MenuItem value="all">All</MenuItem>
                            {filterOptions.batchYears.map((y) => (
                              <MenuItem key={y} value={String(y)}>
                                {y}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                        <FormControl size="small" sx={{ minWidth: { xs: '100%', sm: '45%', md: '22%' }, flex: '1 1 200px' }}>
                          <InputLabel>Department</InputLabel>
                          <Select value={departmentFilter} label="Department" onChange={(e) => setDepartmentFilter(e.target.value)}>
                            <MenuItem value="all">All</MenuItem>
                            {filterOptions.departments.map((d) => (
                              <MenuItem key={d} value={d}>
                                {d}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                        <FormControl size="small" sx={{ minWidth: { xs: '100%', sm: '45%', md: '22%' }, flex: '1 1 200px' }}>
                          <InputLabel>Branch</InputLabel>
                          <Select value={branchFilter} label="Branch" onChange={(e) => setBranchFilter(e.target.value)}>
                            <MenuItem value="all">All</MenuItem>
                            {filterOptions.branches.map((b) => (
                              <MenuItem key={b} value={b}>
                                {b.toUpperCase()}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                        <DatePicker
                          label="Start Date"
                          value={dateRangeStart}
                          onChange={(v) => setDateRangeStart(v)}
                          slotProps={{ textField: { size: 'small', sx: { minWidth: { xs: '100%', sm: '45%', md: '22%' }, flex: '1 1 200px' } } }}
                        />
                        <DatePicker
                          label="End Date"
                          value={dateRangeEnd}
                          onChange={(v) => setDateRangeEnd(v)}
                          slotProps={{ textField: { size: 'small', sx: { minWidth: { xs: '100%', sm: '45%', md: '22%' }, flex: '1 1 200px' } } }}
                        />
                        <FormControlLabel
                          control={<Checkbox checked={presentOnly} onChange={(e) => setPresentOnly(e.target.checked)} />}
                          label="Show Present Only"
                          sx={{ minWidth: { xs: '100%', sm: '45%', md: '22%' }, flex: '1 1 200px' }}
                        />
                      </Stack>
                      <Box sx={{ mt: 2 }}>
                        <Button variant="outlined" size="small" onClick={resetFilters}>
                          Reset All Filters
                        </Button>
                      </Box>
                    </Box>
                  </Collapse>

                  <Typography variant="body2" sx={{ color: 'text.secondary', mt: 2 }}>
                    Showing {sortedLogs.length} of {augmentedLogs.length} records | Last updated:{' '}
                    {lastUpdated.toLocaleTimeString()}
                  </Typography>
                </Box>

                {/* Table */}
                {loading ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                    <CircularProgress />
                  </Box>
                ) : error ? (
                  <Box sx={{ p: 3 }}>
                    <Alert severity="error">{error}</Alert>
                  </Box>
                ) : !sortedLogs.length ? (
                  <Box sx={{ textAlign: 'center', py: 8 }}>
                    <PeopleIcon sx={{ fontSize: 64, color: 'action.disabled', mb: 2 }} />
                    <Typography variant="h6" sx={{ color: 'text.secondary' }}>
                      No Data Available
                    </Typography>
                  </Box>
                ) : (
                  <>
                    <TableContainer sx={{ maxHeight: 600 }}>
                      <Table stickyHeader>
                        <TableHead>
                          <TableRow>
                            {allColumns
                              .filter((col) => visibleColumns.has(col.key))
                              .map((col) => (
                                <TableCell key={col.key}>
                                  <TableSortLabel
                                    active={sortConfig.key === col.key}
                                    direction={sortConfig.key === col.key ? sortConfig.direction : 'asc'}
                                    onClick={() => handleSort(col.key)}
                                  >
                                    {col.label}
                                  </TableSortLabel>
                                </TableCell>
                              ))}
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {paginatedLogs.map((row) => (
                            <TableRow key={row.sl} hover>
                              {allColumns
                                .filter((col) => visibleColumns.has(col.key))
                                .map((col) => (
                                  <TableCell key={col.key}>{getCellValue(row, col.key)}</TableCell>
                                ))}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                    <TablePagination
                      component="div"
                      count={sortedLogs.length}
                      page={page}
                      onPageChange={(_, p) => setPage(p)}
                      rowsPerPage={rowsPerPage}
                      onRowsPerPageChange={(e) => {
                        setRowsPerPage(parseInt(e.target.value, 10));
                        setPage(0);
                      }}
                      rowsPerPageOptions={[10, 25, 50, 100, 200]}
                    />
                  </>
                )}
              </Paper>
            )}

            {/* Charts View */}
            {activeTab === 1 && (
              <Stack direction="row" spacing={3} flexWrap="wrap">
                <Box sx={{ flex: '1 1 400px', minWidth: { xs: '100%', md: '45%' } }}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" sx={{ mb: 2, fontWeight: 700 }}>
                        Hourly Visit Distribution
                      </Typography>
                      <ResponsiveContainer width="100%" height={300}>
                        <AreaChart data={hourlyChartData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="hour" />
                          <YAxis />
                          <RechartsTooltip />
                          <Area type="monotone" dataKey="count" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </Box>
                <Box sx={{ flex: '1 1 400px', minWidth: { xs: '100%', md: '45%' } }}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" sx={{ mb: 2, fontWeight: 700 }}>
                        Department Distribution
                      </Typography>
                      <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                          <Pie data={departmentChartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                            {departmentChartData.map((_, index) => (
                              <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                            ))}
                          </Pie>
                          <RechartsTooltip />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </Box>
                <Box sx={{ flex: '1 1 400px', minWidth: { xs: '100%', md: '45%' } }}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" sx={{ mb: 2, fontWeight: 700 }}>
                        Gender Distribution
                      </Typography>
                      <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                          <Pie data={genderChartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                            <Cell fill="#3b82f6" />
                            <Cell fill="#ec4899" />
                          </Pie>
                          <RechartsTooltip />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </Box>
                <Box sx={{ flex: '1 1 400px', minWidth: { xs: '100%', md: '45%' } }}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" sx={{ mb: 2, fontWeight: 700 }}>
                        Daily Visits Trend
                      </Typography>
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={dailyChartData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" />
                          <YAxis />
                          <RechartsTooltip />
                          <Bar dataKey="count" fill="#10b981" />
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </Box>
              </Stack>
            )}

            {/* Reports View */}
            {activeTab === 2 && (
              <Paper sx={{ p: 4 }}>
                <Typography variant="h5" sx={{ mb: 3, fontWeight: 700 }}>
                  Generate Reports
                </Typography>
                <ToggleButtonGroup
                  value={reportType}
                  exclusive
                  onChange={(_, v) => v && setReportType(v)}
                  sx={{ mb: 3 }}
                >
                  <ToggleButton value="daily">Daily</ToggleButton>
                  <ToggleButton value="weekly">Weekly</ToggleButton>
                  <ToggleButton value="monthly">Monthly</ToggleButton>
                </ToggleButtonGroup>
                <Stack spacing={2}>
                  <Button variant="contained" onClick={() => handleExport('xlsx')}>
                    Download Excel Report ({reportType})
                  </Button>
                  <Button variant="contained" onClick={() => handleExport('pdf')}>
                    Download PDF Report ({reportType})
                  </Button>
                  <Button variant="outlined" onClick={() => handleExport('csv')}>
                    Download CSV Report ({reportType})
                  </Button>
                </Stack>
                <Divider sx={{ my: 3 }} />
                <Typography variant="h6" sx={{ mb: 2, fontWeight: 700 }}>
                  Report Summary
                </Typography>
                <Stack direction="row" spacing={2} flexWrap="wrap">
                  <Box sx={{ flex: '1 1 200px', minWidth: { xs: '100%', sm: '45%' } }}>
                    <Typography variant="body2">
                      <strong>Total Visits:</strong> {stats.totalVisits}
                    </Typography>
                  </Box>
                  <Box sx={{ flex: '1 1 200px', minWidth: { xs: '100%', sm: '45%' } }}>
                    <Typography variant="body2">
                      <strong>Currently Inside:</strong> {stats.currentlyInside}
                    </Typography>
                  </Box>
                  <Box sx={{ flex: '1 1 200px', minWidth: { xs: '100%', sm: '45%' } }}>
                    <Typography variant="body2">
                      <strong>Avg Time Spent:</strong> {formatTimeSpent(stats.avgTimeSpent)}
                    </Typography>
                  </Box>
                  <Box sx={{ flex: '1 1 200px', minWidth: { xs: '100%', sm: '45%' } }}>
                    <Typography variant="body2">
                      <strong>Long Sessions:</strong> {stats.longSessions}
                    </Typography>
                  </Box>
                </Stack>
              </Paper>
            )}
          </Box>

          {/* Column Selector Popover */}
          <Popover
            open={Boolean(columnAnchor)}
            anchorEl={columnAnchor}
            onClose={() => setColumnAnchor(null)}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
          >
            <Box sx={{ p: 2, minWidth: 250 }}>
              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 700 }}>
                Select Columns to Display
              </Typography>
              <FormGroup>
                {allColumns.map((col) => (
                  <FormControlLabel
                    key={col.key}
                    control={<Checkbox checked={visibleColumns.has(col.key)} onChange={() => toggleColumn(col.key)} />}
                    label={col.label}
                  />
                ))}
              </FormGroup>
            </Box>
          </Popover>
        </Box>
      </LocalizationProvider>
    </ThemeProvider>
  );
};

export default AdvancedAnalytics;
