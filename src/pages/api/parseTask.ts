import type { NextApiRequest, NextApiResponse } from 'next';
import { GoogleGenAI } from '@google/genai';

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

  if (!apiKey) {
    console.error('GEMINI_API_KEY is not set');
    return res.status(500).json({ message: 'API key not configured' });
  }

  try {
    // Initialize with API key
    console.log('Initializing GoogleGenAI with API key (length):', apiKey ? apiKey.length : 0);
    const ai = new GoogleGenAI({ apiKey });
    console.log('GoogleGenAI initialized successfully');

    const prompt = `You are an intelligent task parser like Todoist. Parse natural language into structured JSON.

EXAMPLES:
- "call parents everyday priority one" → {title: "call parents", type: "habit", frequency: "daily", priority: 1}
- "text boss back in 1 hour priority 5" → {title: "text boss back", type: "single", frequency: null, deadline: "in 1 hour", priority: 5}
- "protein meal prep every sunday 9am" → {title: "protein meal prep", type: "habit", frequency: "every sunday 9am", priority: 2}
- "review code urgent" → {title: "review code", type: "single", frequency: null, deadline: null, priority: 5}

RULES:
1. title: Extract the main task action. Remove frequency/priority words from title.
2. type: "habit" if you see: every, daily, everyday, weekly, monthly, repeat, recurring, each day/week/month, or day names (sunday, monday, etc.). Otherwise "single".
3. frequency: For habits, extract EXACTLY as mentioned: "daily", "everyday", "every day", "every sunday", "every monday 9am", "every 2 weeks", "weekly", "monthly", etc. For single tasks: null.
4. deadline: Only for single tasks with time constraints: "in 1 hour", "tomorrow", "next week", "by friday", etc. For habits, use null.
5. priority: Extract from explicit mentions:
   - "priority 1" or "priority one" → 1
   - "priority 2" or "priority two" → 2
   - "priority 3" or "priority three" → 3
   - "priority 4" or "priority four" → 4
   - "priority 5" or "priority five" → 5
   - "urgent" or "high priority" → 5
   - "important" → 4
   - "low priority" → 1
   - If not mentioned, default to 2

Parse: "${input}"

Return ONLY valid JSON: {title, description (optional), type, frequency (null for single), deadline (null if not mentioned), priority}. No markdown, no explanation.`;

    console.log('Calling Gemini API (using fast model)');
    console.log('Input prompt length:', prompt.length);
    // Use gemini-2.5-flash-lite for faster responses
    let response;
    try {
      response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-lite',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          temperature: 0.3, // Lower temperature for more consistent, faster responses
        },
      });
      console.log('Gemini API call completed successfully');
    } catch (apiError: any) {
      console.error('=== GEMINI API CALL ERROR ===');
      console.error('Error type:', typeof apiError);
      console.error('Error:', apiError);
      console.error('Error message:', apiError?.message);
      console.error('Error name:', apiError?.name);
      console.error('Error code:', apiError?.code);
      console.error('Error stack:', apiError?.stack);
      throw apiError; // Re-throw to be caught by outer catch
    }
    
    console.log('Got response from Gemini, response type:', typeof response);
    console.log('Response keys:', response ? Object.keys(response) : 'null');
    
    // Handle different response structures
    let content: string;
    
    if (response && typeof response === 'object') {
      // Try different possible response structures
      if ('text' in response && typeof response.text === 'string') {
        content = response.text;
      } else if ('response' in response && response.response && 'text' in response.response) {
        content = (response.response as any).text;
      } else if ('content' in response) {
        const responseContent = (response as any).content;
        if (typeof responseContent === 'string') {
          content = responseContent;
        } else if (responseContent && typeof responseContent === 'object' && 'text' in responseContent) {
          content = responseContent.text;
        } else {
          console.error('Response structure:', JSON.stringify(response, null, 2));
          throw new Error('Unexpected response structure - content is not a string');
        }
      } else {
        console.error('Response structure:', JSON.stringify(response, null, 2));
        throw new Error('Unexpected response structure from Gemini API');
      }
    } else {
      throw new Error('Invalid response from Gemini API');
    }
    
    if (!content || content.trim().length === 0) {
      console.error('Empty content received');
      return res.status(500).json({ 
        message: 'Empty content received from API',
      });
    }
    
    console.log('Got text content, length:', content?.length);

    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch (parseError) {
      console.error('Failed to parse JSON from Gemini:', content);
      console.error('Parse error:', parseError);
      return res.status(500).json({ 
        message: 'Failed to parse JSON response',
        rawContent: content.substring(0, 200) // First 200 chars for debugging
      });
    }
    
    // Calculate nextDueDate for habits
    if (parsed.type === 'habit' && parsed.frequency) {
      const now = new Date();
      const nextDue = new Date(now);
      
      // Parse frequency and calculate next due date
      const freq = parsed.frequency.toLowerCase();
      
      // Parse day of week (sunday, monday, etc.) and time
      const daysOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      let targetDay = -1;
      let targetHour = 9; // Default to 9am
      let targetMinute = 0;
      
      // Check for day of week
      for (let i = 0; i < daysOfWeek.length; i++) {
        if (freq.includes(daysOfWeek[i])) {
          targetDay = i;
          break;
        }
      }
      
      // Parse time (9am, 10pm, etc.)
      const timeMatch = freq.match(/(\d{1,2})\s*(am|pm|:(\d{2}))/i);
      if (timeMatch) {
        let hour = parseInt(timeMatch[1]);
        const ampm = timeMatch[2]?.toLowerCase();
        if (ampm === 'pm' && hour !== 12) hour += 12;
        if (ampm === 'am' && hour === 12) hour = 0;
        targetHour = hour;
        if (timeMatch[3]) {
          targetMinute = parseInt(timeMatch[3]);
        }
      }
      
      // If specific day of week is mentioned
      if (targetDay !== -1) {
        const currentDay = now.getDay();
        let daysUntilTarget = targetDay - currentDay;
        
        // If the target day has passed this week, schedule for next week
        if (daysUntilTarget < 0 || (daysUntilTarget === 0 && (now.getHours() > targetHour || (now.getHours() === targetHour && now.getMinutes() >= targetMinute)))) {
          daysUntilTarget += 7;
        }
        
        nextDue.setDate(nextDue.getDate() + daysUntilTarget);
        nextDue.setHours(targetHour, targetMinute, 0, 0);
      } else if (freq.includes('daily') || freq.includes('everyday') || freq.includes('every day')) {
        // Daily habits - schedule for tomorrow
        nextDue.setDate(nextDue.getDate() + 1);
        if (timeMatch) {
          nextDue.setHours(targetHour, targetMinute, 0, 0);
        } else {
          // Default to 9am if no time specified
          nextDue.setHours(9, 0, 0, 0);
        }
      } else if (freq.includes('weekly') || freq.includes('every week')) {
        nextDue.setDate(nextDue.getDate() + 7);
        if (timeMatch) {
          nextDue.setHours(targetHour, targetMinute, 0, 0);
        } else {
          nextDue.setHours(9, 0, 0, 0);
        }
      } else if (freq.includes('every 2 weeks') || freq.includes('bi-weekly')) {
        nextDue.setDate(nextDue.getDate() + 14);
        if (timeMatch) {
          nextDue.setHours(targetHour, targetMinute, 0, 0);
        } else {
          nextDue.setHours(9, 0, 0, 0);
        }
      } else if (freq.includes('monthly') || freq.includes('every month')) {
        nextDue.setMonth(nextDue.getMonth() + 1);
        if (timeMatch) {
          nextDue.setHours(targetHour, targetMinute, 0, 0);
        } else {
          nextDue.setHours(9, 0, 0, 0);
        }
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
          if (timeMatch) {
            nextDue.setHours(targetHour, targetMinute, 0, 0);
          } else {
            nextDue.setHours(9, 0, 0, 0);
          }
        } else {
          // Default: daily if no pattern matched
          nextDue.setDate(nextDue.getDate() + 1);
          nextDue.setHours(9, 0, 0, 0);
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
    
    // Set defaults - ensure all required fields are present
    parsed.createdAt = new Date().toISOString();
    parsed.completed = parsed.completed !== undefined ? parsed.completed : false;
    parsed.deferred = parsed.deferred !== undefined ? parsed.deferred : false;
    parsed.reflection = parsed.reflection || null;
    parsed.completedAt = parsed.completedAt || null;
    parsed.lastCompletedAt = parsed.lastCompletedAt || null;
    
    // Ensure type is set (default to 'single' if not specified)
    if (!parsed.type || (parsed.type !== 'single' && parsed.type !== 'habit')) {
      parsed.type = 'single';
    }
    
    // Ensure priority is a number between 1-5, default to 2 if not specified
    if (!parsed.priority || parsed.priority < 1 || parsed.priority > 5) {
      parsed.priority = 2; // Default priority is 2
    }
    
    // Ensure title exists
    if (!parsed.title) {
      throw new Error('Task title is required');
    }
    
    console.log('Final parsed task before saving:', JSON.stringify(parsed, null, 2));
    
    res.status(200).json(parsed);
  } catch (error: any) {
    console.error('=== ERROR PARSING TASK ===');
    console.error('Error type:', typeof error);
    console.error('Error:', error);
    console.error('Error message:', error.message);
    console.error('Error name:', error.name);
    console.error('Error code:', error.code);
    console.error('Error stack:', error.stack);
    
    // Google Generative AI SDK errors might have different structure
    if (error.status) {
      console.error('Error status:', error.status);
    }
    if (error.statusText) {
      console.error('Error statusText:', error.statusText);
    }
    if (error.response) {
      console.error('Error response:', error.response);
    }
    if (error.cause) {
      console.error('Error cause:', error.cause);
    }
    
    // Extract more detailed error information
    let errorMessage = 'Unknown error';
    let errorDetails: any = null;
    
    if (error.message) {
      errorMessage = error.message;
    }
    
    // Try different ways to get error details
    if (error.response?.data) {
      errorDetails = error.response.data;
    } else if (error.status && error.statusText) {
      errorDetails = {
        status: error.status,
        statusText: error.statusText,
        message: error.message,
      };
    } else if (error.cause) {
      errorDetails = error.cause;
    } else {
      errorDetails = {
        name: error.name,
        message: error.message,
        code: error.code,
        status: error.status,
      };
    }
    
    res.status(500).json({ 
      message: 'Error parsing task',
      error: errorMessage,
      details: errorDetails,
    });
  }
}
