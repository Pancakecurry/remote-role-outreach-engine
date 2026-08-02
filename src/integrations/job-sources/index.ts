import { ashbyAdapter } from "./ashby";
import { greenhouseAdapter } from "./greenhouse";
import { leverAdapter } from "./lever";
import type { JobSourceAdapter, JobSourceProvider } from "./types";
export * from "./types";
export * from "./normalization";
export * from "./safe-http";
export { ashbyAdapter, greenhouseAdapter, leverAdapter };
export const jobSourceAdapters: Record<JobSourceProvider, JobSourceAdapter> = { GREENHOUSE: greenhouseAdapter, LEVER: leverAdapter, ASHBY: ashbyAdapter };
