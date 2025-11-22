import React, { useState, useEffect } from 'react';
import { Container, Typography, Box, Button, IconButton } from '@mui/material';
import { List as ListIcon } from '@mui/icons-material';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import TaskView from '@/components/TaskView';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '@/services/firebaseService';
import { parseISO, isPast } from 'date-fns';

// Dynamically import AddTask with SSR disabled to avoid hydration issues
const AddTask = dynamic(() => import('@/components/AddTask'), {
  ssr: false
});

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

const HomePage = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [currentTask, setCurrentTask] = useState<Task | null>(null);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Sort tasks by priority and due date (NOT by creation date)
  const sortTasks = (tasksList: Task[]): Task[] => {
    return [...tasksList].sort((a, b) => {
      // First, prioritize non-deferred tasks
      if (a.deferred !== b.deferred) {
        return a.deferred ? 1 : -1;
      }

      // Helper to get due date
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

      // PRIMARY SORT: Overdue status (overdue tasks first)
      if (aOverdue !== bOverdue) {
        return aOverdue ? -1 : 1; // Overdue tasks come first
      }

      // SECONDARY SORT: Due date (earlier deadlines first)
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

      // TERTIARY SORT: Priority (higher priority first - 5 before 1)
      const aPriority = a.priority || 2;
      const bPriority = b.priority || 2;
      if (aPriority !== bPriority) {
        return bPriority - aPriority; // Higher priority first
      }

      // If everything is equal, maintain stable sort (but don't use creation date)
      return 0;
    });
  };

  useEffect(() => {
    if (!isClient) return;
    
    let isMounted = true;
    let unsubscribe: (() => void) | null = null;
    
    try {
      // Get all tasks (we'll filter and sort in the component)
      unsubscribe = onSnapshot(
        collection(db, "tasks"),
        (querySnapshot) => {
          // Use requestAnimationFrame to batch state updates
          if (typeof window !== 'undefined' && window.requestAnimationFrame) {
            window.requestAnimationFrame(() => {
              if (!isMounted) return;
              
              const tasksData: Task[] = [];
              querySnapshot.forEach((doc) => {
                const data = doc.data();
                const task = { ...data, id: doc.id } as Task;
                console.log('Raw task from Firebase:', {
                  id: task.id,
                  title: task.title,
                  type: task.type,
                  completed: task.completed,
                  deferred: task.deferred,
                  priority: task.priority
                });
                tasksData.push(task);
              });

              console.log(`Total tasks from Firebase: ${tasksData.length}`);

              // Filter out completed single tasks, but keep habits
              // Also filter out deferred tasks from the main view (they'll show in the list)
              const activeTasks = tasksData.filter(task => {
                // Filter out completed single tasks
                if (task.completed === true && task.type === 'single') {
                  console.log('Filtering out completed single task:', task.id, task.title);
                  return false;
                }
                // Filter out deferred tasks from main view
                if (task.deferred === true) {
                  console.log('Filtering out deferred task:', task.id, task.title);
                  return false;
                }
                return true;
              });

              console.log(`Active tasks after filtering: ${activeTasks.length}`);

              if (isMounted) {
                setTasks(activeTasks);
                
                // Sort and get the first task
                const sorted = sortTasks(activeTasks);
                setCurrentTask(sorted.length > 0 ? sorted[0] : null);
              }
            });
          } else {
            // Fallback if requestAnimationFrame not available
            if (!isMounted) return;
            
            const tasksData: Task[] = [];
            querySnapshot.forEach((doc) => {
              const data = doc.data();
              const task = { ...data, id: doc.id } as Task;
              console.log('Raw task from Firebase (fallback):', {
                id: task.id,
                title: task.title,
                type: task.type,
                completed: task.completed,
                deferred: task.deferred,
                priority: task.priority
              });
              tasksData.push(task);
            });

            console.log(`Total tasks from Firebase (fallback): ${tasksData.length}`);

            // Filter out completed single tasks and deferred tasks from main view
            const activeTasks = tasksData.filter(task => {
              if (task.completed === true && task.type === 'single') {
                console.log('Filtering out completed single task (fallback):', task.id, task.title);
                return false;
              }
              if (task.deferred === true) {
                console.log('Filtering out deferred task (fallback):', task.id, task.title);
                return false;
              }
              return true;
            });

            console.log(`Active tasks after filtering (fallback): ${activeTasks.length}`);

            if (isMounted) {
              setTasks(activeTasks);
              const sorted = sortTasks(activeTasks);
              setCurrentTask(sorted.length > 0 ? sorted[0] : null);
            }
          }
        },
        (error) => {
          console.error('Firebase snapshot error:', error);
        }
      );
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
  }, [isClient]); // Only depend on isClient - this should only run once when isClient becomes true

  const handleTaskComplete = () => {
    // Task completion is handled in TaskView, this just refreshes the view
    // The useEffect will automatically update when Firestore changes
  };

  const handleTaskDeferred = () => {
    // Task deferral is handled in TaskView, this just refreshes the view
    // The useEffect will automatically update when Firestore changes
  };

  const handleTaskSkipped = () => {
    // Task skip is handled in TaskView, this just refreshes the view
    // The useEffect will automatically update when Firestore changes
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: '#F2F2F7', // Apple light gray background
        py: 4,
      }}
    >
      <Container maxWidth="md">
        <Box
          sx={{
            textAlign: 'center',
            mb: 5,
            position: 'relative',
          }}
        >
          <Link href="/tasks" passHref>
            <IconButton
              sx={{
                position: 'absolute',
                right: 0,
                top: '50%',
                transform: 'translateY(-50%)',
                backgroundColor: '#FFFFFF',
                color: '#007AFF',
                boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.08)',
                '&:hover': {
                  backgroundColor: '#F2F2F7',
                },
              }}
            >
              <ListIcon />
            </IconButton>
          </Link>
          <Typography
            variant="h3"
            component="h1"
            sx={{
              color: '#000000',
              fontWeight: 700,
              mb: 1,
              letterSpacing: '-0.02em',
            }}
          >
            FocusFlow
          </Typography>
          <Typography
            variant="h6"
            sx={{
              color: '#8E8E93',
              fontWeight: 400,
            }}
          >
            One task at a time. No overwhelm.
          </Typography>
        </Box>
        
        <Box
          sx={{
            mb: 4,
            '& > *': {
              animation: 'fadeInUp 0.5s ease-out',
            },
            '@keyframes fadeInUp': {
              from: {
                opacity: 0,
                transform: 'translateY(20px)',
              },
              to: {
                opacity: 1,
                transform: 'translateY(0)',
              },
            },
          }}
        >
          <AddTask />
        </Box>
        
        <Box
          sx={{
            '& > *': {
              animation: 'fadeInUp 0.6s ease-out 0.1s both',
            },
          }}
        >
          <TaskView
            task={currentTask}
            onTaskComplete={handleTaskComplete}
            onTaskDeferred={handleTaskDeferred}
            onTaskSkipped={handleTaskSkipped}
          />
        </Box>
      </Container>
    </Box>
  );
};

export default HomePage;