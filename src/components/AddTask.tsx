import React, { useState, useEffect } from 'react';
import { TextField, Button, Box, IconButton, CircularProgress } from '@mui/material';
import { Mic, MicOff } from '@mui/icons-material';
import axios from 'axios';
import { db } from '@/services/firebaseService';
import { collection, addDoc } from 'firebase/firestore';
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';

const AddTask = () => {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const {
    transcript,
    listening,
    resetTranscript,
    browserSupportsSpeechRecognition
  } = useSpeechRecognition();

  useEffect(() => {
    if (transcript) {
      setInput(transcript);
    }
  }, [transcript]);

  const startListening = () => {
    resetTranscript();
    SpeechRecognition.startListening({ continuous: true });
  };

  const stopListening = () => {
    SpeechRecognition.stopListening();
  };

  const handleAddTask = async () => {
    const taskInput = input.trim();
    if (taskInput === '') return;

    setIsLoading(true);
    try {
      const response = await axios.post('/api/parseTask', { input: taskInput });
      const parsed = response.data;
      
      await addDoc(collection(db, "tasks"), parsed);
      setInput('');
      resetTranscript();
    } catch (error) {
      console.error("Error parsing or saving task: ", error);
      alert('Error adding task. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!browserSupportsSpeechRecognition) {
    return (
      <Box display="flex" alignItems="center" gap={1}>
        <TextField
          label="Enter your task..."
          variant="outlined"
          fullWidth
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => {
            if (e.key === 'Enter' && !isLoading) {
              handleAddTask();
            }
          }}
          disabled={isLoading}
        />
        <Button 
          onClick={handleAddTask} 
          variant="contained" 
          color="primary"
          disabled={isLoading}
        >
          {isLoading ? <CircularProgress size={20} /> : 'Add Task'}
        </Button>
      </Box>
    );
  }

  return (
    <Box display="flex" alignItems="center" gap={1}>
      <TextField
        label="Enter your task or use voice..."
        variant="outlined"
        fullWidth
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyPress={(e) => {
          if (e.key === 'Enter' && !isLoading) {
            handleAddTask();
          }
        }}
        disabled={isLoading}
        placeholder="e.g., 'I want to call hannah every two weeks' or 'text my boss back in the next hour'"
      />
      <IconButton
        onClick={listening ? stopListening : startListening}
        color={listening ? 'error' : 'primary'}
        disabled={isLoading}
        sx={{ 
          border: listening ? '2px solid' : 'none',
          borderColor: listening ? 'error.main' : 'transparent'
        }}
      >
        {listening ? <MicOff /> : <Mic />}
      </IconButton>
      <Button 
        onClick={handleAddTask} 
        variant="contained" 
        color="primary"
        disabled={isLoading || input.trim() === ''}
      >
        {isLoading ? <CircularProgress size={20} /> : 'Add Task'}
      </Button>
    </Box>
  );
};

export default AddTask;
