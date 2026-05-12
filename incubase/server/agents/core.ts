/**
 * AI Agents Core — Gemini Client Initialization
 *
 * Shared Gemini client and utility functions for all 5 AI agents.
 * Includes retry logic with exponential backoff for rate limits.
 */

import { GoogleGenAI } from '@google/genai';

const apiKey = process.env.GEMINI_API_KEY || '';

if (!apiKey) {
  console.warn('[AI Core] GEMINI_API_KEY not set. AI agents will be disabled.');
}

export const ai = new GoogleGenAI({ apiKey });

export const MODEL_ID = 'gemini-2.0-flash';

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 2000;

/**
 * Safely parse JSON from AI response text.
 * Handles markdown code fences that models sometimes add.
 */
export function parseAIJson<T>(text: string): T | null {
  try {
    let cleaned = text.trim();
    if (cleaned.startsWith('```json')) {
      cleaned = cleaned.slice(7);
    } else if (cleaned.startsWith('```')) {
      cleaned = cleaned.slice(3);
    }
    if (cleaned.endsWith('```')) {
      cleaned = cleaned.slice(0, -3);
    }
    return JSON.parse(cleaned.trim()) as T;
  } catch {
    console.error('[AI Core] Failed to parse AI JSON response:', text.slice(0, 200));
    return null;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRateLimitError(err: any): boolean {
  const msg = (err?.message || '').toLowerCase();
  const status = err?.status || err?.code;
  return status === 429 || msg.includes('429') || msg.includes('quota') || msg.includes('rate') || msg.includes('resource_exhausted');
}

/**
 * Call Gemini with a system prompt and user message.
 * Includes automatic retry with exponential backoff for rate limits.
 */
export async function callAgent(systemPrompt: string, userMessage: string): Promise<string> {
  if (!apiKey) {
    throw new Error('AI agents are disabled. Please configure the GEMINI_API_KEY environment variable.');
  }

  let lastError: any = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model: MODEL_ID,
        contents: userMessage,
        config: {
          systemInstruction: systemPrompt,
          temperature: 0.3,
          maxOutputTokens: 2048,
        },
      });

      return response.text || '';
    } catch (err: any) {
      lastError = err;

      if (isRateLimitError(err) && attempt < MAX_RETRIES) {
        const delay = BASE_DELAY_MS * Math.pow(2, attempt);
        console.warn(`[AI Core] Rate limited (attempt ${attempt + 1}/${MAX_RETRIES + 1}). Retrying in ${delay}ms...`);
        await sleep(delay);
        continue;
      }

      break;
    }
  }

  if (isRateLimitError(lastError)) {
    throw new Error('AI service is temporarily busy due to rate limits. Please wait a moment and try again.');
  }

  throw new Error(lastError?.message || 'AI agent call failed. Please try again.');
}
