const baseUrl = String(process.env.BASE_URL || "").replace(/\/$/, "");
if (!baseUrl) throw new Error("BASE_URL is required, for example http://127.0.0.1:3100");

const checks = [
  { name: "login page", path: "/login", method: "GET", expected: [200] },
  { name: "admin API rejects anonymous access", path: "/api/admin/enterprise", method: "GET", expected: [401, 403] },
  { name: "convert quote rejects anonymous access", path: "/api/operations/convert-quote", method: "POST", expected: [401, 403], body: {} },
  { name: "N8N callback rejects unsigned requests", path: "/api/n8n/callback", method: "POST", expected: [401, 403], body: { status: "success" } },
  { name: "cron rejects missing secret", path: "/api/system-test/cron", method: "GET", expected: [401, 403] },
];

const failures = [];
for (const check of checks) {
  const response = await fetch(`${baseUrl}${check.path}`, {
    method: check.method,
    redirect: "manual",
    headers: check.body ? { "content-type": "application/json" } : undefined,
    body: check.body ? JSON.stringify(check.body) : undefined,
  });
  if (!check.expected.includes(response.status)) failures.push(`${check.name}: expected ${check.expected.join("/")}, received ${response.status}`);
  else console.log(`PASS ${check.name} (${response.status})`);
}

if (failures.length) throw new Error(`Smoke test failed:\n${failures.join("\n")}`);
console.log(`Production smoke test passed: ${checks.length} checks.`);
