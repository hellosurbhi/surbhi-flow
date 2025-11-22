import React, { useState, useEffect } from 'react';
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
  // All hooks must be called before any conditional returns
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState('');
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [showReflectionModal, setShowReflectionModal] = useState(false);
  const [showPriorityCheck, setShowPriorityCheck] = useState(false);
  const [priorityCheckAnswer, setPriorityCheckAnswer] = useState('');
  const [dueDateInfo, setDueDateInfo] = useState<{ text: string; isOverdue: boolean } | null>(null);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient || !task) return;
    
    if (task.type === 'habit' && task.nextDueDate) {
      const dueDate = parseISO(task.nextDueDate);
      const isOverdue = isPast(dueDate);
      setDueDateInfo({
        text: format(dueDate, 'MMM d, yyyy'),
        isOverdue
      });
    } else if (task.deadline) {
      const dueDate = parseISO(task.deadline);
      const isOverdue = isPast(dueDate);
      setDueDateInfo({
        text: format(dueDate, 'MMM d, yyyy h:mm a'),
        isOverdue
      });
    } else {
      setDueDateInfo(null);
    }
  }, [task, isClient]);

  // Now we can do conditional returns after all hooks
  // Show skeleton loader while waiting for first task
  if (!task) {
    return (
      <Card
        sx={{
          minHeight: '450px',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(236, 72, 153, 0.1) 100%)',
          border: '2px dashed rgba(148, 163, 184, 0.2)',
        }}
      >
        <Box textAlign="center">
          <Typography
            variant="h5"
            color="text.secondary"
            sx={{
              opacity: 0.6,
              fontWeight: 500,
            }}
          >
            ✨ No tasks for now
          </Typography>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{
              mt: 1,
              opacity: 0.5,
            }}
          >
            Add a task to get started!
          </Typography>
        </Box>
      </Card>
    );
  }

  // Check if task is being organized (optimistic)
  const isOrganizing = (task as any).isOptimistic === true;

  const handleDontWantIt = async () => {
    setLoadingSuggestions(true);
    try {
      const response = await axios.post('/api/getSuggestions', {
        taskTitle: task.title,
        taskDescription: task.description
      }, {
        timeout: 10000
      });
      
      if (response.data && response.data.suggestion) {
        setSuggestions(response.data.suggestion);
      } else {
        throw new Error('Invalid response format');
      }
      setShowSuggestions(true);
    } catch (error: any) {
      console.error('Error getting suggestions:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Unknown error';
      setSuggestions(`Sorry, I couldn't generate suggestions right now (${errorMessage}). Try breaking the task into smaller steps or setting a timer for 5 minutes to just get started.`);
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
    if (task?.id) {
      if (task.type === 'habit') {
        // For habits, update nextDueDate based on frequency
        const now = new Date();
        const nextDue = new Date(now);
        const freq = task.frequency?.toLowerCase() || '';
        
        // Parse day of week (sunday, monday, etc.) and time
        const daysOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        let targetDay = -1;
        let targetHour = 9; // Default to 9am
        let targetMinute = 0;
        
        // Check for day of week
        for (let i = 0; i < daysOfWeek.length; i++) {
          if (freq.includes(daysOfWeek[i])) {
            targetDay = i;
            break;
          }
        }
        
        // Parse time (9am, 10pm, etc.)
        const timeMatch = freq.match(/(\d{1,2})\s*(am|pm|:(\d{2}))/i);
        if (timeMatch) {
          let hour = parseInt(timeMatch[1]);
          const ampm = timeMatch[2]?.toLowerCase();
          if (ampm === 'pm' && hour !== 12) hour += 12;
          if (ampm === 'am' && hour === 12) hour = 0;
          targetHour = hour;
          if (timeMatch[3]) {
            targetMinute = parseInt(timeMatch[3]);
          }
        }
        
        // If specific day of week is mentioned
        if (targetDay !== -1) {
          const currentDay = now.getDay();
          let daysUntilTarget = targetDay - currentDay;
          
          // If the target day has passed this week, schedule for next week
          if (daysUntilTarget < 0 || (daysUntilTarget === 0 && (now.getHours() > targetHour || (now.getHours() === targetHour && now.getMinutes() >= targetMinute)))) {
            daysUntilTarget += 7;
          }
          
          nextDue.setDate(nextDue.getDate() + daysUntilTarget);
          nextDue.setHours(targetHour, targetMinute, 0, 0);
        } else if (freq.includes('daily') || freq.includes('every day')) {
          nextDue.setDate(nextDue.getDate() + 1);
          if (timeMatch) {
            nextDue.setHours(targetHour, targetMinute, 0, 0);
          }
        } else if (freq.includes('weekly') || freq.includes('every week')) {
          nextDue.setDate(nextDue.getDate() + 7);
          if (timeMatch) {
            nextDue.setHours(targetHour, targetMinute, 0, 0);
          }
        } else if (freq.includes('every 2 weeks') || freq.includes('bi-weekly')) {
          nextDue.setDate(nextDue.getDate() + 14);
          if (timeMatch) {
            nextDue.setHours(targetHour, targetMinute, 0, 0);
          }
        } else if (freq.includes('monthly') || freq.includes('every month')) {
          nextDue.setMonth(nextDue.getMonth() + 1);
          if (timeMatch) {
            nextDue.setHours(targetHour, targetMinute, 0, 0);
          }
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
            if (timeMatch) {
              nextDue.setHours(targetHour, targetMinute, 0, 0);
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
  const priorityColors = {
    5: 'error',
    4: 'warning',
    3: 'info',
    2: 'default',
    1: 'default'
  } as const;

  return (
    <>
      <Card
        sx={{
          minHeight: '450px',
          backgroundColor: '#FFFFFF',
          border: 'none',
          boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.08)',
          transition: 'all 0.2s ease',
          '&:hover': {
            boxShadow: '0px 4px 16px rgba(0, 0, 0, 0.12)',
          },
        }}
      >
        <CardContent sx={{ p: 4 }}>
          <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={3}>
            <Typography
              variant="h4"
              component="div"
              sx={{
                flexGrow: 1,
                fontWeight: 600,
                color: '#000000',
                pr: 2,
              }}
            >
              {task.title}
            </Typography>
            <Chip
              label={`Priority ${task.priority}`}
              color={priorityColors[task.priority as keyof typeof priorityColors] || 'default'}
              size="medium"
              sx={{
                fontWeight: 600,
                fontSize: '0.85rem',
              }}
            />
          </Box>

          {task.description && (
            <Typography
              variant="body1"
              color="text.secondary"
              sx={{
                mb: 3,
                fontSize: '1.05rem',
                lineHeight: 1.6,
                opacity: 0.9,
              }}
            >
              {task.description}
            </Typography>
          )}

          {isOrganizing && (
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{
                mb: 2,
                fontStyle: 'italic',
                opacity: 0.7,
              }}
            >
              ⏳ Organizing your task...
            </Typography>
          )}
          
          <Box display="flex" gap={1.5} flexWrap="wrap" mb={4}>
            {task.type === 'habit' && (
              <Chip
                label={`🔄 Habit: ${task.frequency || 'recurring'}`}
                size="medium"
                sx={{
                  backgroundColor: '#E5F4FF',
                  color: '#007AFF',
                  fontWeight: 500,
                }}
              />
            )}
            {dueDateInfo && (
              <Chip
                icon={dueDateInfo.isOverdue ? <span>⚠️</span> : <span>📅</span>}
                label={`Due: ${dueDateInfo.text}`}
                color={dueDateInfo.isOverdue ? 'error' : 'info'}
                size="medium"
                sx={{
                  fontWeight: 500,
                }}
              />
            )}
          </Box>

          {showSuggestions ? (
            <Box>
              <Alert
                severity="info"
                sx={{
                  mb: 3,
                  borderRadius: 2,
                  backgroundColor: '#E5F4FF',
                  border: '1px solid #007AFF',
                  '& .MuiAlert-icon': {
                    color: '#007AFF',
                  },
                }}
              >
                <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600, mb: 1.5 }}>
                  💡 Here are some strategies to help you get started:
                </Typography>
                <Typography
                  variant="body2"
                  component="div"
                  sx={{
                    whiteSpace: 'pre-line',
                    lineHeight: 1.7,
                    opacity: 0.95,
                  }}
                >
                  {suggestions}
                </Typography>
              </Alert>
              <Box display="flex" gap={2}>
                <Button
                  variant="contained"
                  color="primary"
                  onClick={handleComplete}
                  fullWidth
                  size="large"
                  sx={{
                    fontWeight: 600,
                    py: 1.5,
                  }}
                >
                  ✨ I'll do it now
                </Button>
                <Button
                  variant="outlined"
                  color="secondary"
                  onClick={handleStillDontWantIt}
                  fullWidth
                  size="large"
                  sx={{
                    borderWidth: 2,
                    fontWeight: 600,
                    py: 1.5,
                  }}
                >
                  Still not ready
                </Button>
              </Box>
            </Box>
          ) : (
            <Box display="flex" flexDirection="column" gap={2.5}>
              <Button
                variant="contained"
                color="success"
                size="large"
                onClick={handleComplete}
                fullWidth
                sx={{
                  fontWeight: 600,
                  fontSize: '17px',
                  py: 2,
                }}
              >
                ✓ Complete Task
              </Button>
              <Box display="flex" gap={2}>
                <Button
                  variant="outlined"
                  color="error"
                  onClick={handleDontWantIt}
                  disabled={loadingSuggestions}
                  fullWidth
                  size="large"
                  sx={{
                    borderWidth: 2,
                    fontWeight: 600,
                    py: 1.5,
                  }}
                >
                  {loadingSuggestions ? (
                    <CircularProgress size={20} />
                  ) : (
                    "😓 I don't want to do it right now"
                  )}
                </Button>
                <Button
                  variant="outlined"
                  color="secondary"
                  onClick={handleNotPriority}
                  fullWidth
                  size="large"
                  sx={{
                    borderWidth: 2,
                    fontWeight: 600,
                    py: 1.5,
                  }}
                >
                  ⏸️ Not a priority
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

      <Dialog
        open={showPriorityCheck}
        onClose={() => {}}
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
          🔍 Priority Check
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <Typography
            variant="body1"
            gutterBottom
            sx={{
              mb: 3,
              lineHeight: 1.7,
              fontSize: '1.05rem',
            }}
          >
            Is this task still a priority and the deadline is still near, or has something changed?
          </Typography>
          <Box display="flex" flexDirection="column" gap={2} mt={2}>
            <Button
              variant={priorityCheckAnswer === 'avoiding' ? 'contained' : 'outlined'}
              onClick={() => setPriorityCheckAnswer('avoiding')}
              fullWidth
              size="large"
              sx={{
                fontWeight: 600,
                py: 1.5,
              }}
            >
              😓 Still priority, I'm just avoiding it
            </Button>
            <Button
              variant={priorityCheckAnswer === 'changed' ? 'contained' : 'outlined'}
              onClick={() => setPriorityCheckAnswer('changed')}
              fullWidth
              size="large"
              sx={{
                fontWeight: 600,
                py: 1.5,
              }}
            >
              ✨ Something has changed, it's no longer relevant
            </Button>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 2 }}>
          <Button
            onClick={handlePriorityCheckSubmit}
            variant="contained"
            disabled={!priorityCheckAnswer}
            sx={{
              fontWeight: 600,
              px: 4,
            }}
          >
            Continue
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default TaskView;

