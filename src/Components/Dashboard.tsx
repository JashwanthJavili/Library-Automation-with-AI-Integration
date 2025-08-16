import React from 'react';
import {
  Box,
  AppBar,
  Toolbar,
  Typography,
  Avatar,
  Card,
  CardActionArea,
  CardContent,
  Button
} from '@mui/material';
import { Grid } from '@mui/material';
import LoginIcon from '@mui/icons-material/Login';
import SearchIcon from '@mui/icons-material/Search';
import AssignmentReturnIcon from '@mui/icons-material/AssignmentReturn';
import PeopleAltIcon from '@mui/icons-material/PeopleAlt';
import LibraryBooksIcon from '@mui/icons-material/LibraryBooks';
import MeetingRoomIcon from '@mui/icons-material/MeetingRoom';
import NotificationsIcon from '@mui/icons-material/Notifications';
import BarChartIcon from '@mui/icons-material/BarChart';
import SettingsIcon from '@mui/icons-material/Settings';


import type { User } from '../services/api';

interface DashboardProps {
  user: User | null;
  onLogout: () => void;
  onCategoryClick: (category: string) => void;
}

const LOGO_URL = '/src/assets/Kare_Logo.png';

const categories = [
  {
    title: 'Main Gate Entry/Exit',
    icon: <LoginIcon sx={{ fontSize: 48, color: '#1e3a8a' }} />,
    description: 'Monitor and log student entry/exit in real-time.',
    active: true
  },
  {
    title: 'Book Catalogue',
    icon: <SearchIcon sx={{ fontSize: 48, color: '#37b24d' }} />,
    description: 'Search, filter and browse library books.',
    active: false
  },
  {
    title: 'Book Issue/Return',
    icon: <AssignmentReturnIcon sx={{ fontSize: 48, color: '#6741d9' }} />,
    description: 'Process book issues and returns smoothly.',
    active: false
  },
  {
    title: 'Borrower Management',
    icon: <PeopleAltIcon sx={{ fontSize: 48, color: '#f59f00' }} />,
    description: 'View and manage student borrowing activity.',
    active: false
  },
  {
    title: 'Attendance Logs',
    icon: <LibraryBooksIcon sx={{ fontSize: 48, color: '#e8590c' }} />,
    description: 'Track entry and exit attendance logs.',
    active: false
  },
  {
    title: 'Hall/Room Booking',
    icon: <MeetingRoomIcon sx={{ fontSize: 48, color: '#4dabf7' }} />,
    description: 'Reserve halls/rooms for study or events.',
    active: false
  },
  {
    title: 'Notices',
    icon: <NotificationsIcon sx={{ fontSize: 48, color: '#fa5252' }} />,
    description: 'Post and view library messages/alerts.',
    active: false
  },
  {
    title: 'Analytics & Reports',
    icon: <BarChartIcon sx={{ fontSize: 48, color: '#228be6' }} />,
    description: 'Visualize library usage and generate reports.',
    active: true
  },
  {
    title: 'Settings',
    icon: <SettingsIcon sx={{ fontSize: 48, color: '#495057' }} />,
    description: 'Update system preferences & manage users.',
    active: false
  }
];

const Dashboard: React.FC<DashboardProps> = ({ user, onLogout, onCategoryClick }) => {
  return (
    <Box
      sx={{
        minHeight: '100vh',
        minWidth: '100vw',
        bgcolor: '#f8fafc',
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      {/* Top Bar */}
      <AppBar
        position="static"
        color="inherit"
        elevation={2}
        sx={{
          borderBottom: '1px solid #e2e8f0',
          bgcolor: '#fff',
          zIndex: 1300
        }}
      >
        <Toolbar
          sx={{
            maxWidth: 1400,
            mx: 'auto',
            width: '100%',
            px: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 2
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Avatar
              src={LOGO_URL}
              alt="KARE Logo"
              variant="rounded"
              sx={{ width: 48, height: 48 }}
              imgProps={{ referrerPolicy: 'no-referrer' }}
            />
            <Typography
              variant="h5"
              sx={{
                fontWeight: 700,
                letterSpacing: 1,
                color: '#1e3a8a',
                ml: 1,
                fontSize: { xs: 20, sm: 24 }
              }}
            >
              LMS – KARE
            </Typography>
          </Box>
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {user && (
              <Box sx={{ textAlign: 'right', mr: 2 }}>
                <Typography
                  variant="subtitle2"
                  sx={{
                    fontWeight: 600,
                    color: '#475569',
                    fontSize: 14
                  }}
                >
                  Welcome, {user.firstName} {user.lastName}
                </Typography>
                <Typography
                  variant="caption"
                  sx={{
                    color: '#64748b',
                    fontSize: 12,
                    textTransform: 'capitalize'
                  }}
                >
                  {user.role}
                </Typography>
              </Box>
            )}
            <Button
              color="primary"
              variant="outlined"
              onClick={onLogout}
              sx={{
                textTransform: 'none',
                fontWeight: 600,
                borderRadius: 2,
                px: 3,
                fontSize: 15
              }}
            >
              Logout
            </Button>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Fullscreen Responsive Centered Grid */}
      <Box
        sx={{
          flex: 1,
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <Grid
          container
          spacing={{ xs: 3, md: 4 }}
          columns={{ xs: 1, sm: 2, md: 3, lg: 4, xl: 4 }}
          sx={{
            width: '100%',
            maxWidth: 1280,
            px: { xs: 2, md: 4 },
            py: { xs: 3, md: 6 },
            justifyContent: 'center',
            alignItems: 'center'
          }}
        >
          {categories.map((cat, i) => (
            <Grid key={cat.title}>
              <Card
                sx={{
                  height: 230,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 4,
                  boxShadow: cat.active ? 7 : 2,
                  border: cat.active ? '2.5px solid #1e3a8a' : '1px solid #d4d7dd',
                  bgcolor: '#fff',
                  transition: 'box-shadow 0.18s, border-color 0.18s, transform 0.11s',
                  opacity: cat.active ? 1 : 0.60,
                  cursor: cat.active ? 'pointer' : 'not-allowed',
                  '&:hover': cat.active
                    ? {
                        boxShadow: 12,
                        transform: 'translateY(-3px) scale(1.03)',
                        borderColor: '#274dab'
                      }
                    : undefined
                }}
                tabIndex={cat.active ? 0 : -1}
                aria-disabled={!cat.active}
              >
                <CardActionArea
                  disabled={!cat.active}
                  onClick={() => cat.active && onCategoryClick(cat.title)}
                  role="button"
                  sx={{ height: '100%' }}
                >
                  <CardContent
                    sx={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      height: '100%'
                    }}
                  >
                    {cat.icon}
                    <Typography
                      variant="h6"
                      sx={{
                        mt: 2,
                        fontWeight: 700,
                        fontSize: 20,
                        color: '#1e3a8a',
                        marginBottom: '0.4em'
                      }}
                    >
                      {cat.title}
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{
                        color: '#5f6368',
                        fontSize: 16,
                        textAlign: 'center'
                      }}
                    >
                      {cat.description}
                    </Typography>
                  </CardContent>
                </CardActionArea>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Box>
    </Box>
  );
};

export default Dashboard;
