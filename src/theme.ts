import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#007AFF', // Apple blue
      light: '#5AC8FA',
      dark: '#0051D5',
    },
    secondary: {
      main: '#5856D6', // Apple purple
      light: '#AF52DE',
      dark: '#3634A3',
    },
    success: {
      main: '#34C759', // Apple green
      light: '#30D158',
      dark: '#28A745',
    },
    error: {
      main: '#FF3B30', // Apple red
      light: '#FF453A',
      dark: '#D70015',
    },
    warning: {
      main: '#FF9500', // Apple orange
      light: '#FF9F0A',
      dark: '#ED6C02',
    },
    info: {
      main: '#007AFF',
      light: '#5AC8FA',
      dark: '#0051D5',
    },
    background: {
      default: '#F2F2F7', // Apple light gray background
      paper: '#FFFFFF', // Pure white for cards
    },
    text: {
      primary: '#000000', // Black text for readability
      secondary: '#8E8E93', // Apple gray for secondary text
    },
    divider: 'rgba(0, 0, 0, 0.1)',
  },
  typography: {
    fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", Helvetica, Arial, sans-serif',
    h1: {
      fontWeight: 700,
      letterSpacing: '-0.02em',
      color: '#000000',
    },
    h3: {
      fontWeight: 700,
      letterSpacing: '-0.02em',
      color: '#000000',
    },
    h4: {
      fontWeight: 600,
      letterSpacing: '-0.01em',
      color: '#000000',
    },
    h5: {
      fontWeight: 600,
      letterSpacing: '-0.01em',
      color: '#000000',
    },
    h6: {
      fontWeight: 600,
      color: '#000000',
    },
    body1: {
      color: '#000000',
      lineHeight: 1.5,
    },
    body2: {
      color: '#8E8E93',
      lineHeight: 1.5,
    },
    button: {
      textTransform: 'none',
      fontWeight: 600,
      letterSpacing: '-0.01em',
    },
  },
  shape: {
    borderRadius: 14, // Apple's rounded corners
  },
  shadows: [
    'none',
    '0px 1px 2px rgba(0, 0, 0, 0.05)',
    '0px 1px 3px rgba(0, 0, 0, 0.08)',
    '0px 2px 4px rgba(0, 0, 0, 0.08)',
    '0px 2px 6px rgba(0, 0, 0, 0.08)',
    '0px 3px 8px rgba(0, 0, 0, 0.1)',
    '0px 4px 10px rgba(0, 0, 0, 0.1)',
    '0px 5px 12px rgba(0, 0, 0, 0.1)',
    '0px 6px 14px rgba(0, 0, 0, 0.1)',
    '0px 7px 16px rgba(0, 0, 0, 0.1)',
    '0px 8px 18px rgba(0, 0, 0, 0.1)',
    '0px 9px 20px rgba(0, 0, 0, 0.1)',
    '0px 10px 22px rgba(0, 0, 0, 0.1)',
    '0px 11px 24px rgba(0, 0, 0, 0.1)',
    '0px 12px 26px rgba(0, 0, 0, 0.1)',
    '0px 13px 28px rgba(0, 0, 0, 0.1)',
    '0px 14px 30px rgba(0, 0, 0, 0.1)',
    '0px 15px 32px rgba(0, 0, 0, 0.1)',
    '0px 16px 34px rgba(0, 0, 0, 0.1)',
    '0px 17px 36px rgba(0, 0, 0, 0.1)',
    '0px 18px 38px rgba(0, 0, 0, 0.1)',
    '0px 19px 40px rgba(0, 0, 0, 0.1)',
    '0px 20px 42px rgba(0, 0, 0, 0.1)',
    '0px 21px 44px rgba(0, 0, 0, 0.1)',
    '0px 22px 46px rgba(0, 0, 0, 0.1)',
  ],
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundColor: '#FFFFFF',
          border: 'none',
          boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.08)',
          borderRadius: 16,
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          padding: '12px 24px',
          fontSize: '17px', // Apple's standard button font size
          fontWeight: 600,
          textTransform: 'none',
          boxShadow: 'none',
          '&:hover': {
            boxShadow: 'none',
          },
        },
        contained: {
          backgroundColor: '#007AFF',
          color: '#FFFFFF',
          boxShadow: 'none',
          '&:hover': {
            backgroundColor: '#0051D5',
            boxShadow: 'none',
          },
        },
        containedSuccess: {
          backgroundColor: '#34C759',
          '&:hover': {
            backgroundColor: '#28A745',
          },
        },
        outlined: {
          borderWidth: '1.5px',
          borderColor: '#C7C7CC',
          color: '#007AFF',
          '&:hover': {
            borderColor: '#007AFF',
            backgroundColor: 'rgba(0, 122, 255, 0.05)',
            borderWidth: '1.5px',
          },
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 12,
            backgroundColor: '#F2F2F7',
            border: 'none',
            '& fieldset': {
              border: 'none',
            },
            '&:hover': {
              backgroundColor: '#E5E5EA',
            },
            '&.Mui-focused': {
              backgroundColor: '#FFFFFF',
              boxShadow: '0px 0px 0px 2px rgba(0, 122, 255, 0.2)',
            },
          },
          '& .MuiInputBase-input': {
            color: '#000000',
            fontSize: '17px',
          },
          '& .MuiInputLabel-root': {
            color: '#8E8E93',
          },
          '& .MuiInputLabel-root.Mui-focused': {
            color: '#007AFF',
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          fontWeight: 500,
          fontSize: '13px',
          height: '28px',
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          color: '#007AFF',
          '&:hover': {
            backgroundColor: 'rgba(0, 122, 255, 0.1)',
          },
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 16,
          backgroundColor: '#FFFFFF',
          boxShadow: '0px 8px 32px rgba(0, 0, 0, 0.12)',
        },
      },
    },
    MuiDialogTitle: {
      styleOverrides: {
        root: {
          backgroundColor: '#FFFFFF',
          color: '#000000',
          fontWeight: 600,
          fontSize: '20px',
          padding: '20px 24px',
        },
      },
    },
    MuiDialogContent: {
      styleOverrides: {
        root: {
          padding: '24px',
          backgroundColor: '#FFFFFF',
        },
      },
    },
    MuiSnackbar: {
      styleOverrides: {
        root: {
          bottom: '20px',
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.1)',
        },
        filledSuccess: {
          backgroundColor: '#34C759',
          color: '#FFFFFF',
        },
      },
    },
  },
});

export default theme;
