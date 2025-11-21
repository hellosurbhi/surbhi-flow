import React from 'react';
import { Card, CardContent, Typography, Button, Box } from '@mui/material';

const TaskView = ({ task }) => {
  if (!task) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="100%">
        <Typography variant="h6">No tasks for now, add one!</Typography>
      </Box>
    );
  }

  return (
    <Card>
      <CardContent>
        <Typography variant="h5" component="div">
          {task.title}
        </Typography>
        <Typography sx={{ mb: 1.5 }} color="text.secondary">
          Due: {task.deadline || 'No deadline'}
        </Typography>
        <Typography variant="body2">
          {task.description}
        </Typography>
        <Box mt={2}>
          <Button variant="contained" color="primary" style={{ marginRight: '10px' }}>
            I don't want it
          </Button>
          <Button variant="outlined" color="secondary">
            Not a priority
          </Button>
        </Box>
      </CardContent>
    </Card>
  );
};

export default TaskView;
