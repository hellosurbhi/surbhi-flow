import React, { useState, useEffect, useRef } from 'react';
import { TextField, Button, Box, IconButton, Snackbar, Alert } from '@mui/material';
import { Mic, MicOff } from '@mui/icons-material';
import axios from 'axios';
import { db } from '@/services/firebaseService';
import { collection, addDoc, doc, updateDoc } from 'firebase/firestore';
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';

const AddTask = () => {
  const [input, setInput] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  
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
    if (taskInput === '') {
      return;
    }

    // OPTIMISTIC UI: Create task immediately with basic structure
    const optimisticTask = {
      title: taskInput,
      description: null,
      type: 'single' as const,
      frequency: null,
      deadline: null,
      priority: 2, // Default priority
      completed: false,
      deferred: false,
      reflection: null,
      createdAt: new Date().toISOString(),
      nextDueDate: null,
      completedAt: null,
      lastCompletedAt: null,
      isOptimistic: true, // Flag to identify optimistic tasks
    };

    // Step 1: Save optimistic task to Firebase immediately (fire-and-forget)
    let taskDocRef: any = null;
    try {
      taskDocRef = await addDoc(collection(db, "tasks"), optimisticTask);
      console.log('Optimistic task saved with ID:', taskDocRef.id);
    } catch (firebaseError) {
      console.error('Failed to save optimistic task:', firebaseError);
      alert('Failed to save task. Please try again.');
      return;
    }

    // Step 2: Reset form IMMEDIATELY (no waiting)
    setInput(''); // Clear input immediately
    console.log('Input cleared after task add');
    
    if (resetTranscript) {
      resetTranscript();
    }

    // Step 3: Show success notification immediately
    setSuccessMessage(`Task "${taskInput}" added! Organizing...`);
    setShowSuccess(true);
    console.log('Success notification shown');

    // Focus the input field again so user can immediately type next task
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }, 100);

    // Step 4: Parse in background (fire-and-forget, no blocking)
    axios.post('/api/parseTask', { input: taskInput }, {
      timeout: 10000
    })
      .then((response) => {
        const parsed = response.data;
        if (parsed && parsed.title && taskDocRef) {
        // Silently update the task with parsed data
        updateDoc(doc(db, 'tasks', taskDocRef.id), {
            ...parsed,
            isOptimistic: null, // Remove optimistic flag
          }).catch((err: any) => {
            console.error('Failed to update task with parsed data:', err);
          });
          
          // Update success message
          setSuccessMessage(`Task "${parsed.title}" organized!`);
          setShowSuccess(true);
        }
      })
      .catch((error) => {
        console.error('Background parsing failed (non-blocking):', error);
        // Task is already saved, so we just log the error
        // User can still see and use the task
      });
  };

  if (!browserSupportsSpeechRecognition) {
    return (
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          p: 2,
          borderRadius: 3,
          backgroundColor: '#FFFFFF',
          boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.08)',
        }}
      >
        <TextField
          inputRef={inputRef}
          label="Enter your task..."
          variant="outlined"
          fullWidth
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleAddTask();
            }
          }}
          sx={{
            '& .MuiOutlinedInput-root': {
              fontSize: '1.05rem',
            },
          }}
        />
        <Button
          onClick={handleAddTask}
          variant="contained"
          color="primary"
          size="large"
          sx={{
            minWidth: 140,
          }}
        >
          Add Task
        </Button>
        
        <Snackbar
          open={showSuccess}
          autoHideDuration={4000}
          onClose={() => setShowSuccess(false)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
          sx={{
            zIndex: 9999,
          }}
        >
          <Alert
            onClose={() => setShowSuccess(false)}
            severity="success"
            sx={{
              fontWeight: 600,
              fontSize: '16px',
              minWidth: '300px',
            }}
          >
            {successMessage}
          </Alert>
        </Snackbar>
      </Box>
    );
  }

  return (
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          p: 2,
          borderRadius: 3,
          backgroundColor: '#FFFFFF',
          boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.08)',
          transition: 'all 0.2s ease',
          '&:focus-within': {
            boxShadow: '0px 4px 16px rgba(0, 0, 0, 0.12)',
          },
        }}
      >
      <TextField
        inputRef={inputRef}
        label="Enter your task or use voice..."
        variant="outlined"
        fullWidth
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleAddTask();
          }
        }}
        placeholder="e.g., 'I want to call hannah every two weeks' or 'text my boss back in the next hour'"
        sx={{
          '& .MuiOutlinedInput-root': {
            fontSize: '1.05rem',
          },
        }}
      />
      <IconButton
        onClick={listening ? stopListening : startListening}
        sx={{
          width: 56,
          height: 56,
          backgroundColor: listening ? '#FF3B30' : '#007AFF',
          color: 'white',
          boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.1)',
          transition: 'all 0.2s ease',
          '&:hover': {
            backgroundColor: listening ? '#D70015' : '#0051D5',
            boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.15)',
          },
        }}
      >
        {listening ? <MicOff /> : <Mic />}
      </IconButton>
      <Button
        onClick={handleAddTask}
        variant="contained"
        color="primary"
        disabled={input.trim() === ''}
        size="large"
        sx={{
          minWidth: 140,
        }}
      >
        Add Task
      </Button>
      
        <Snackbar
          open={showSuccess}
          autoHideDuration={4000}
          onClose={() => setShowSuccess(false)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
          sx={{
            zIndex: 9999,
          }}
        >
          <Alert
            onClose={() => setShowSuccess(false)}
            severity="success"
            sx={{
              fontWeight: 600,
              fontSize: '16px',
              minWidth: '300px',
            }}
          >
            {successMessage}
          </Alert>
        </Snackbar>
    </Box>
  );
};

export default AddTask;
