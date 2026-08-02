import { loadEnvConfig } from "@next/env";

/** Loads local runtime configuration without logging or returning environment values. */
export function loadProjectEnvironment() { loadEnvConfig(process.cwd()); }
