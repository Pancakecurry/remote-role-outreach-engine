import { z } from "zod";

export const demoGuardSchema = z.object({ APP_OWNER_USER_ID: z.string().uuid(), OUTREACH_MODE: z.literal("dry_run"), OUTREACH_ENABLED: z.literal("false") });
export function assertDemoGuards(input: unknown) { return demoGuardSchema.parse(input).APP_OWNER_USER_ID; }
