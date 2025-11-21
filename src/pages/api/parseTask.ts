import type { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';

const apiKey = process.env.OPENAI_API_KEY;

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

  console.log('API Key loaded:', !!apiKey);

  try {
    const response = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: "You are an assistant that converts natural language tasks into structured JSON."
          },
          {
            role: "user",
            content: `Convert this into JSON with fields: task, type (single/habit), frequency, deadline, priority. Input: ${input}`
          }
        ]
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`
        }
      }
    );
    res.status(200).json(response.data.choices[0].message.content);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error parsing task' });
  }
}
