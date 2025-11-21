import React, { useState } from 'react';
import { TextField, Button, Box } from '@mui/material';
import axios from 'axios'; // Import axios
import { db } from '@/services/firebaseService';
import { collection, addDoc } from 'firebase/firestore';

const AddTask = () => {
  const [input, setInput] = useState('');

  const handleAddTask = async () => {
    if (input.trim() !== '') {
      try {
        // Call the API route instead of the service directly
        const response = await axios.post('/api/parseTask', { input });
        const parsedString = response.data;
        
        const parsed = JSON.parse(parsedString);
        await addDoc(collection(db, "tasks"), parsed);
      } catch (error) {
        console.error("Error parsing or saving task: ", error);
        // Handle the error, maybe show a notification to the user
      }
      setInput('');
    }
  };

  return (
    <Box display="flex" alignItems="center">
      <TextField
        label="Enter your task..."
        variant="outlined"
        fullWidth
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyPress={(e) => {
          if (e.key === 'Enter') {
            handleAddTask();
          }
        }}
      />
      <Button onClick={handleAddTask} variant="contained" color="primary" style={{ marginLeft: '10px' }}>
        Add Task
      </Button>
    </Box>
  );
};

export default AddTask;
