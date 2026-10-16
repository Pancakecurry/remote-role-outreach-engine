import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import example from "../../config/candidate-profile.example.json";
import { candidateProfileSchema } from "@/schemas";

const path = resolve(/* turbopackIgnore: true */ process.env.CANDIDATE_PROFILE_PATH ?? "config/private/candidate-profile.json");

/** Runtime-owned candidate facts. The tracked fallback contains sample data only. */
export const candidateProfile = candidateProfileSchema.parse(existsSync(/* turbopackIgnore: true */ path) ? JSON.parse(readFileSync(/* turbopackIgnore: true */ path, "utf8")) : example);
