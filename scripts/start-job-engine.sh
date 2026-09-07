#!/usr/bin/env bash
set -euo pipefail

project_dir="$(cd "$(dirname "$0")/.." && pwd)"
cd "$project_dir"
runtime_dir="/private/tmp/remote-role-outreach-engine-runtime"

mkdir -p "$runtime_dir"
rsync -a --delete \
  --exclude '.git' \
  --exclude '.next' \
  --exclude 'node_modules' \
  --exclude 'output' \
  --exclude 'tmp' \
  --exclude '.env.local' \
  "$project_dir/" "$runtime_dir/"

docker info >/dev/null
docker volume inspect docker_n8n_data >/dev/null 2>&1 || docker volume create docker_n8n_data >/dev/null
APP_BUILD_CONTEXT="$runtime_dir" docker compose up -d --build

for url in http://127.0.0.1:3000/api/health http://127.0.0.1:5678/healthz; do
  ready=false
  for _ in {1..60}; do
    if curl --fail --silent --show-error --max-time 5 "$url" >/dev/null 2>&1; then
      ready=true
      break
    fi
    sleep 2
  done
  if [[ "$ready" != true ]]; then
    echo "Service did not become healthy: $url" >&2
    docker compose ps
    exit 1
  fi
done

workflow_changed=$(docker compose exec -T n8n node -e '
const fs = require("fs"), crypto = require("crypto");
const raw = fs.readFileSync("/workflows/remote_role_acquisition_engine.json", "utf8");
const hash = crypto.createHash("sha256").update(raw + "runtime-bindings-v3").digest("hex");
const marker = "/home/node/.n8n/acquisition-workflow.sha256";
if (fs.existsSync(marker) && fs.readFileSync(marker, "utf8") === hash) { console.log("unchanged"); process.exit(0); }
const workflow = JSON.parse(raw);
workflow.id = process.env.ACQUISITION_WORKFLOW_ID || "REDACTED_LOCAL_WORKFLOW_ID";
for (const node of workflow.nodes) {
  if (node.parameters.sendBody && typeof node.parameters.jsonBody === "string") node.parameters.specifyBody = "json";
  // Bind only these non-secret values; n8n keeps environment access restricted.
  if (typeof node.parameters.url === "string") node.parameters.url = node.parameters.url.replace("={{ $env.INTERNAL_API_BASE_URL }}", "http://app:3000");
  if (typeof node.parameters.jsonBody === "string") node.parameters.jsonBody = node.parameters.jsonBody.replace("={{ $env.SELF_TEST_RECIPIENT }}", process.env.GMAIL_SENDER_ADDRESS || "");
  if (node.type === "n8n-nodes-base.gmail") node.credentials = { gmailOAuth2: { id: process.env.ACQUISITION_GMAIL_CREDENTIAL_ID || "REDACTED_LOCAL_GMAIL_CREDENTIAL_ID", name: "Gmail account" } };
  if (node.parameters.genericAuthType === "httpHeaderAuth") node.credentials = { httpHeaderAuth: { id: process.env.ACQUISITION_HEADER_CREDENTIAL_ID || "REDACTED_LOCAL_HEADER_CREDENTIAL_ID", name: "Header Auth account" } };
}
fs.writeFileSync("/tmp/acquisition-workflow.json", JSON.stringify(workflow));
fs.writeFileSync("/tmp/acquisition-workflow.sha256", hash);
console.log("changed");
')
if [[ "$workflow_changed" == "changed" ]]; then
  docker compose exec -T n8n n8n import:workflow --input=/tmp/acquisition-workflow.json
  docker compose exec -T n8n cp /tmp/acquisition-workflow.sha256 /home/node/.n8n/acquisition-workflow.sha256
  echo "Updated workflow imported inactive; publish after migration and live verification."
fi

docker compose ps
echo "Dashboard: http://localhost:3000/dashboard"
echo "Apply Now: http://localhost:3000/apply-now"
echo "n8n: http://localhost:5678"
