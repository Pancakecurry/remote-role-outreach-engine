import { managedSourceCandidates, publicBoardUrl } from "@/config/job-source-registry";
import { jobSourceAdapters, jobSourceConfigSchema } from "@/integrations/job-sources";
import { loadProjectEnvironment } from "@/lib/security/load-project-env";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { z } from "zod";

async function main() {
  loadProjectEnvironment();
  const owner = z.string().uuid().safeParse(process.env.APP_OWNER_USER_ID);
  if (!owner.success) { console.log("SOURCES_SEED: NOT_CONFIGURED"); process.exitCode = 1; return; }
  try {
    const db = createAdminSupabaseClient(); let written = 0;
    for (const candidate of managedSourceCandidates) {
      const config = jobSourceConfigSchema.safeParse({ id: "00000000-0000-4000-8000-000000000000", ...candidate, providerRegion: candidate.provider === "LEVER" ? "GLOBAL" : null, enabled: false, isDemo: false });
      if (!config.success || !jobSourceAdapters[candidate.provider].validateSource(config.data).success) continue;
      const sourceUrl = publicBoardUrl(candidate);
      const current = await db.from("job_sources").select("id,managed_seed").eq("owner_id", owner.data).eq("source_url", sourceUrl).maybeSingle();
      if (current.error) throw current.error;
      if (current.data && !current.data.managed_seed) continue;
      const payload = { owner_id: owner.data, name: `${candidate.companyName} public ATS`, source_url: sourceUrl, source_type: "ATS", provider: candidate.provider, company_name: candidate.companyName, company_domain: candidate.companyDomain, board_identifier: candidate.boardIdentifier, public_board_url: sourceUrl, provider_region: candidate.provider === "LEVER" ? "GLOBAL" : null, enabled: false, priority: 100, ingestion_interval_minutes: 1440, managed_seed: true, is_demo: false };
      const result = current.data ? await db.from("job_sources").update(payload).eq("id", current.data.id).eq("owner_id", owner.data) : await db.from("job_sources").insert(payload);
      if (result.error) throw result.error;
      written += 1;
    }
    console.log(`SOURCES_SEED: COMPLETE (${written})`);
  } catch { console.log("SOURCES_SEED: FAILED"); process.exitCode = 1; }
}
void main();
