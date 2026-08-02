import { z } from "zod";

const optional = z.string().optional().transform((value) => value?.trim() || undefined);

export const envSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: optional.pipe(z.url().optional()),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: optional,
  SUPABASE_SECRET_KEY: optional,
  APP_OWNER_USER_ID: optional.pipe(z.uuid().optional()),
  INTERNAL_AUTOMATION_TOKEN: optional,
  GEMINI_API_KEY: optional,
  GEMINI_MODEL: optional,
  TAVILY_API_KEY: optional,
  APIFY_API_TOKEN: optional,
  GMAIL_SENDER_ADDRESS: optional.pipe(z.email().optional()),
  N8N_ENCRYPTION_KEY: optional,
  N8N_HOST: z.string().default("localhost"),
  N8N_PORT: z.coerce.number().int().min(1).max(65535).default(5678),
  N8N_PROTOCOL: z.enum(["http", "https"]).default("http"),
  GENERIC_TIMEZONE: z.literal("Asia/Kolkata").default("Asia/Kolkata"),
  TZ: z.literal("Asia/Kolkata").default("Asia/Kolkata"),
  OUTREACH_MODE: z.literal("dry_run").default("dry_run"),
  AUTOSEND_ENABLED: z.enum(["false"]).default("false"),
  DAILY_SEND_LIMIT: z.coerce.number().int().min(0).max(100).default(2),
  MIN_FIT_SCORE: z.coerce.number().int().min(0).max(100).default(75),
  MIN_FIT_CONFIDENCE: z.coerce.number().min(0).max(1).default(0.85),
  MIN_CONTACT_CONFIDENCE: z.coerce.number().min(0).max(1).default(0.95),
  FOLLOWUP_INTERVAL_DAYS: z.coerce.number().int().refine((value) => value === 3, "Must remain 3 days").default(3),
  MAX_FOLLOWUPS: z.coerce.number().int().refine((value) => value === 2, "Must remain two").default(2),
  ALLOW_GENERIC_HIRING_INBOXES: z.enum(["true", "false"]).default("true"),
  ALLOW_PERSONAL_EMAIL_AUTOSEND: z.enum(["false"]).default("false"),
  ALLOW_INFERRED_EMAIL_AUTOSEND: z.enum(["false"]).default("false"),
  REQUIRE_PUBLIC_CONTACT_EVIDENCE: z.enum(["true"]).default("true"),
  REQUIRE_DOMAIN_MX: z.enum(["true"]).default("true"),
  TELEGRAM_BOT_TOKEN: optional,
  TELEGRAM_CHAT_ID: optional,
});

export function readEnv() { return envSchema.safeParse(process.env); }
export const configured = (key: string) => Boolean(process.env[key]?.trim());
