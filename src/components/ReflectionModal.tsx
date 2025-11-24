import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Typography,
  Box,
  LinearProgress
} from '@mui/material';

interface ReflectionModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (reflection: string) => void;
  taskTitle: string;
}

const ReflectionModal: React.FC<ReflectionModalProps> = ({ open, onClose, onSubmit, taskTitle }) => {
  const [reflection, setReflection] = useState('');
  const minCharacters = 500;
  const characterCount = reflection.trim().length;
  const isComplete = characterCount >= minCharacters;

  const handleSubmit = () => {
    if (isComplete) {
      onSubmit(reflection);
      setReflection('');
      onClose();
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      disableEnforceFocus={false}
      disableAutoFocus={false}
      PaperProps={{
        sx: {
          backgroundColor: '#FFFFFF',
        },
      }}
    >
      <DialogTitle
        sx={{
          backgroundColor: '#FFFFFF',
          color: '#000000',
          fontWeight: 600,
          fontSize: '20px',
        }}
      >
        ✍️ Why don't you want to do this task?
      </DialogTitle>
      <DialogContent sx={{ pt: 3 }}>
        <Typography
          variant="body1"
          gutterBottom
          sx={{
            mb: 2,
            p: 2,
            borderRadius: 2,
            backgroundColor: '#F2F2F7',
            border: '1px solid #C7C7CC',
            color: '#000000',
          }}
        >
          Task: <strong>{taskTitle}</strong>
        </Typography>
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ mb: 3, lineHeight: 1.7 }}
        >
          Please write at least <strong>{minCharacters} characters</strong> reflecting on why you're avoiding this task.
        </Typography>
        <TextField
          multiline
          rows={8}
          fullWidth
          variant="outlined"
          placeholder="Write your reflection here..."
          value={reflection}
          onChange={(e) => setReflection(e.target.value)}
          sx={{
            mb: 3,
            '& .MuiOutlinedInput-root': {
              fontSize: '1rem',
              lineHeight: 1.6,
            },
          }}
        />
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <LinearProgress
            variant="determinate"
            value={Math.min((characterCount / minCharacters) * 100, 100)}
            sx={{
              flexGrow: 1,
              height: 10,
              borderRadius: 5,
            backgroundColor: '#E5E5EA',
            '& .MuiLinearProgress-bar': {
              backgroundColor: isComplete ? '#34C759' : '#007AFF',
              borderRadius: 5,
            },
            }}
          />
          <Typography
            variant="body2"
            sx={{
              fontWeight: 600,
              color: isComplete ? 'success.main' : 'text.secondary',
              minWidth: 100,
              textAlign: 'right',
            }}
          >
            {characterCount} / {minCharacters} characters
          </Typography>
        </Box>
      </DialogContent>
      <DialogActions sx={{ p: 3, pt: 2 }}>
        <Button
          onClick={onClose}
          sx={{
            fontWeight: 600,
            px: 3,
          }}
        >
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          color="primary"
          disabled={!isComplete}
          sx={{
            fontWeight: 600,
            px: 4,
          }}
        >
          Submit Reflection
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ReflectionModal;

