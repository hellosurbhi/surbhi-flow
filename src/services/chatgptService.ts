import axios from "axios";

const apiKey = process.env.OPENAI_API_KEY;

export async function parseTask(input: string) {
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
  return response.data.choices[0].message.content;
}
export async function getMotivationalSuggestion(taskTitle: string) {
  const response = await axios.post(
    "https://api.openai.com/v1/chat/completions",
    {
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "You are an assistant that provides motivational suggestions for tasks."
        },
        {
          role: "user",
          content: `Provide a short, actionable suggestion to start the task: "${taskTitle}"`
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
  return response.data.choices[0].message.content;
}