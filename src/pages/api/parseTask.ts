import type { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';

const apiKey = process.env.GEMINI_API_KEY;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { input } = req.body;

  if (!input) {
    return res.status(400).json({ message: 'Input is required' });
  }

  try {
    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        contents: [
          {
            parts: [
              {
                text: `You are an assistant that converts natural language tasks into structured JSON. 
Extract the following information:
- title: A clear, concise task title
- description: Optional description if provided
- type: "single" for one-time tasks, "habit" for recurring tasks (look for words like "every", "weekly", "daily", "monthly", "repeat")
- frequency: For habits, extract frequency (e.g., "every 2 weeks", "daily", "weekly", "monthly"). For single tasks, use null
- deadline: Extract deadline description if mentioned (e.g., "in 1 hour", "tomorrow", "next week", "in 2 days"). Return as a string description or null. Do not convert to ISO format.
- priority: Extract priority level (1-5, where 5 is highest). Look for words like "urgent", "important", "high priority", "low priority", or infer from context like deadlines
- createdAt: Current timestamp in ISO format
- nextDueDate: For habits, calculate the next due date based on frequency. For single tasks, use deadline or null
- completed: false
- deferred: false
- reflection: null

Parse this task: "${input}"

Return ONLY valid JSON, no markdown, no explanation.`
              }
            ]
          }
        ],
        generationConfig: {
          responseMimeType: "application/json"
        }
      },
      {
        headers: {
          "Content-Type": "application/json"
        }
      }
    );
    
    const content = response.data.candidates[0].content.parts[0].text;
    const parsed = JSON.parse(content);
    
    // Calculate nextDueDate for habits
    if (parsed.type === 'habit' && parsed.frequency) {
      const now = new Date();
      const nextDue = new Date(now);
      
      // Parse frequency and calculate next due date
      const freq = parsed.frequency.toLowerCase();
      if (freq.includes('daily') || freq.includes('every day')) {
        nextDue.setDate(nextDue.getDate() + 1);
      } else if (freq.includes('weekly') || freq.includes('every week')) {
        nextDue.setDate(nextDue.getDate() + 7);
      } else if (freq.includes('every 2 weeks') || freq.includes('bi-weekly')) {
        nextDue.setDate(nextDue.getDate() + 14);
      } else if (freq.includes('monthly') || freq.includes('every month')) {
        nextDue.setMonth(nextDue.getMonth() + 1);
      } else {
        // Try to extract number of days
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
      parsed.nextDueDate = nextDue.toISOString();
    }
    
    // Parse deadline for single tasks
    if (parsed.type === 'single' && parsed.deadline) {
      const deadlineStr = String(parsed.deadline).toLowerCase();
      const now = new Date();
      const deadline = new Date(now);
      
      if (deadlineStr.includes('hour') || deadlineStr.includes('hr')) {
        const match = deadlineStr.match(/(\d+)\s*(hour|hr|hours|hrs)/);
        const hours = match ? parseInt(match[1]) : 1;
        deadline.setHours(deadline.getHours() + hours);
      } else if (deadlineStr.includes('minute') || deadlineStr.includes('min')) {
        const match = deadlineStr.match(/(\d+)\s*(minute|min|minutes|mins)/);
        const minutes = match ? parseInt(match[1]) : 30;
        deadline.setMinutes(deadline.getMinutes() + minutes);
      } else if (deadlineStr.includes('tomorrow')) {
        deadline.setDate(deadline.getDate() + 1);
        deadline.setHours(23, 59, 59);
      } else if (deadlineStr.includes('next week')) {
        deadline.setDate(deadline.getDate() + 7);
        deadline.setHours(23, 59, 59);
      } else if (deadlineStr.includes('today')) {
        deadline.setHours(23, 59, 59);
      } else if (deadlineStr.includes('day') && !deadlineStr.includes('to')) {
        const match = deadlineStr.match(/(\d+)\s*(day|days)/);
        if (match) {
          const days = parseInt(match[1]);
          deadline.setDate(deadline.getDate() + days);
          deadline.setHours(23, 59, 59);
        }
      }
      
      parsed.deadline = deadline.toISOString();
      parsed.nextDueDate = deadline.toISOString();
    } else if (parsed.type === 'single' && !parsed.deadline) {
      // No deadline specified, set nextDueDate to null
      parsed.nextDueDate = null;
    }
    
    // Set defaults
    parsed.createdAt = new Date().toISOString();
    parsed.completed = false;
    parsed.deferred = false;
    parsed.reflection = null;
    parsed.completedAt = null;
    parsed.lastCompletedAt = null;
    
    // Ensure priority is a number between 1-5
    if (!parsed.priority || parsed.priority < 1 || parsed.priority > 5) {
      parsed.priority = parsed.deadline ? 4 : 3; // Default to 4 if has deadline, 3 otherwise
    }
    
    res.status(200).json(parsed);
  } catch (error) {
    console.error('Error parsing task:', error);
    res.status(500).json({ message: 'Error parsing task', error: error instanceof Error ? error.message : 'Unknown error' });
  }
}
