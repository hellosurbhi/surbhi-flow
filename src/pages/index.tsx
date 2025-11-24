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

  // Sort tasks by priority FIRST, then due date
  const sortTasks = (tasksList: Task[]): Task[] => {
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
  };

  useEffect(() => {
    if (!isClient) {
      console.log('Waiting for client-side rendering...');
      return;
    }
    
    console.log('Client-side ready, setting up Firebase listener...');
    let isMounted = true;
    let unsubscribe: (() => void) | null = null;
    
    try {
      console.log('Setting up Firebase listener for tasks...');
      console.log('Firebase db instance:', db);
      console.log('Firebase collection path: tasks');
      
      // Get all tasks (we'll filter and sort in the component)
      unsubscribe = onSnapshot(
        collection(db, "tasks"),
        (querySnapshot) => {
          console.log('=== FIREBASE SNAPSHOT RECEIVED ===');
          console.log('Snapshot size:', querySnapshot.size);
          console.log('Snapshot empty:', querySnapshot.empty);
          console.log('Snapshot metadata:', querySnapshot.metadata);
          
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
                console.log('Setting tasks state with', activeTasks.length, 'tasks');
                setTasks(activeTasks);
                
                // Sort and get the first task
                const sorted = sortTasks(activeTasks);
                console.log('Sorted tasks:', sorted.map(t => ({ title: t.title, priority: t.priority })));
                setCurrentTask(sorted.length > 0 ? sorted[0] : null);
                console.log('Current task set to:', sorted.length > 0 ? sorted[0].title : 'null');
              } else {
                console.log('Component unmounted, skipping state update');
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
          console.error('Error details:', {
            code: error.code,
            message: error.message,
            stack: error.stack
          });
        }
      );
      
      console.log('Firebase listener set up successfully');
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