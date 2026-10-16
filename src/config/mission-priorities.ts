import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { z } from "zod";
import example from "../../config/mission-priorities.example.json";

const schema = z.object({
  relocation: z.object({ destination: z.string(), deadline: z.string().nullable(), requiresLocationFlexibleIncome: z.boolean() }),
  income: z.object({ currency: z.string().length(3), minimumMonthly: z.number().nonnegative(), comfortableMonthly: z.number().nonnegative(), targetMonthly: z.number().nonnegative(), idealMonthly: z.number().nonnegative() }),
  application: z.object({ unknownCompensation: z.literal("KEEP"), explicitlyBelowMinimum: z.literal("DEPRIORITIZE_NOT_REJECT") }),
});
const path = resolve(/* turbopackIgnore: true */ process.env.MISSION_PRIORITIES_PATH ?? "config/private/mission-priorities.json");

/** Private search goals load locally; Git contains only a neutral example. */
export const missionPriorities = schema.parse(existsSync(/* turbopackIgnore: true */ path) ? JSON.parse(readFileSync(/* turbopackIgnore: true */ path, "utf8")) : example);
