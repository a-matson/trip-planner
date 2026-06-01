import { CreateMLCEngine, MLCEngine } from '@mlc-ai/web-llm';
import type { Intent, QuestionnaireItem } from './store';

// We use a small, capable model to ensure it runs well on client GPUs
const MODEL_ID = 'Qwen2-1.5B-Instruct-q4f16_1-MLC'; 
// Note: If this model is not available in the specific WebLLM version installed, 
// we might need to fallback to Llama-3-8B-Instruct-q4f32_1-MLC. 

let engineInstance: MLCEngine | null = null;

export const initAI = async (
  onProgress: (progress: string) => void
): Promise<MLCEngine> => {
  if (engineInstance) return engineInstance;
  
  engineInstance = await CreateMLCEngine(MODEL_ID, {
    initProgressCallback: (progress) => {
      onProgress(progress.text);
    }
  });
  
  return engineInstance;
};

export const generateQuestionnaire = async (
  engine: MLCEngine,
  intent: Intent,
  availableCategories: string[]
): Promise<QuestionnaireItem[]> => {
  
  const systemPrompt = `You are a trip planning assistant. 
Your goal is to generate 3 to 5 targeted follow-up questions to help plan a trip.
The user wants to travel from ${intent.origin} to ${intent.destination} on ${intent.dates} with a ${intent.budget} budget.
The available attraction categories at the destination are: ${availableCategories.join(', ')}.
Output ONLY a JSON array of objects with the keys: id (string), question (string), options (array of strings). 
Do NOT output any other text.`;

  const messages = [
    { role: 'system' as const, content: systemPrompt },
    { role: 'user' as const, content: 'Generate the questionnaire in JSON.' }
  ];

  const response = await engine.chat.completions.create({
    messages,
    temperature: 0.2,
  });

  let content = response.choices[0].message.content || '[]';
  const match = content.match(/\[[\s\S]*\]/);
  if (match) {
    content = match[0];
  } else {
    const matchObj = content.match(/\{[\s\S]*\}/);
    if (matchObj) content = matchObj[0];
  }
  
  try {
    // We expect an array, but sometimes LLMs wrap it in an object like { "questions": [...] }
    const parsed = JSON.parse(content);
    if (Array.isArray(parsed)) return parsed;
    if (parsed.questions && Array.isArray(parsed.questions)) return parsed.questions;
    
    return [
      { id: "fallback1", question: "Do you prefer fast-paced sightseeing or long museum visits?", options: ["Fast-paced", "Long visits"] }
    ];
  } catch (e) {
    console.error("Failed to parse JSON from LLM", e);
    return [
      { id: "fallback1", question: "Do you prefer fast-paced sightseeing or long museum visits?", options: ["Fast-paced", "Long visits"] }
    ];
  }
};

export const fillGap = async (
  engine: MLCEngine,
  timeGapMinutes: number,
  availableCategories: string[],
  userPreferences: Record<string, string>
): Promise<string> => {
  const prefString = Object.entries(userPreferences).map(([k, v]) => `${k}: ${v}`).join('; ');
  
  const systemPrompt = `You are a strict state machine assistant.
You need to pick ONE category from the following list to fill a time gap of ${timeGapMinutes} minutes: ${availableCategories.join(', ')}.
The user's preferences are: ${prefString}.
Output ONLY a JSON object with the key "category" containing the chosen category. No other text.`;

  const messages = [
    { role: 'system' as const, content: systemPrompt },
    { role: 'user' as const, content: 'Pick the best category.' }
  ];

  const response = await engine.chat.completions.create({
    messages,
    temperature: 0.1,
  });

  let content = response.choices[0].message.content || '{}';
  const matchObj = content.match(/\{[\s\S]*\}/);
  if (matchObj) content = matchObj[0];
  
  try {
    const parsed = JSON.parse(content);
    return parsed.category || availableCategories[0];
  } catch {
    return availableCategories[0];
  }
};
