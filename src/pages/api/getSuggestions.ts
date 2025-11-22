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

  const { taskTitle, taskDescription } = req.body;

  if (!taskTitle) {
    return res.status(400).json({ message: 'Task title is required' });
  }

  try {
    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        contents: [
          {
            parts: [
              {
                text: `You are a helpful assistant specializing in ADHD-friendly strategies and motivation techniques. 
When someone is struggling to start a task, provide:
1. A brief, empathetic acknowledgment
2. 2-3 specific, actionable ADHD strategies to break the task into smaller steps or overcome resistance
3. A motivational nudge that's encouraging but not overwhelming

Keep it concise (3-4 sentences max), practical, and focused on getting started rather than completing everything.

The user is avoiding this task: "${taskTitle}"${taskDescription ? ` - ${taskDescription}` : ''}. 
They need help getting started. Provide ADHD-friendly strategies and motivation.`
              }
            ]
          }
        ]
      },
      {
        headers: {
          "Content-Type": "application/json"
        }
      }
    );
    
    const suggestion = response.data.candidates[0].content.parts[0].text;
    res.status(200).json({ suggestion });
  } catch (error) {
    console.error('Error getting suggestions:', error);
    res.status(500).json({ message: 'Error getting suggestions', error: error instanceof Error ? error.message : 'Unknown error' });
  }
}

