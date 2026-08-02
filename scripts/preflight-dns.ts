import { checkMx } from "@/lib/domain-validation/email";
async function main() { const status = await checkMx("example.com"); console.log(`DNS_MX_STATUS: ${status}`); if (status === "ERROR") process.exitCode = 1; }
void main();
