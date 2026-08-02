import { spawn } from "node:child_process";

const port = 3111;
const baseUrl = `http://127.0.0.1:${port}`;

const delay = (milliseconds: number) => new Promise((resolve) => setTimeout(resolve, milliseconds));

async function waitForServer() {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      const response = await fetch(baseUrl, { redirect: "manual" });
      if (response.status < 500) return;
    } catch {
      // The process is still starting.
    }
    await delay(500);
  }
  throw new Error("SMOKE_SERVER_TIMEOUT");
}

async function get(path: string) {
  return fetch(`${baseUrl}${path}`, { redirect: "manual" });
}

async function main() {
  const server = spawn("npm", ["run", "start", "--", "-p", String(port)], { cwd: process.cwd(), stdio: "ignore" });
  try {
    await waitForServer();
    const [root, login, dashboard] = await Promise.all([get("/"), get("/login"), get("/dashboard")]);
    const [rootHtml, loginHtml, dashboardHtml] = await Promise.all([root.text(), login.text(), dashboard.text()]);
    const dashboardRedirect = dashboard.status >= 300 && dashboard.status < 400 && dashboard.headers.get("location") === "/login";
    const noSignupOrReset = !/sign\s*up|forgot password|reset password/i.test(loginHtml);
    const loginFields = /type="email"/.test(loginHtml) && /type="password"/.test(loginHtml);
    const publicDataSafe = !/DEMO DATA|Synthetic Talent Contact|DEMO Example Engineering|DEMO Remote AI Engineer/i.test(rootHtml);
    const noSecretMarkers = !/SUPABASE_SECRET_KEY|service_role|sb_secret/i.test(`${rootHtml}${loginHtml}${dashboardHtml}`);
    const pass = root.ok && login.ok && dashboardRedirect && noSignupOrReset && loginFields && publicDataSafe && noSecretMarkers;
    console.log(`SMOKE_ROOT: ${root.ok ? "PASS" : "FAIL"}`);
    console.log(`SMOKE_LOGIN: ${login.ok && loginFields ? "PASS" : "FAIL"}`);
    console.log(`SMOKE_PROTECTED_REDIRECT: ${dashboardRedirect ? "PASS" : "FAIL"}`);
    console.log(`SMOKE_SIGNUP_UI: ${noSignupOrReset ? "ABSENT" : "PRESENT"}`);
    console.log(`SMOKE_PUBLIC_DATA: ${publicDataSafe ? "SAFE" : "EXPOSED"}`);
    console.log(`SMOKE_SECRET_MARKERS: ${noSecretMarkers ? "ABSENT" : "PRESENT"}`);
    console.log(`SMOKE_RESULT: ${pass ? "PASS" : "FAIL"}`);
    if (!pass) process.exitCode = 1;
  } catch {
    console.log("SMOKE_RESULT: FAIL");
    process.exitCode = 1;
  } finally {
    server.kill("SIGTERM");
  }
}

void main();
