import { readFile } from "node:fs/promises";
import { buildApplicationPackage, resumeConfigSchema } from "../src/services/application-package-core";
import { renderTailoredResume } from "../src/services/resume-renderer";
async function main() { const config = resumeConfigSchema.parse(JSON.parse(await readFile("config/resumes.json", "utf8"))); const pkg = buildApplicationPackage(config, { id: "verified-sample", title: "AI Implementation Engineer", company: "Sample Company", description: "Implement Python FastAPI RAG workflows, integrations, and reliable customer-facing automation.", applicationUrl: "https://example.com/apply", provider: "GREENHOUSE", compensationBand: "unknown", fitScore: 88, strongestMatches: ["Python", "FastAPI", "RAG and document intelligence"], relevantProject: "Decimal OS" }); const rendered = await renderTailoredResume(pkg); console.log(JSON.stringify(rendered)); }
void main();
