import type { z } from "zod";

export type RepositoryResult<T> = { state: "ready"; data: T } | { state: "setup_required" | "unavailable"; data: null };
const setupCodes = new Set(["42P01", "PGRST205"]);
export function classifyRepositoryError(error: { code?: string } | null): RepositoryResult<never>["state"] { return error?.code && setupCodes.has(error.code) ? "setup_required" : "unavailable"; }
export function parseRepositoryRows<T extends z.ZodType>(value: unknown, schema: T): RepositoryResult<z.infer<T>[]> { const parsed = schema.array().safeParse(value); return parsed.success ? { state: "ready", data: parsed.data } : { state: "unavailable", data: null }; }
