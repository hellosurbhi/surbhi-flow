import React, { useState } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Button,
  Box,
  Chip,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress
} from '@mui/material';
import { format, parseISO, isPast } from 'date-fns';
import axios from 'axios';
import { db } from '@/services/firebaseService';
import { doc, updateDoc, deleteField } from 'firebase/firestore';
import ReflectionModal from './ReflectionModal';

interface Task {
  id: string;
  title: string;
  description?: string;
  type: 'single' | 'habit';
  deadline?: string;
  nextDueDate?: string;
  priority: number;
  frequency?: string;
  completed?: boolean;
  deferred?: boolean;
  reflection?: string;
}

interface TaskViewProps {
  task: Task | null;
  onTaskComplete: () => void;
  onTaskDeferred: () => void;
  onTaskSkipped: () => void;
}

const TaskView: React.FC<TaskViewProps> = ({ task, onTaskComplete, onTaskDeferred, onTaskSkipped }) => {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState('');
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [showReflectionModal, setShowReflectionModal] = useState(false);
  const [showPriorityCheck, setShowPriorityCheck] = useState(false);
  const [priorityCheckAnswer, setPriorityCheckAnswer] = useState('');

  if (!task) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="300px">
        <Typography variant="h6" color="text.secondary">
          No tasks for now, add one!
        </Typography>
      </Box>
    );
  }

  const handleDontWantIt = async () => {
    setLoadingSuggestions(true);
    try {
      const response = await axios.post('/api/getSuggestions', {
        taskTitle: task.title,
        taskDescription: task.description
      });
      setSuggestions(response.data.suggestion);
      setShowSuggestions(true);
    } catch (error) {
      console.error('Error getting suggestions:', error);
      setSuggestions('Sorry, I couldn\'t generate suggestions right now. Try breaking the task into smaller steps or setting a timer for 5 minutes to just get started.');
      setShowSuggestions(true);
    } finally {
      setLoadingSuggestions(false);
    }
  };

  const handleStillDontWantIt = () => {
    setShowSuggestions(false);
    setShowReflectionModal(true);
  };

  const handleReflectionSubmit = async (reflection: string) => {
    // Save reflection to task
    if (task.id) {
      await updateDoc(doc(db, 'tasks', task.id), {
        reflection,
        reflectionDate: new Date().toISOString()
      });
    }
    setShowReflectionModal(false);
    setShowPriorityCheck(true);
  };

  const handlePriorityCheckSubmit = async () => {
    if (task.id) {
      if (priorityCheckAnswer === 'changed') {
        // Task is no longer relevant, mark as completed or remove
        await updateDoc(doc(db, 'tasks', task.id), {
          completed: true,
          completedAt: new Date().toISOString(),
          reason: 'Task no longer relevant'
        });
      } else if (priorityCheckAnswer === 'avoiding') {
        // Still priority but avoiding - update priority or deadline if needed
        // For now, just defer it
        await updateDoc(doc(db, 'tasks', task.id), {
          deferred: true,
          deferredAt: new Date().toISOString()
        });
      }
    }
    setShowPriorityCheck(false);
    setPriorityCheckAnswer('');
    onTaskSkipped();
  };

  const handleNotPriority = async () => {
    if (task.id) {
      await updateDoc(doc(db, 'tasks', task.id), {
        deferred: true,
        deferredAt: new Date().toISOString()
      });
    }
    onTaskDeferred();
  };

  const handleComplete = async () => {
    if (task.id) {
      if (task.type === 'habit') {
        // For habits, update nextDueDate based on frequency
        const now = new Date();
        const nextDue = new Date(now);
        const freq = task.frequency?.toLowerCase() || '';
        
        if (freq.includes('daily') || freq.includes('every day')) {
          nextDue.setDate(nextDue.getDate() + 1);
        } else if (freq.includes('weekly') || freq.includes('every week')) {
          nextDue.setDate(nextDue.getDate() + 7);
        } else if (freq.includes('every 2 weeks') || freq.includes('bi-weekly')) {
          nextDue.setDate(nextDue.getDate() + 14);
        } else if (freq.includes('monthly') || freq.includes('every month')) {
          nextDue.setMonth(nextDue.getMonth() + 1);
        } else {
          const match = freq.match(/(\d+)\s*(day|days|week|weeks|month|months)/);
          if (match) {
            const num = parseInt(match[1]);
            const unit = match[2];
            if (unit.includes('day')) {
              nextDue.setDate(nextDue.getDate() + num);
            } else if (unit.includes('week')) {
              nextDue.setDate(nextDue.getDate() + (num * 7));
            } else if (unit.includes('month')) {
              nextDue.setMonth(nextDue.getMonth() + num);
            }
          }
        }
        
        await updateDoc(doc(db, 'tasks', task.id), {
          lastCompletedAt: new Date().toISOString(),
          nextDueDate: nextDue.toISOString(),
          deferred: false
        });
      } else {
        // Single task - mark as completed
        await updateDoc(doc(db, 'tasks', task.id), {
          completed: true,
          completedAt: new Date().toISOString()
        });
      }
    }
    onTaskComplete();
  };

  const getDueDateDisplay = () => {
    if (task.type === 'habit' && task.nextDueDate) {
      const dueDate = parseISO(task.nextDueDate);
      const isOverdue = isPast(dueDate);
      return {
        text: format(dueDate, 'MMM d, yyyy'),
        isOverdue
      };
    } else if (task.deadline) {
      const dueDate = parseISO(task.deadline);
      const isOverdue = isPast(dueDate);
      return {
        text: format(dueDate, 'MMM d, yyyy h:mm a'),
        isOverdue
      };
    }
    return null;
  };

  const dueDateInfo = getDueDateDisplay();
  const priorityColors = {
    5: 'error',
    4: 'warning',
    3: 'info',
    2: 'default',
    1: 'default'
  } as const;

  return (
    <>
      <Card sx={{ minHeight: '400px' }}>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
            <Typography variant="h5" component="div" sx={{ flexGrow: 1 }}>
              {task.title}
            </Typography>
            <Chip
              label={`Priority ${task.priority}`}
              color={priorityColors[task.priority as keyof typeof priorityColors] || 'default'}
              size="small"
            />
          </Box>

          {task.description && (
            <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
              {task.description}
            </Typography>
          )}

          <Box display="flex" gap={1} flexWrap="wrap" mb={2}>
            {task.type === 'habit' && (
              <Chip label={`Habit: ${task.frequency || 'recurring'}`} size="small" />
            )}
            {dueDateInfo && (
              <Chip
                label={`Due: ${dueDateInfo.text}`}
                color={dueDateInfo.isOverdue ? 'error' : 'default'}
                size="small"
              />
            )}
          </Box>

          {showSuggestions ? (
            <Box>
              <Alert severity="info" sx={{ mb: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Here are some strategies to help you get started:
                </Typography>
                <Typography variant="body2" component="div" sx={{ whiteSpace: 'pre-line' }}>
                  {suggestions}
                </Typography>
              </Alert>
              <Box display="flex" gap={1}>
                <Button
                  variant="contained"
                  color="primary"
                  onClick={handleComplete}
                  fullWidth
                >
                  I'll do it now
                </Button>
                <Button
                  variant="outlined"
                  color="secondary"
                  onClick={handleStillDontWantIt}
                  fullWidth
                >
                  I still don't want to do it
                </Button>
              </Box>
            </Box>
          ) : (
            <Box display="flex" flexDirection="column" gap={2} mt={3}>
              <Button
                variant="contained"
                color="success"
                size="large"
                onClick={handleComplete}
                fullWidth
              >
                ✓ Complete Task
              </Button>
              <Box display="flex" gap={1}>
                <Button
                  variant="outlined"
                  color="error"
                  onClick={handleDontWantIt}
                  disabled={loadingSuggestions}
                  fullWidth
                >
                  {loadingSuggestions ? <CircularProgress size={20} /> : "I don't want it"}
                </Button>
                <Button
                  variant="outlined"
                  color="secondary"
                  onClick={handleNotPriority}
                  fullWidth
                >
                  Not a priority
                </Button>
              </Box>
            </Box>
          )}
        </CardContent>
      </Card>

      <ReflectionModal
        open={showReflectionModal}
        onClose={() => setShowReflectionModal(false)}
        onSubmit={handleReflectionSubmit}
        taskTitle={task.title}
      />

      <Dialog open={showPriorityCheck} onClose={() => {}}>
        <DialogTitle>Priority Check</DialogTitle>
        <DialogContent>
          <Typography variant="body1" gutterBottom>
            Is this task still a priority and the deadline is still near, or has something changed?
          </Typography>
          <Box display="flex" flexDirection="column" gap={1} mt={2}>
            <Button
              variant={priorityCheckAnswer === 'avoiding' ? 'contained' : 'outlined'}
              onClick={() => setPriorityCheckAnswer('avoiding')}
              fullWidth
            >
              Still priority, I'm just avoiding it
            </Button>
            <Button
              variant={priorityCheckAnswer === 'changed' ? 'contained' : 'outlined'}
              onClick={() => setPriorityCheckAnswer('changed')}
              fullWidth
            >
              Something has changed, it's no longer relevant
            </Button>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={handlePriorityCheckSubmit}
            variant="contained"
            disabled={!priorityCheckAnswer}
          >
            Continue
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default TaskView;

