import React, { useState, useEffect } from 'react';
import { Container, Typography, Box } from '@mui/material';
import AddTask from '@/components/AddTask';
import TaskView from '@/components/TaskView';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '@/services/firebaseService';
import { parseISO, isPast } from 'date-fns';

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

  // Sort tasks by priority and due date
  const sortTasks = (tasksList: Task[]): Task[] => {
    return [...tasksList].sort((a, b) => {
      // First, prioritize non-deferred tasks
      if (a.deferred !== b.deferred) {
        return a.deferred ? 1 : -1;
      }

      // Then by priority (higher first)
      if (a.priority !== b.priority) {
        return b.priority - a.priority;
      }

      // Then by due date (earlier first, but prioritize overdue)
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

      if (!aDue && !bDue) return 0;
      if (!aDue) return 1;
      if (!bDue) return -1;

      const aOverdue = isPast(aDue);
      const bOverdue = isPast(bDue);

      if (aOverdue !== bOverdue) {
        return aOverdue ? -1 : 1; // Overdue tasks first
      }

      return aDue.getTime() - bDue.getTime();
    });
  };

  useEffect(() => {
    // Get all tasks (we'll filter and sort in the component)
    const unsubscribe = onSnapshot(collection(db, "tasks"), (querySnapshot) => {
      const tasksData: Task[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        tasksData.push({ ...data, id: doc.id } as Task);
      });

      // Filter out completed single tasks, but keep habits
      const activeTasks = tasksData.filter(task => {
        if (task.completed && task.type === 'single') {
          return false;
        }
        return true;
      });

      setTasks(activeTasks);
      
      // Sort and get the first task
      const sorted = sortTasks(activeTasks);
      setCurrentTask(sorted.length > 0 ? sorted[0] : null);
    });

    return () => unsubscribe();
  }, []);

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
    <Container maxWidth="md">
      <Box my={4}>
        <Typography variant="h4" component="h1" gutterBottom>
          FocusFlow
        </Typography>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          One task at a time. No overwhelm.
        </Typography>
        <Box mt={3}>
          <AddTask />
        </Box>
        <Box mt={4}>
          <TaskView
            task={currentTask}
            onTaskComplete={handleTaskComplete}
            onTaskDeferred={handleTaskDeferred}
            onTaskSkipped={handleTaskSkipped}
          />
        </Box>
      </Box>
    </Container>
  );
};

export default HomePage;