import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const apiRoot = fileURLToPath(new URL("../src/app/api/", import.meta.url));
const sourceRoot = fileURLToPath(new URL("../src/", import.meta.url));
const sensitivePattern = /getSupabaseAdmin|send(?:Event|Sheet|Photo|Employee|Attendance).*N8n|recordN8nCallback|upsertN8nSettings/;
const protectionPattern = /requireServerProfile|assertSystemTestAccess|requireN8nWebhookSecret|CRON_SECRET|ADMIN_BOOTSTRAP_KEY|maintenanceAuth|auth\.getUser/;
const leakedSecretPattern = /peiway-realtime-sync-\d{4}/;

async function filesUnder(directory, suffix) {
  const entries = await readdir(directory, { withFileTypes: true });
  const output = [];
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) output.push(...await filesUnder(path, suffix));
    else if (path.endsWith(suffix)) output.push(path);
  }
  return output;
}

const routeFiles = await filesUnder(apiRoot, "route.ts");
const unprotected = [];
for (const file of routeFiles) {
  const source = await readFile(file, "utf8");
  if (sensitivePattern.test(source) && !protectionPattern.test(source)) unprotected.push(file);
}

const sourceFiles = [
  ...await filesUnder(sourceRoot, ".ts"),
  ...await filesUnder(sourceRoot, ".tsx"),
];
const leakedSecrets = [];
for (const file of sourceFiles) {
  const source = await readFile(file, "utf8");
  if (leakedSecretPattern.test(source)) leakedSecrets.push(file);
}

if (unprotected.length || leakedSecrets.length) {
  if (unprotected.length) console.error("Sensitive API routes missing server authorization:\n" + unprotected.join("\n"));
  if (leakedSecrets.length) console.error("Hard-coded N8N secret found in source:\n" + leakedSecrets.join("\n"));
  process.exitCode = 1;
} else {
  console.log(`Security audit passed: ${routeFiles.length} API routes checked.`);
}
