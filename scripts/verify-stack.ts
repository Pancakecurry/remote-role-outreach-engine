async function check(url: string) { try { const response = await fetch(url, { signal: AbortSignal.timeout(10_000) }); return response.ok; } catch { return false; } }
async function main() { const [app, n8n] = await Promise.all([check("http://127.0.0.1:3000/api/health"), check("http://127.0.0.1:5678/healthz")]); console.log(`STACK_APP: ${app ? "HEALTHY" : "UNAVAILABLE"}`); console.log(`STACK_N8N: ${n8n ? "HEALTHY" : "UNAVAILABLE"}`); if (!app || !n8n) process.exitCode = 1; }
void main();
