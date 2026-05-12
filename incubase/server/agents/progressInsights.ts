/**
 * AI Agent 5: Incubation Progress Insights (DPR §6.5)
 */
import { callAgent, parseAIJson } from './core';

export interface ProgressInsight {
  startup_id: string;
  startup_name: string;
  status: 'excelling' | 'on_track' | 'at_risk' | 'critical';
  milestone_completion_rate: number;
  engagement_score: number;
  key_findings: string[];
  recommendations: string[];
  confidence: number;
}

const SYSTEM_PROMPT = `You are a startup progress analyst for a government incubation program. Analyze milestone completion, mentor feedback, and engagement data to flag startups that are excelling or struggling. Return valid JSON matching the ProgressInsight schema.`;

export async function analyzeStartupProgress(
  startupName: string,
  startupId: string,
  milestoneData: string,
  mentorFeedback: string
): Promise<ProgressInsight | null> {
  const userMessage = `Analyze progress for startup "${startupName}" (ID: ${startupId}).\n\nMILESTONES:\n${milestoneData}\n\nMENTOR FEEDBACK:\n${mentorFeedback}`;
  const response = await callAgent(SYSTEM_PROMPT, userMessage);
  return parseAIJson<ProgressInsight>(response);
}
