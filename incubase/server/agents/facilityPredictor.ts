/**
 * AI Agent 4: Predictive Facility Utilization Analytics (DPR §6.4)
 */
import { callAgent, parseAIJson } from './core';

export interface FacilityPrediction {
  period: string;
  peak_hours: string[];
  peak_days: string[];
  occupancy_trend: 'increasing' | 'stable' | 'decreasing';
  capacity_alert: boolean;
  recommendations: string[];
  confidence: number;
}

const SYSTEM_PROMPT = `You are a facility management analytics AI for a government incubation center. Analyze historical occupancy data to forecast demand, identify peak patterns, and recommend capacity adjustments. Return valid JSON matching the FacilityPrediction schema.`;

export async function predictFacilityUsage(
  historicalData: string,
  spaceInventory: string,
  forecastPeriod: string = 'next 7 days'
): Promise<FacilityPrediction | null> {
  const userMessage = `Analyze facility data and predict usage for ${forecastPeriod}.\n\nSPACE INVENTORY:\n${spaceInventory}\n\nHISTORICAL DATA:\n${historicalData}`;
  const response = await callAgent(SYSTEM_PROMPT, userMessage);
  return parseAIJson<FacilityPrediction>(response);
}
