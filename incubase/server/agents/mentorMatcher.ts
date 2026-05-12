/**
 * AI Agent 3: Mentor-Startup Matcher (DPR §6.3)
 * 
 * Analyzes mentor and startup profiles to suggest optimal pairings
 * based on skills, expertise, industry sector, and availability.
 * 
 * Human-in-the-loop: Matches are recommendations only.
 */

import { callAgent, parseAIJson } from './core';

export interface MentorProfile {
  id: string;
  name: string;
  skills: string[];
  industries: string[];
  experience_years: number;
  availability: string;       // e.g. "2 sessions/month"
  bio: string;
}

export interface StartupProfile {
  id: string;
  company_name: string;
  sector: string;
  stage: string;
  needs: string[];            // What they need from a mentor
  description: string;
}

export interface MentorMatch {
  mentor_id: string;
  mentor_name: string;
  startup_id: string;
  startup_name: string;
  match_score: number;        // 0-100
  match_rationale: string;    // Why this pairing works
  complementary_skills: string[];
  potential_concerns: string[];
}

const SYSTEM_PROMPT = `You are a mentor-startup matching specialist for a government incubation program.
Your task is to analyze mentor and startup profiles and suggest optimal pairings.

MATCHING CRITERIA (in priority order):
1. Industry alignment — mentor's expertise matches startup's sector
2. Skill relevance — mentor's skills address startup's stated needs
3. Stage appropriateness — mentor's experience suits the startup's current stage
4. Availability — mentor has capacity for the engagement

RULES:
- Score each match 0-100.
- Provide clear rationale for each pairing.
- Identify complementary skills and potential concerns.
- Be fair — do not favor any particular sector or team.

Return a JSON array of MentorMatch objects, sorted by match_score descending.`;

/**
 * Find the best mentor matches for a single startup.
 */
export async function matchMentorsForStartup(
  startup: StartupProfile,
  mentors: MentorProfile[],
  topN: number = 5
): Promise<MentorMatch[]> {
  const mentorList = mentors.map((m) => 
    `- ${m.name} (ID: ${m.id}): Skills: ${m.skills.join(', ')}. Industries: ${m.industries.join(', ')}. Experience: ${m.experience_years} yrs. Availability: ${m.availability}. Bio: ${m.bio}`
  ).join('\n');

  const userMessage = `Find the top ${topN} best mentor matches for this startup:

STARTUP:
- Name: ${startup.company_name} (ID: ${startup.id})
- Sector: ${startup.sector}
- Stage: ${startup.stage}
- Needs: ${startup.needs.join(', ')}
- Description: ${startup.description}

AVAILABLE MENTORS:
${mentorList}

Return a JSON array of the top ${topN} MentorMatch objects.`;

  const response = await callAgent(SYSTEM_PROMPT, userMessage);
  return parseAIJson<MentorMatch[]>(response) || [];
}
