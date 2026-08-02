import { checkMx } from "@/lib/domain-validation/email";
import { loadProjectEnvironment } from "@/lib/security/load-project-env";
loadProjectEnvironment(); async function main() { const status = await checkMx("example.com"); console.log(`DNS_MX_STATUS: ${status}`); if (status === "ERROR") process.exitCode = 1; }
void main();
