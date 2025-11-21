import type { NextApiRequest, NextApiResponse } from "next";
import axios from "axios";

const apiKey = process.env.OPENAI_API_KEY;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const { endpoint, payload } = req.body;

  if (!endpoint || !payload) {
    return res.status(400).json({ message: "Missing endpoint or payload" });
  }

  const openAIEndpoints: { [key: string]: string } = {
    parseTask: "https://api.openai.com/v1/chat/completions",
    getMotivationalSuggestion: "https://api.openai.com/v1/chat/completions",
  };

  const openAIPayloads: { [key: string]: (payload: any) => object } = {
    parseTask: (input: string) => ({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content:
            "You are an assistant that converts natural language tasks into structured JSON.",
        },
        {
          role: "user",
          content: `Convert this into JSON with fields: task, type (single/habit), frequency, deadline, priority. Input: ${input}`,
        },
      ],
    }),
    getMotivationalSuggestion: (taskTitle: string) => ({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content:
            "You are an assistant that provides motivational suggestions for tasks.",
        },
        {
          role: "user",
          content: `Provide a short, actionable suggestion to start the task: "${taskTitle}"`,
        },
      ],
    }),
  };

  const url = openAIEndpoints[endpoint];
  const getPayload = openAIPayloads[endpoint];

  if (!url || !getPayload) {
    return res.status(400).json({ message: "Invalid endpoint" });
  }

  try {
    const response = await axios.post(url, getPayload(payload), {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
    });
    res.status(200).json(response.data);
  } catch (error: any) {
    console.error("Error calling OpenAI:", error.response?.data || error.message);
    res.status(error.response?.status || 500).json({ message: "Error calling OpenAI" });
  }
}
