export const pipelineThresholds = {
  application: { fitScore: 68, confidence: 0.6 },
  contact: { fitScore: 73, confidence: 0.7 },
  draft: { fitScore: 75, confidence: 0.75 },
  autosend: { fitScore: 78, confidence: 0.8, contactConfidence: 0.95 },
} as const;
