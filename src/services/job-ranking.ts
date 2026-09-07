import { missionPriorities } from "@/config/mission-priorities";

export type CompensationBand = "below_target" | "acceptable" | "strong" | "exceptional" | "unknown";
export type RankingInput = {
  technicalFit: number; roleFamilyFit: number; locationFlexibility: number; compensationBand: CompensationBand;
  recency: number; experienceFit: number; companyQuality: number; competition: number | null; applicationFriction: number;
  employmentPotential: number; missionUsefulness: number;
};

const clamp = (value: number) => Math.max(0, Math.min(100, value));
export function compensationBandFromMonthlyPhp(value: number | null): CompensationBand {
  if (value === null || !Number.isFinite(value)) return "unknown";
  if (value < missionPriorities.income.minimumMonthly) return "below_target";
  if (value < missionPriorities.income.targetMonthly) return "acceptable";
  if (value < missionPriorities.income.idealMonthly) return "strong";
  return "exceptional";
}

const compensationScore: Record<CompensationBand, number> = { below_target: 25, acceptable: 60, strong: 82, exceptional: 100, unknown: 48 };
export function rankJob(input: RankingInput) {
  const competition = input.competition ?? 50;
  const parts = {
    technical_fit: clamp(input.technicalFit) * 0.23,
    role_family_fit: clamp(input.roleFamilyFit) * 0.14,
    location_flexibility: clamp(input.locationFlexibility) * 0.12,
    compensation: compensationScore[input.compensationBand] * 0.10,
    recency: clamp(input.recency) * 0.09,
    experience_fit: clamp(input.experienceFit) * 0.08,
    company_quality: clamp(input.companyQuality) * 0.06,
    competition: clamp(competition) * 0.04,
    application_friction: clamp(input.applicationFriction) * 0.05,
    employment_potential: clamp(input.employmentPotential) * 0.05,
    mission_usefulness: clamp(input.missionUsefulness) * 0.04,
  };
  const score = Math.round(Object.values(parts).reduce((sum, value) => sum + value, 0));
  const explanation = Object.entries(parts).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name, value]) => `${name.replaceAll("_", " ")}: ${Math.round(value)} weighted points`);
  return { score, explanation, parts };
}
