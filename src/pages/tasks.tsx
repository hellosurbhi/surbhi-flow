import React, { useState, useEffect, useCallback } from 'react';
import {
  Container,
  Typography,
  Box,
  Card,
  CardContent,
  Chip,
  Button,
  IconButton,
  Tabs,
  Tab,
} from '@mui/material';
import { ArrowBack, CheckCircle, Schedule, Delete } from '@mui/icons-material';
import Link from 'next/link';
import { collection, onSnapshot, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '@/services/firebaseService';
import { format, parseISO, isPast } from 'date-fns';

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
  createdAt?: string;
}

const TasksPage = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isClient, setIsClient] = useState(false);
  const [tabValue, setTabValue] = useState(0);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Sort tasks by priority (1 = highest, 5 = lowest) and deadline
  const sortTasks = useCallback((tasksList: Task[]): Task[] => {
    if (!tasksList || tasksList.length === 0) return [];
    
    return [...tasksList].sort((a, b) => {
      // First, prioritize non-deferred tasks
      if (a.deferred !== b.deferred) {
        return a.deferred ? 1 : -1;
      }

      // PRIMARY SORT: Priority (1 = highest, 5 = lowest)
      const aPriority = a.priority || 2;
      const bPriority = b.priority || 2;
      if (aPriority !== bPriority) {
        return aPriority - bPriority; // Lower number = higher priority (1 before 5)
      }

      // SECONDARY SORT: Due date (earlier deadlines first)
      const getDueDate = (task: Task): Date | null => {
        if (task.type === 'habit' && task.nextDueDate) {
          return parseISO(task.nextDueDate);
        }
        if (task.deadline) {
          return parseISO(task.deadline);
        }
        return null;
      };

      const aDue = getDueDate(a);
      const bDue = getDueDate(b);
      const aOverdue = aDue ? isPast(aDue) : false;
      const bOverdue = bDue ? isPast(bDue) : false;

      // Overdue tasks come first (among same priority)
      if (aOverdue !== bOverdue) {
        return aOverdue ? -1 : 1; // Overdue tasks come first
      }

      // If both are overdue or neither are, sort by earliest due date
      if (aDue && bDue) {
        const dateDiff = aDue.getTime() - bDue.getTime();
        if (dateDiff !== 0) {
          return dateDiff; // Earlier dates first
        }
      } else if (aDue && !bDue) {
        return -1; // Tasks with due dates come before those without
      } else if (!aDue && bDue) {
        return 1; // Tasks without due dates go after those with
      }

      // If everything is equal, maintain stable sort
      return 0;
    });
  }, []);

  useEffect(() => {
    if (!isClient) return;

    let isMounted = true;
    let unsubscribe: (() => void) | null = null;

    try {
      unsubscribe = onSnapshot(collection(db, "tasks"), (querySnapshot) => {
        if (!isMounted) return;

        const tasksData: Task[] = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          const task = { ...data, id: doc.id } as Task;
          tasksData.push(task);
        });

        if (isMounted) {
          setTasks(sortTasks(tasksData)); // Sort tasks immediately after fetching
        }
      });
    } catch (error) {
      console.error('Error setting up Firebase listener:', error);
    }

    return () => {
      isMounted = false;
      if (unsubscribe) {
        try {
          unsubscribe();
        } catch (error) {
          console.error('Error unsubscribing from Firebase:', error);
        }
      }
    };
  }, [isClient, sortTasks]);

  const handleComplete = async (taskId: string, task: Task) => {
    if (task.type === 'habit') {
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

      await updateDoc(doc(db, 'tasks', taskId), {
        lastCompletedAt: new Date().toISOString(),
        nextDueDate: nextDue.toISOString(),
        deferred: false,
      });
    } else {
      await updateDoc(doc(db, 'tasks', taskId), {
        completed: true,
        completedAt: new Date().toISOString(),
      });
    }
  };

  const handleDelete = async (taskId: string) => {
    if (confirm('Are you sure you want to delete this task?')) {
      await deleteDoc(doc(db, 'tasks', taskId));
    }
  };

  const getFilteredTasks = () => {
    let filtered: Task[] = [];
    switch (tabValue) {
      case 0: // Active
        filtered = tasks.filter(
          (task) => !task.completed && !task.deferred
        );
        break;
      case 1: // Completed
        filtered = tasks.filter((task) => task.completed === true);
        break;
      case 2: // Deferred
        filtered = tasks.filter((task) => task.deferred === true);
        break;
      default:
        filtered = tasks;
    }
    // Return sorted tasks (tasks are already sorted, but ensure filtered ones are too)
    return sortTasks(filtered);
  };

  const getDueDateDisplay = (task: Task) => {
    if (task.type === 'habit' && task.nextDueDate) {
      const dueDate = parseISO(task.nextDueDate);
      const isOverdue = isPast(dueDate);
      return {
        text: format(dueDate, 'MMM d, yyyy'),
        isOverdue,
      };
    } else if (task.deadline) {
      const dueDate = parseISO(task.deadline);
      const isOverdue = isPast(dueDate);
      return {
        text: format(dueDate, 'MMM d, yyyy h:mm a'),
        isOverdue,
      };
    }
    return null;
  };

  const filteredTasks = getFilteredTasks();
  const priorityColors = {
    5: 'error',
    4: 'warning',
    3: 'info',
    2: 'default',
    1: 'default',
  } as const;

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: '#F2F2F7',
        py: 4,
      }}
    >
      <Container maxWidth="md">
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={4}>
          <Link href="/" passHref>
            <IconButton
              sx={{
                backgroundColor: '#FFFFFF',
                color: '#007AFF',
                boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.08)',
                '&:hover': {
                  backgroundColor: '#F2F2F7',
                },
              }}
            >
              <ArrowBack />
            </IconButton>
          </Link>
          <Typography
            variant="h4"
            sx={{
              color: '#000000',
              fontWeight: 600,
            }}
          >
            All Tasks
          </Typography>
          <Box width={48} /> {/* Spacer for alignment */}
        </Box>

        <Tabs
          value={tabValue}
          onChange={(_, newValue) => setTabValue(newValue)}
          sx={{
            mb: 3,
            '& .MuiTab-root': {
              color: 'text.secondary',
              '&.Mui-selected': {
                color: 'primary.main',
              },
            },
          }}
        >
          <Tab label={`Active (${tasks.filter(t => !t.completed && !t.deferred).length})`} />
          <Tab label={`Completed (${tasks.filter(t => t.completed).length})`} />
          <Tab label={`Deferred (${tasks.filter(t => t.deferred).length})`} />
        </Tabs>

        <Box display="flex" flexDirection="column" gap={2}>
          {filteredTasks.length === 0 ? (
            <Card
              sx={{
                textAlign: 'center',
                py: 4,
                backgroundColor: '#FFFFFF',
                border: '2px dashed #C7C7CC',
              }}
            >
              <Typography variant="h6" color="text.secondary">
                No tasks in this category
              </Typography>
            </Card>
          ) : (
            filteredTasks.map((task) => {
              const dueDateInfo = getDueDateDisplay(task);
              return (
                <Card
                  key={task.id}
                  sx={{
                    backgroundColor: '#FFFFFF',
                    border: 'none',
                    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.08)',
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      boxShadow: '0px 4px 16px rgba(0, 0, 0, 0.12)',
                    },
                  }}
                >
                  <CardContent>
                    <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                      <Box flex={1}>
                        <Typography
                          variant="h6"
                          sx={{
                            fontWeight: 600,
                            textDecoration: task.completed ? 'line-through' : 'none',
                            opacity: task.completed ? 0.6 : 1,
                            mb: 1,
                          }}
                        >
                          {task.title}
                        </Typography>
                        {task.description && (
                          <Typography
                            variant="body2"
                            color="text.secondary"
                            sx={{
                              mb: 1.5,
                              opacity: task.completed ? 0.5 : 0.9,
                            }}
                          >
                            {task.description}
                          </Typography>
                        )}
                        <Box display="flex" gap={1} flexWrap="wrap" mb={2}>
                          <Chip
                            label={`Priority ${task.priority}`}
                            color={priorityColors[task.priority as keyof typeof priorityColors] || 'default'}
                            size="small"
                          />
                          {task.type === 'habit' && (
                            <Chip
                              label={`🔄 ${task.frequency || 'recurring'}`}
                              size="small"
                              sx={{
                                backgroundColor: '#E5F4FF',
                                color: '#007AFF',
                              }}
                            />
                          )}
                          {dueDateInfo && (
                            <Chip
                              icon={dueDateInfo.isOverdue ? <span>⚠️</span> : <span>📅</span>}
                              label={dueDateInfo.text}
                              color={dueDateInfo.isOverdue ? 'error' : 'info'}
                              size="small"
                            />
                          )}
                          {task.deferred && (
                            <Chip label="⏸️ Deferred" size="small" color="warning" />
                          )}
                          {task.completed && (
                            <Chip label="✓ Completed" size="small" color="success" />
                          )}
                        </Box>
                      </Box>
                      <Box display="flex" gap={1}>
                        {!task.completed && (
                          <IconButton
                            onClick={() => handleComplete(task.id, task)}
                            sx={{
                              color: 'success.main',
                              '&:hover': {
                                background: 'rgba(16, 185, 129, 0.1)',
                              },
                            }}
                          >
                            <CheckCircle />
                          </IconButton>
                        )}
                        <IconButton
                          onClick={() => handleDelete(task.id)}
                          sx={{
                            color: 'error.main',
                            '&:hover': {
                              background: 'rgba(239, 68, 68, 0.1)',
                            },
                          }}
                        >
                          <Delete />
                        </IconButton>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              );
            })
          )}
        </Box>
      </Container>
    </Box>
  );
};

export default TasksPage;

