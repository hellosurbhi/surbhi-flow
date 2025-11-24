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

  const { taskTitle, taskDescription } = req.body;

  if (!taskTitle) {
    return res.status(400).json({ message: 'Task title is required' });
  }

  if (!apiKey) {
    console.error('GEMINI_API_KEY is not set');
    return res.status(500).json({ message: 'API key not configured' });
  }

  try {
    // Initialize with API key
    const ai = new GoogleGenAI({ apiKey });

    const prompt = `You are a compassionate, motivating assistant specializing in ADHD-friendly strategies and helping people overcome procrastination.

The user is struggling with this task: "${taskTitle}"${taskDescription ? ` - ${taskDescription}` : ''}.

Provide a comprehensive, encouraging response that includes:

1. **How to Start** (2-3 specific, actionable first steps they can take RIGHT NOW - make them tiny and easy)
2. **Strategies to Get Started** (ADHD-friendly techniques like breaking it down, using timers, body doubling, etc.)
3. **How to Complete the Task** (a clear path forward with manageable steps)
4. **Motivation** (describe how GOOD they will feel when they complete it - the relief, pride, sense of accomplishment, reduced stress, etc. Be specific and emotional)

Format your response in a warm, encouraging tone. Make it feel personal and supportive, not preachy. Keep it practical and actionable. Aim for 5-7 sentences total - enough to be helpful but not overwhelming.

Focus on making them feel capable and motivated to take that first small step.`;

    console.log('Calling Gemini API for suggestions');
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-lite',
      contents: prompt,
      config: {
        temperature: 0.8, // Slightly higher for more creative, motivational responses
      },
    });
    
    console.log('Got response from Gemini, response type:', typeof response);
    console.log('Response keys:', response ? Object.keys(response) : 'null');
    
    // Handle different response structures
    let suggestion: string;
    
    if (response && typeof response === 'object') {
      // Try different possible response structures
      if ('text' in response && typeof response.text === 'string') {
        suggestion = response.text;
      } else if ('response' in response && response.response && 'text' in response.response) {
        suggestion = (response.response as any).text;
      } else if ('content' in response) {
        const content = (response as any).content;
        if (typeof content === 'string') {
          suggestion = content;
        } else if (content && typeof content === 'object' && 'text' in content) {
          suggestion = content.text;
        } else {
          throw new Error('Unexpected response structure - content is not a string');
        }
      } else {
        console.error('Response structure:', JSON.stringify(response, null, 2));
        throw new Error('Unexpected response structure from Gemini API');
      }
    } else {
      throw new Error('Invalid response from Gemini API');
    }
    
    if (!suggestion || suggestion.trim().length === 0) {
      console.error('Empty suggestion received');
      return res.status(500).json({ 
        message: 'Empty suggestion received from API',
      });
    }
    
    console.log('Suggestion generated successfully, length:', suggestion.length);
    
    res.status(200).json({ suggestion });
  } catch (error: any) {
    console.error('=== ERROR GETTING SUGGESTIONS ===');
    console.error('Error type:', typeof error);
    console.error('Error:', error);
    console.error('Error message:', error.message);
    console.error('Error name:', error.name);
    console.error('Error code:', error.code);
    console.error('Error stack:', error.stack);
    
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
    
    let errorMessage = 'Unknown error';
    let errorDetails: any = null;
    
    if (error.message) {
      errorMessage = error.message;
    }
    
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
      message: 'Error getting suggestions', 
      error: errorMessage,
      details: errorDetails,
    });
  }
}

