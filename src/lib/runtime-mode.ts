import "server-only";

export const PRIVATE_RUNTIME_MODE = "operational" as const;

/**
 * This repository is the private operational product. Showcase data lives in
 * the separate public repository and must never become a fallback here.
 */
export function assertOperationalRuntime(environment: NodeJS.ProcessEnv = process.env) {
  const requestedMode = environment.APP_MODE?.trim().toLowerCase();
  if (requestedMode && requestedMode !== PRIVATE_RUNTIME_MODE) {
    throw new Error("PRIVATE_RUNTIME_SHOWCASE_MODE_FORBIDDEN");
  }

  return PRIVATE_RUNTIME_MODE;
}
