import { readFile } from "node:fs/promises";
import { extractContactEvidence } from "@/lib/contact-extraction";
async function main() { const html = await readFile(new URL("../tests/fixtures/synthetic-careers-page.html", import.meta.url), "utf8"); const evidence = extractContactEvidence(html, "https://acme.test/careers", "acme.test", "COMPANY_CAREERS_PAGE"); if (evidence.length < 1) throw new Error("Expected synthetic contact evidence"); console.log(`CONTACT_EXTRACTION_OK: ${evidence.length} synthetic candidates`); }
void main();
