import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Paper,
  TextField,
  IconButton,
  Typography,
  Avatar,
  Fab,
  Collapse,
  Chip,
  CircularProgress,
  Stack,
  Tooltip,
} from '@mui/material';
import ChatIcon from '@mui/icons-material/Chat';
import CloseIcon from '@mui/icons-material/Close';
import SendIcon from '@mui/icons-material/Send';
import MinimizeIcon from '@mui/icons-material/Minimize';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import PersonIcon from '@mui/icons-material/Person';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface AIAssistantProps {
  userRole?: string;
  currentPage?: string;
  userName?: string;
}

const AIAssistant: React.FC<AIAssistantProps> = ({
  userRole = 'student',
  currentPage = 'dashboard',
  userName = 'User',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Fetch suggestions when opened or page changes
  useEffect(() => {
    if (isOpen && !isMinimized) {
      fetchSuggestions();
    }
  }, [isOpen, isMinimized, currentPage, userRole]);

  // Welcome message
  useEffect(() => {
    if (messages.length === 0) {
      const welcomeMessage: Message = {
        role: 'assistant',
        content: `Hello ${userName}! 👋 I'm your AI assistant for the KARE Library Management System. How can I help you today?`,
        timestamp: new Date(),
      };
      setMessages([welcomeMessage]);
    }
  }, []);

  const fetchSuggestions = async () => {
    try {
      const response = await fetch(
        `http://localhost:5001/api/chat/suggestions?userRole=${userRole}&currentPage=${currentPage}`
      );
      const data = await response.json();
      if (data.success) {
        setSuggestions(data.data.suggestions);
      }
    } catch (error) {
      console.error('Failed to fetch suggestions:', error);
    }
  };

  const sendMessage = async (messageText?: string) => {
    const textToSend = messageText || inputMessage.trim();
    if (!textToSend) return;

    // Add user message
    const userMessage: Message = {
      role: 'user',
      content: textToSend,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
  const response = await fetch('http://localhost:5001/api/chat/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: textToSend,
          userRole,
          currentPage,
          conversationHistory: messages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      const data = await response.json();

      if (data.success) {
        const assistantMessage: Message = {
          role: 'assistant',
          content: data.data.message,
          timestamp: new Date(data.data.timestamp),
        };
        setMessages((prev) => [...prev, assistantMessage]);
      } else {
        throw new Error(data.message);
      }
    } catch (error) {
      const errorMessage: Message = {
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
      console.error('Chat error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    sendMessage(suggestion);
  };

  return (
    <>
      {/* Floating Action Button */}
      {!isOpen && (
        <Fab
          color="primary"
          aria-label="chat"
          onClick={() => setIsOpen(true)}
          sx={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            zIndex: 1400,
            background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)',
            '&:hover': {
              background: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)',
              transform: 'scale(1.1)',
            },
            transition: 'all 0.3s ease',
            boxShadow: '0 8px 24px rgba(30, 64, 175, 0.4)',
          }}
        >
          <ChatIcon sx={{ fontSize: 32 }} />
        </Fab>
      )}

      {/* Chat Window */}
      <Collapse in={isOpen} timeout={300}>
        <Paper
          elevation={12}
          sx={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            width: { xs: 'calc(100vw - 32px)', sm: 420 },
            maxWidth: 420,
            height: isMinimized ? 'auto' : { xs: 'calc(100vh - 48px)', sm: 600 },
            maxHeight: 600,
            zIndex: 1400,
            borderRadius: 4,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            background: '#fff',
            border: '2px solid #e2e8f0',
          }}
        >
          {/* Header */}
          <Box
            sx={{
              background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)',
              color: '#fff',
              p: 2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Avatar sx={{ bgcolor: '#fff', color: '#1e40af' }}>
                <SmartToyIcon />
              </Avatar>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 700, fontSize: 18 }}>
                  AI Assistant
                </Typography>
                <Typography variant="caption" sx={{ opacity: 0.9 }}>
                  {userRole.charAt(0).toUpperCase() + userRole.slice(1)} Support
                </Typography>
              </Box>
            </Box>
            <Box>
              <Tooltip title={isMinimized ? 'Maximize' : 'Minimize'}>
                <IconButton
                  size="small"
                  onClick={() => setIsMinimized(!isMinimized)}
                  sx={{ color: '#fff', mr: 0.5 }}
                >
                  <MinimizeIcon />
                </IconButton>
              </Tooltip>
              <Tooltip title="Close">
                <IconButton size="small" onClick={() => setIsOpen(false)} sx={{ color: '#fff' }}>
                  <CloseIcon />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>

          {/* Messages Area */}
          {!isMinimized && (
            <>
              <Box
                sx={{
                  flex: 1,
                  overflowY: 'auto',
                  p: 2,
                  bgcolor: '#f8fafc',
                  '&::-webkit-scrollbar': { width: 8 },
                  '&::-webkit-scrollbar-thumb': {
                    bgcolor: '#cbd5e1',
                    borderRadius: 4,
                  },
                }}
              >
                {messages.map((msg, idx) => (
                  <Box
                    key={idx}
                    sx={{
                      display: 'flex',
                      justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                      mb: 2,
                    }}
                  >
                    <Box
                      sx={{
                        display: 'flex',
                        gap: 1,
                        maxWidth: '80%',
                        flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
                      }}
                    >
                      <Avatar
                        sx={{
                          width: 32,
                          height: 32,
                          bgcolor: msg.role === 'user' ? '#10b981' : '#3b82f6',
                          fontSize: 16,
                        }}
                      >
                        {msg.role === 'user' ? <PersonIcon fontSize="small" /> : <SmartToyIcon fontSize="small" />}
                      </Avatar>
                      <Box>
                        <Paper
                          elevation={1}
                          sx={{
                            p: 1.5,
                            borderRadius: 2,
                            bgcolor: msg.role === 'user' ? '#10b981' : '#fff',
                            color: msg.role === 'user' ? '#fff' : '#0f172a',
                            border: msg.role === 'assistant' ? '1px solid #e2e8f0' : 'none',
                          }}
                        >
                          <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                            {msg.content}
                          </Typography>
                        </Paper>
                        <Typography
                          variant="caption"
                          sx={{
                            color: '#64748b',
                            fontSize: 10,
                            mt: 0.5,
                            display: 'block',
                            textAlign: msg.role === 'user' ? 'right' : 'left',
                          }}
                        >
                          {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </Typography>
                      </Box>
                    </Box>
                  </Box>
                ))}

                {isLoading && (
                  <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                    <Avatar sx={{ width: 32, height: 32, bgcolor: '#3b82f6' }}>
                      <SmartToyIcon fontSize="small" />
                    </Avatar>
                    <Paper elevation={1} sx={{ p: 1.5, borderRadius: 2, bgcolor: '#fff' }}>
                      <Stack direction="row" spacing={0.5} alignItems="center">
                        <CircularProgress size={12} />
                        <Typography variant="body2" sx={{ color: '#64748b', ml: 1 }}>
                          Thinking...
                        </Typography>
                      </Stack>
                    </Paper>
                  </Box>
                )}

                <div ref={messagesEndRef} />
              </Box>

              {/* Suggestions - show after every assistant response or when conversation is fresh */}
              {suggestions.length > 0 && !isLoading && (
                <Box sx={{ p: 2, bgcolor: '#f8fafc', borderTop: '1px solid #e2e8f0' }}>
                  <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600, mb: 1, display: 'block' }}>
                    Quick suggestions:
                  </Typography>
                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                    {suggestions.slice(0, 4).map((suggestion, idx) => (
                      <Chip
                        key={idx}
                        label={suggestion}
                        size="small"
                        onClick={() => handleSuggestionClick(suggestion)}
                        sx={{
                          cursor: 'pointer',
                          '&:hover': { bgcolor: '#e0e7ff' },
                          mb: 1,
                        }}
                      />
                    ))}
                  </Stack>
                </Box>
              )}

              {/* Input Area */}
              <Box sx={{ p: 2, bgcolor: '#fff', borderTop: '2px solid #e2e8f0' }}>
                <Stack direction="row" spacing={1} alignItems="flex-end">
                  <TextField
                    fullWidth
                    multiline
                    maxRows={3}
                    placeholder="Type your message..."
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    disabled={isLoading}
                    size="small"
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: 3,
                        bgcolor: '#f8fafc',
                      },
                    }}
                  />
                  <IconButton
                    color="primary"
                    onClick={() => sendMessage()}
                    disabled={!inputMessage.trim() || isLoading}
                    sx={{
                      bgcolor: '#1e40af',
                      color: '#fff',
                      '&:hover': { bgcolor: '#1e3a8a' },
                      '&:disabled': { bgcolor: '#e2e8f0' },
                    }}
                  >
                    <SendIcon />
                  </IconButton>
                </Stack>
              </Box>
            </>
          )}
        </Paper>
      </Collapse>
    </>
  );
};

export default AIAssistant;
