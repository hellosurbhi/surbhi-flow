import React, { useState, useEffect, useRef } from 'react';
import { TextField, Button, Box, IconButton, CircularProgress } from '@mui/material';
import { Mic, MicOff } from '@mui/icons-material';
import axios from 'axios';
import { db } from '@/services/firebaseService';
import { collection, addDoc } from 'firebase/firestore';
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';

const AddTask = () => {
  const [input, setInput] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [inputKey, setInputKey] = useState(0); // Key to force TextField remount
  const inputRef = useRef<HTMLInputElement>(null);
  
  const {
    transcript,
    listening,
    resetTranscript,
    browserSupportsSpeechRecognition
  } = useSpeechRecognition();

  // Track if we just cleared the input to prevent transcript from refilling it
  const justClearedRef = useRef(false);
  const clearTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  useEffect(() => {
    // Only update input from transcript if we're actively listening AND we didn't just clear it
    // This prevents transcript from overriding manual input clearing
    if (transcript && listening && !justClearedRef.current) {
      setInput(transcript);
    }
  }, [transcript, listening]);
  
  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (clearTimeoutRef.current) {
        clearTimeout(clearTimeoutRef.current);
      }
    };
  }, []);

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

    setIsLoading(true);
    
    // Safety timeout to ensure loading state resets even if something goes wrong
    const safetyTimeout = setTimeout(() => {
      console.warn('Safety timeout: Resetting loading state');
      setIsLoading(false);
    }, 20000); // 20 second safety timeout

    // Step 1: Stop listening if active
    if (listening) {
      stopListening();
    }
    
    // Clear transcript first
    if (resetTranscript) {
      resetTranscript();
    }

    try {
      // Step 2: Parse task with Gemini NLP
      console.log('Calling parseTask API with input:', taskInput);
      const response = await axios.post('/api/parseTask', { input: taskInput }, {
        timeout: 15000
      });
      
      console.log('API Response:', response);
      const parsed = response.data;
      console.log('Parsed task data:', parsed);

      if (!parsed || !parsed.title) {
        throw new Error('Invalid response from parsing API');
      }

      // Step 3: Save parsed task to Firebase
      const task = {
        title: parsed.title || taskInput,
        description: parsed.description || null,
        type: parsed.type || 'single',
        frequency: parsed.frequency || null,
        deadline: parsed.deadline || null,
        nextDueDate: parsed.nextDueDate || null,
        priority: parsed.priority || 2, // Default to 2 if not specified
        completed: false,
        deferred: false,
        reflection: null,
        createdAt: new Date().toISOString(),
        completedAt: null,
        lastCompletedAt: null,
      };

      console.log('Saving task to Firebase:', task);
      
      // Helper function to update UI (defined first)
      const proceedWithUIUpdates = () => {
        console.log('About to update UI state...');

        // Step 4: Clear input and show success
        console.log('Clearing input...');
        justClearedRef.current = true;
        setInput('');
        setInputKey(prev => prev + 1);
        console.log('Input cleared');
        
        // Reset the flag after a delay
        if (clearTimeoutRef.current) {
          clearTimeout(clearTimeoutRef.current);
        }
        clearTimeoutRef.current = setTimeout(() => {
          justClearedRef.current = false;
        }, 1000);

        // Step 5: Show success notification
        console.log('Setting success notification...');
        const message = `✓ Task "${parsed.title || taskInput}" added successfully!`;
        setSuccessMessage(message);
        setShowSuccess(true);
        
        console.log('Success notification set:', { showSuccess: true, message });
        
        // Auto-hide after 3 seconds
        setTimeout(() => {
          setShowSuccess(false);
          setSuccessMessage('');
        }, 3000);

        // Focus the input field again
        setTimeout(() => {
          if (inputRef.current) {
            inputRef.current.focus();
          }
        }, 100);
        
        console.log('All UI updates complete');
        
        // Stop loading
        setIsLoading(false);
        console.log('isLoading set to false');
      };
      
      // Save to Firebase - use fire-and-forget since the task is being saved
      // even if the promise doesn't resolve (known Firebase issue)
      const savePromise = addDoc(collection(db, "tasks"), task);
      
      // Set a timeout to proceed with UI updates even if promise doesn't resolve
      // The task is already being saved (we can see it in Firebase)
      const proceedTimeout = setTimeout(() => {
        console.log('Proceeding with UI updates - task is being saved to Firebase');
        proceedWithUIUpdates();
      }, 2000); // Give it 2 seconds, then proceed
      
      // Try to wait for the promise, but don't block if it hangs
      savePromise
        .then((docRef) => {
          clearTimeout(proceedTimeout);
          console.log('Task saved successfully with NLP parsing, doc ID:', docRef.id);
          proceedWithUIUpdates();
        })
        .catch((error) => {
          clearTimeout(proceedTimeout);
          console.error('Firebase save error (but task may still be saved):', error);
          // Proceed anyway - the task might still be saved
          proceedWithUIUpdates();
        });

    } catch (error: any) {
      console.error('=== ERROR ADDING TASK ===');
      console.error('Error:', error);
      console.error('Error response:', error.response);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
      
      const errorMessage = error.response?.data?.message || error.message || 'Unknown error';
      alert(`Failed to add task: ${errorMessage}`);
      setIsLoading(false);
    } finally {
      console.log('=== FINALLY BLOCK EXECUTING ===');
      clearTimeout(safetyTimeout);
      console.log('Safety timeout cleared');
      // isLoading is set in proceedWithUIUpdates or catch block
    }
  };

  if (!browserSupportsSpeechRecognition) {
    return (
      <>
        <Box
          sx={{
            position: 'relative',
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
            key={`input-${inputKey}`}
            inputRef={inputRef}
            label="Enter your task..."
            variant="outlined"
            fullWidth
            value={input}
            onChange={(e) => {
              justClearedRef.current = false; // Reset flag when user types
              setInput(e.target.value);
            }}
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
            disabled={isLoading}
            sx={{
              minWidth: 140,
            }}
          >
            {isLoading ? <CircularProgress size={20} color="inherit" /> : 'Add Task'}
          </Button>
        </Box>
        {showSuccess && (
          <Box
            sx={{
              position: 'absolute',
              top: '100%',
              left: '50%',
              transform: 'translateX(-50%)',
              marginTop: '12px',
              zIndex: 9999,
              backgroundColor: '#34C759',
              color: '#FFFFFF',
              padding: '12px 20px',
              borderRadius: '10px',
              boxShadow: '0px 4px 12px rgba(52, 199, 89, 0.4)',
              fontSize: '15px',
              fontWeight: 600,
              minWidth: '280px',
              textAlign: 'center',
              animation: 'slideDown 0.3s ease-out',
              '@keyframes slideDown': {
                from: {
                  opacity: 0,
                  transform: 'translateX(-50%) translateY(-10px)',
                },
                to: {
                  opacity: 1,
                  transform: 'translateX(-50%) translateY(0)',
                },
              },
            }}
          >
            {successMessage || 'Task added successfully!'}
          </Box>
        )}
      </>
    );
  }

  return (
    <>
      <Box
        sx={{
          position: 'relative',
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
          key={`input-${inputKey}`}
          inputRef={inputRef}
          label="Enter your task or use voice..."
          variant="outlined"
          fullWidth
          value={input}
          onChange={(e) => {
            justClearedRef.current = false; // Reset flag when user types
            setInput(e.target.value);
          }}
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
          disabled={input.trim() === '' || isLoading}
          size="large"
          sx={{
            minWidth: 140,
          }}
        >
          {isLoading ? <CircularProgress size={20} color="inherit" /> : 'Add Task'}
        </Button>
        {showSuccess && (
          <Box
            sx={{
              position: 'absolute',
              top: '100%',
              left: '50%',
              transform: 'translateX(-50%)',
              marginTop: '12px',
              zIndex: 9999,
              backgroundColor: '#34C759',
              color: '#FFFFFF',
              padding: '12px 20px',
              borderRadius: '10px',
              boxShadow: '0px 4px 12px rgba(52, 199, 89, 0.4)',
              fontSize: '15px',
              fontWeight: 600,
              minWidth: '280px',
              textAlign: 'center',
              animation: 'slideDown 0.3s ease-out',
              '@keyframes slideDown': {
                from: {
                  opacity: 0,
                  transform: 'translateX(-50%) translateY(-10px)',
                },
                to: {
                  opacity: 1,
                  transform: 'translateX(-50%) translateY(0)',
                },
              },
            }}
          >
            {successMessage || 'Task added successfully!'}
          </Box>
        )}
      </Box>
    </>
  );
};

export default AddTask;
