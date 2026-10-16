import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

const apiKey = process.env.AI_API_KEY || '';
const modelName = process.env.AI_MODEL || 'gemini-1.5-flash';

const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

export async function generateBirthdayMessage(params: {
  name: string;
  age?: number;
  relationship?: string;
  organization: string;
  deity_name: string;
}): Promise<string> {
  if (!genAI) {
    throw new Error('AI Provider not configured');
  }

  const model = genAI.getGenerativeModel({ model: modelName });
  const prompt = `
Generate a warm, respectful and devotional birthday SMS in natural Hindi on behalf of ${params.organization}.

The message should respectfully reference ${params.deity_name}, wish the recipient happiness, peace, good health and spiritual well-being, and end appropriately with हरे कृष्ण.

Keep the message concise enough for SMS.
Use natural Hindi in Devanagari script.
Do not make medical claims, guaranteed promises, political statements, offensive statements, or inappropriate religious claims.
Do not use overly complicated Sanskrit.
Do not make the message sound transactional.

Recipient Details:
- Name: ${params.name}
${params.age ? `- Age: ${params.age}` : ''}
${params.relationship ? `- Relationship: ${params.relationship}` : ''}
`;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text().trim();
  } catch (error) {
    console.error('AI Generation Error:', error);
    throw new Error('Failed to generate AI message');
  }
}
