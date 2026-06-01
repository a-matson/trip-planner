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
  availableCategories: string[],
  qnaHistory: { question: string, answer: string }[] = []
): Promise<{ isComplete: boolean, questions: QuestionnaireItem[] }> => {
  
  const historyContext = qnaHistory.length > 0
    ? `\n\nPrevious Conversation History:\n${qnaHistory.map(h => `Q: ${h.question}\nA: ${h.answer}`).join('\n')}`
    : '';

  const systemPrompt = `You are an interactive trip planning assistant.
Your goal is to gather comprehensive information based on this checklist:
- Pace of sightseeing
- Transportation preferences
- Cuisine/dietary requirements
- Accommodation preferences
- Breaks and downtime
- Group size/dynamics
- Flight/travel constraints

The user wants to travel from ${intent.origin} to ${intent.destination} on ${intent.dates} with a ${intent.budget} budget.
Available attraction categories at the destination are: ${availableCategories.join(', ')}.${historyContext}

Evaluate if you have enough information across all checklist dimensions based on the conversation history.
If you need more information, output "isComplete": false and generate 2-3 targeted follow-up questions.
If you have sufficient information to confidently plan the trip, output "isComplete": true and an empty "questions" array.

Output ONLY a JSON object with this exact structure:
{
  "isComplete": boolean,
  "questions": [
    { "id": "string", "question": "string", "options": ["string", "string"] }
  ]
}`;

  const messages = [
    { role: 'system' as const, content: systemPrompt },
    { role: 'user' as const, content: 'Evaluate the current state and generate the JSON response.' }
  ];

  const response = await engine.chat.completions.create({
    messages,
    temperature: 0.2,
  });

  let content = response.choices[0].message.content || '{"isComplete": false, "questions": []}';
  const matchObj = content.match(/\{[\s\S]*\}/);
  if (matchObj) content = matchObj[0];
  
  try {
    const parsed = JSON.parse(content);
    return {
      isComplete: !!parsed.isComplete,
      questions: Array.isArray(parsed.questions) ? parsed.questions : []
    };
  } catch (e) {
    console.error("Failed to parse JSON from LLM", e);
    // Fallback if formatting breaks
    return {
      isComplete: false,
      questions: [
        { id: "fallback_diet", question: "Any dietary requirements?", options: ["No", "Vegetarian", "Vegan", "Gluten-Free"] }
      ]
    };
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
