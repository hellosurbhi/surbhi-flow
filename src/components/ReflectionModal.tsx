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
  const minWords = 200;
  const wordCount = reflection.trim().split(/\s+/).filter(word => word.length > 0).length;
  const isComplete = wordCount >= minWords;

  const handleSubmit = () => {
    if (isComplete) {
      onSubmit(reflection);
      setReflection('');
      onClose();
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        Why don't you want to do this task?
      </DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          Task: <strong>{taskTitle}</strong>
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Please write at least {minWords} words reflecting on why you're avoiding this task.
        </Typography>
        <TextField
          multiline
          rows={8}
          fullWidth
          variant="outlined"
          placeholder="Write your reflection here..."
          value={reflection}
          onChange={(e) => setReflection(e.target.value)}
          sx={{ mb: 2 }}
        />
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <LinearProgress
            variant="determinate"
            value={Math.min((wordCount / minWords) * 100, 100)}
            sx={{ flexGrow: 1, height: 8, borderRadius: 4 }}
          />
          <Typography variant="body2" color={isComplete ? 'success.main' : 'text.secondary'}>
            {wordCount} / {minWords} words
          </Typography>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          color="primary"
          disabled={!isComplete}
        >
          Submit Reflection
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ReflectionModal;

