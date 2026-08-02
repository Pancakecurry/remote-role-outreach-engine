import { timingSafeEqual } from "node:crypto";
import { z } from "zod";

export const ingestionRequestSchema = z.object({ mode: z.enum(["dry_run", "write"]), sourceIds: z.array(z.string().uuid()).max(50).optional(), limitSources: z.number().int().min(1).max(50).optional() }).strict();
export const constantTimeTokenMatches = (provided: string | null, expected: string) => Boolean(provided && provided.length === expected.length && timingSafeEqual(Buffer.from(provided), Buffer.from(expected)));
export const ingestionLockAllowsStart = (existingLock: boolean) => !existingLock;
