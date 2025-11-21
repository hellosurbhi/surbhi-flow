import React, { useState, useEffect } from 'react';
import { Container, Typography, Box } from '@mui/material';
import AddTask from '@/components/AddTask';
import TaskView from '@/components/TaskView';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '@/services/firebaseService';
 
 const HomePage = () => {
  const [tasks, setTasks] = useState([]);
  const [currentTask, setCurrentTask] = useState(null);

  useEffect(() => {
    const q = query(collection(db, "tasks"), orderBy("priority", "desc"), orderBy("deadline", "asc"));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const tasksData = [];
      querySnapshot.forEach((doc) => {
        tasksData.push({ ...doc.data(), id: doc.id });
      });
      setTasks(tasksData);
      if (tasksData.length > 0) {
        setCurrentTask(tasksData[0]);
      } else {
        setCurrentTask(null);
      }
    });

    return () => unsubscribe();
  }, []);

   return (
    <Container maxWidth="md">
      <Box my={4}>
        <Typography variant="h4" component="h1" gutterBottom>
          FocusFlow
        </Typography>
        <AddTask />
        <Box mt={4}>
          <TaskView task={currentTask} />
        </Box>
      </Box>
    </Container>
   );
 };

export default HomePage;