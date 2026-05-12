/**
 * AI Agent 1: Application Summarizer (DPR §6.1)
 * 
 * Uses Gemini to auto-generate concise, structured summaries of
 * lengthy startup applications for faster reviewer screening.
 * 
 * Human-in-the-loop: Summary must be approved by reviewer/admin
 * before being used in evaluation decisions.
 */

import { callAgent, parseAIJson } from './core';

export interface ApplicationSummary {
  executive_summary: string;           // 2-3 sentence overview
  problem_statement: string;           // What problem the startup solves
  proposed_solution: string;           // How they solve it
  target_market: string;               // Who they serve
  business_model: string;              // How they make money
  team_strength: string;               // Key team qualifications
  competitive_advantage: string;       // What makes them unique
  stage_assessment: string;            // idea | mvp | growth | scale
  key_risks: string[];                 // Identified risks
  overall_impression: 'strong' | 'moderate' | 'weak';
  confidence: number;                  // 0-1 confidence in analysis
}

const SYSTEM_PROMPT = `You are an expert startup evaluator for a government incubation program.
Your task is to read a startup application and generate a structured summary that helps reviewers 
quickly understand the core business idea before reading the full document.

IMPORTANT RULES:
- Be objective and factual. Do not inject opinions.
- Extract information directly from the application. Do not hallucinate.
- If information is missing from the application, note it as "Not provided".
- Keep each field concise (2-4 sentences max).
- Assess the overall impression honestly based on the content quality.
- The confidence score reflects how complete the application data is (0.0 = very sparse, 1.0 = very detailed).

Return a valid JSON object matching the ApplicationSummary schema.`;

/**
 * Generate a structured summary of a startup application.
 * @param applicationText - The full application text (concatenated form fields)
 * @param programCriteria - Optional: the program's evaluation criteria for context
 */
export async function summarizeApplication(
  applicationText: string,
  programCriteria?: string
): Promise<ApplicationSummary | null> {
  let userMessage = `Please analyze this startup application and generate a structured summary:\n\n---\n${applicationText}\n---`;

  if (programCriteria) {
    userMessage += `\n\nThe program evaluates applications against these criteria:\n${programCriteria}`;
  }

  const response = await callAgent(SYSTEM_PROMPT, userMessage);
  return parseAIJson<ApplicationSummary>(response);
}
