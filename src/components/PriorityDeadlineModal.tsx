import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Typography,
  Box,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from '@mui/material';

interface PriorityDeadlineModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (priority: number, deadline: string | null) => void;
  taskTitle: string;
  currentPriority: number;
  currentDeadline?: string | null;
}

const PriorityDeadlineModal: React.FC<PriorityDeadlineModalProps> = ({
  open,
  onClose,
  onSubmit,
  taskTitle,
  currentPriority,
  currentDeadline,
}) => {
  const [priority, setPriority] = useState<number>(currentPriority);
  const [deadline, setDeadline] = useState<string>('');

  // Reset state when modal opens/closes
  useEffect(() => {
    if (open) {
      setPriority(currentPriority);
      setDeadline('');
    }
  }, [open, currentPriority]);

  const handleSubmit = async () => {
    // Parse deadline if provided using the same logic as parseTask
    let deadlineDate: string | null = null;
    if (deadline.trim()) {
      const deadlineStr = deadline.trim().toLowerCase();
      const now = new Date();
      const deadlineDateObj = new Date(now);

      // Parse common deadline formats (same logic as parseTask.ts)
      if (deadlineStr.includes('hour') || deadlineStr.includes('hr')) {
        const match = deadlineStr.match(/(\d+)\s*(hour|hr|hours|hrs)/);
        const hours = match ? parseInt(match[1]) : 1;
        deadlineDateObj.setHours(deadlineDateObj.getHours() + hours);
        deadlineDate = deadlineDateObj.toISOString();
      } else if (deadlineStr.includes('minute') || deadlineStr.includes('min')) {
        const match = deadlineStr.match(/(\d+)\s*(minute|min|minutes|mins)/);
        const minutes = match ? parseInt(match[1]) : 30;
        deadlineDateObj.setMinutes(deadlineDateObj.getMinutes() + minutes);
        deadlineDate = deadlineDateObj.toISOString();
      } else if (deadlineStr.includes('tomorrow')) {
        deadlineDateObj.setDate(deadlineDateObj.getDate() + 1);
        deadlineDateObj.setHours(9, 0, 0); // Default to 9am tomorrow
        deadlineDate = deadlineDateObj.toISOString();
      } else if (deadlineStr.includes('next week')) {
        deadlineDateObj.setDate(deadlineDateObj.getDate() + 7);
        deadlineDateObj.setHours(9, 0, 0); // Default to 9am next week
        deadlineDate = deadlineDateObj.toISOString();
      } else if (deadlineStr.includes('today')) {
        deadlineDateObj.setHours(23, 59, 59); // End of today
        deadlineDate = deadlineDateObj.toISOString();
      } else if (deadlineStr.includes('day') && !deadlineStr.includes('to')) {
        const match = deadlineStr.match(/(\d+)\s*(day|days)/);
        if (match) {
          const days = parseInt(match[1]);
          deadlineDateObj.setDate(deadlineDateObj.getDate() + days);
          deadlineDateObj.setHours(9, 0, 0); // Default to 9am on target day
          deadlineDate = deadlineDateObj.toISOString();
        }
      } else {
        // Try to parse as ISO date string or other formats
        const parsed = new Date(deadline);
        if (!isNaN(parsed.getTime())) {
          deadlineDate = parsed.toISOString();
        }
      }
    }

    onSubmit(priority, deadlineDate);
    setDeadline(''); // Reset for next time
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
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
        📋 Update Priority & Deadline
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
        
        <Box sx={{ mb: 3 }}>
          <FormControl fullWidth sx={{ mb: 3 }}>
            <InputLabel id="priority-label">Priority</InputLabel>
            <Select
              labelId="priority-label"
              value={priority}
              label="Priority"
              onChange={(e) => setPriority(Number(e.target.value))}
              sx={{
                '& .MuiOutlinedInput-notchedOutline': {
                  borderColor: '#C7C7CC',
                },
              }}
            >
              <MenuItem value={1}>Priority 1 (Lowest)</MenuItem>
              <MenuItem value={2}>Priority 2 (Low)</MenuItem>
              <MenuItem value={3}>Priority 3 (Medium)</MenuItem>
              <MenuItem value={4}>Priority 4 (High)</MenuItem>
              <MenuItem value={5}>Priority 5 (Highest/Urgent)</MenuItem>
            </Select>
          </FormControl>

          <TextField
            fullWidth
            label="Deadline (optional)"
            variant="outlined"
            placeholder="e.g., 'in 2 hours', 'tomorrow', 'next week', or leave empty"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
            sx={{
              '& .MuiOutlinedInput-root': {
                fontSize: '1rem',
              },
            }}
            helperText="Enter a deadline in natural language or leave empty for no deadline"
          />
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
          sx={{
            fontWeight: 600,
            px: 4,
          }}
        >
          Update Task
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default PriorityDeadlineModal;

