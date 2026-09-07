import { createHash } from "node:crypto";

export const dailySummaryEventKey = (day: string) => createHash("sha256").update(`daily-summary:${day}`).digest("hex");
