/**
 * AI Agent 2: Pre-screener & Shortlister (DPR §6.2)
 * 
 * Analyzes applications against predefined weighted criteria and
 * produces a preliminary ranking with per-criterion scores.
 * 
 * Human-in-the-loop: The shortlist is a RECOMMENDATION only.
 * Final selection decisions always rest with human reviewers.
 */

import { callAgent, parseAIJson } from './core';

export interface CriterionScore {
  criterion_id: string;
  criterion_name: string;
  score: number;            // 0-10
  max_score: number;
  weight: number;           // percentage weight
  weighted_score: number;   // score * weight / 100
  reasoning: string;        // Brief explanation of the score
}

export interface PrescreeningResult {
  application_id: string;
  startup_name: string;
  criteria_scores: CriterionScore[];
  total_weighted_score: number;  // Sum of weighted scores
  max_possible_score: number;
  percentage: number;            // 0-100
  recommendation: 'strongly_recommend' | 'recommend' | 'borderline' | 'not_recommended';
  key_strengths: string[];
  key_concerns: string[];
  confidence: number;            // 0-1
}

const SYSTEM_PROMPT = `You are an impartial application pre-screening assistant for a government incubation program.
Your task is to evaluate startup applications against specific weighted criteria and provide preliminary scores.

IMPORTANT RULES:
- Score each criterion objectively based on the evidence in the application (0-10 scale).
- Provide brief reasoning for each score.
- If evidence is insufficient, score conservatively and note it.
- Calculate weighted scores correctly: (score / max_score) * weight.
- Be fair and consistent. Do not favor any sector or team composition.
- Your scores are RECOMMENDATIONS. Human reviewers make final decisions.
- The recommendation field should be based on the percentage:
  - 80-100%: strongly_recommend
  - 60-79%: recommend  
  - 40-59%: borderline
  - 0-39%: not_recommended

Return a valid JSON object matching the PrescreeningResult schema.`;

export interface EvaluationCriterion {
  id: string;
  name: string;
  description: string;
  weight: number;
  max_score: number;
}

/**
 * Pre-screen a single application against weighted criteria.
 */
export async function prescreenApplication(
  applicationId: string,
  startupName: string,
  applicationText: string,
  criteria: EvaluationCriterion[]
): Promise<PrescreeningResult | null> {
  const criteriaText = criteria
    .map((c) => `- ${c.name} (Weight: ${c.weight}%, Max Score: ${c.max_score}): ${c.description}`)
    .join('\n');

  const userMessage = `Pre-screen this application against the weighted criteria below.

APPLICATION ID: ${applicationId}
STARTUP: ${startupName}

EVALUATION CRITERIA:
${criteriaText}

APPLICATION CONTENT:
---
${applicationText}
---

Return a JSON object with application_id, startup_name, criteria_scores (array), total_weighted_score, max_possible_score, percentage, recommendation, key_strengths (array), key_concerns (array), and confidence.`;

  const response = await callAgent(SYSTEM_PROMPT, userMessage);
  return parseAIJson<PrescreeningResult>(response);
}

/**
 * Pre-screen multiple applications and return a ranked shortlist.
 */
export async function generateShortlist(
  applications: Array<{ id: string; startup_name: string; text: string }>,
  criteria: EvaluationCriterion[]
): Promise<PrescreeningResult[]> {
  const results: PrescreeningResult[] = [];

  for (const app of applications) {
    const result = await prescreenApplication(app.id, app.startup_name, app.text, criteria);
    if (result) {
      results.push(result);
    }
  }

  // Sort by total weighted score (descending)
  return results.sort((a, b) => b.total_weighted_score - a.total_weighted_score);
}
