import { parseTask } from "@/services/chatgptService";

async function handleAddTask(input: string) {
  const parsed = await parseTask(input);
  console.log(parsed); // Save to Firebase after parsing
}