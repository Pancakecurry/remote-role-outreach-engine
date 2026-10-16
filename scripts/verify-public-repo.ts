import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const files = execFileSync("git", ["ls-files"], { encoding: "utf8" }).trim().split("\n").filter(Boolean);
const forbiddenPaths = /(^|\/)(\.env\.local|config\/private\/[^.][^/]*\.json|assets\/resumes|output|runtime|tmp)(\/|$)/;
const forbiddenText = [
  /\/Users\/[A-Za-z0-9._-]+\//,
  /-----BEGIN [A-Z ]+PRIVATE KEY-----/,
  /\b(?:gh[pousr]_|sb_secret_)[A-Za-z0-9_-]{20,}\b/,
  /\bAIza[0-9A-Za-z_-]{30,}\b/,
  /"credentials"\s*:\s*\{/,
];
const email = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const failures: string[] = [];

for (const file of files) {
  if (forbiddenPaths.test(file)) failures.push(`tracked private path: ${file}`);
  let source: string;
  try { source = readFileSync(file, "utf8"); } catch { continue; }
  if (forbiddenText.some((pattern) => pattern.test(source))) failures.push(`private marker: ${file}`);
  for (const value of source.match(email) ?? []) {
    const synthetic = /@(?:[a-z0-9.-]+\.test|[a-z0-9.-]*example\.(?:com|org|net))$/i.test(value)
      || file === "supabase/config.toml"
      || file === "tests/fixtures/unsafe-contact-page.html";
    if (!synthetic) failures.push(`non-example email: ${file}`);
  }
}

const privateValues: string[] = [];
for (const privateFile of ["config/private/candidate-profile.json", "config/private/mission-priorities.json"]) {
  try {
    const value = JSON.parse(readFileSync(privateFile, "utf8")) as { name?: string; projects?: Array<{ evidence?: string[] }>; relocation?: { destination?: string } };
    if (value.name) privateValues.push(value.name);
    if (value.relocation?.destination) privateValues.push(value.relocation.destination);
    for (const project of value.projects ?? []) privateValues.push(...(project.evidence ?? []).filter((item) => /\d/.test(item)));
  } catch { /* private configuration is optional in public clones */ }
}
for (const directory of [".next", "dist", "out"]) {
  for (const value of privateValues) try {
    const output = execFileSync("rg", ["-F", "-l", value, directory], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
    if (output.trim()) failures.push(`private profile data in build output: ${directory}`);
  } catch { /* directory absent or no match */ }
}

if (failures.length) {
  console.error([...new Set(failures)].join("\n"));
  process.exitCode = 1;
} else {
  console.log(`PUBLIC_REPO_PRIVACY: PASS (${files.length} tracked files)`);
}
