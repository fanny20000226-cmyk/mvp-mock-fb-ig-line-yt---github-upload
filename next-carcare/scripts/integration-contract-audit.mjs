import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const photoText = await readFile(new URL("docs/n8n-photo-drive-workflow.json", root), "utf8");
const sheetText = await readFile(new URL("docs/n8n-realtime-google-sheets-workflow-template.json", root), "utf8");
const photo = JSON.parse(photoText);
const sheet = JSON.parse(sheetText);

const failures = [];
const photoWebhook = photo.nodes?.find((node) => node.name === "Photo Webhook");
if (photoWebhook?.parameters?.authentication !== "headerAuth") failures.push("Photo Webhook must use Header Auth");
if (!photoWebhook?.credentials?.httpHeaderAuth) failures.push("Photo Webhook credential is missing");
for (const required of ["Search Branch", "Search Customer", "Search Work Order", "Search Photo Phase", "Search Existing Photo", "Upload Photo To Drive"]) {
  if (!photo.nodes?.some((node) => node.name === required)) failures.push(`Photo workflow missing ${required}`);
}
const driveNodes = photo.nodes?.filter((node) => node.type === "n8n-nodes-base.googleDrive") || [];
if (driveNodes.some((node) => node.retryOnFail !== true || Number(node.maxTries || 0) < 3)) failures.push("Every Google Drive node must retry at least three times");

const sheetWebhooks = sheet.nodes?.filter((node) => node.type === "n8n-nodes-base.webhook") || [];
if (!sheetWebhooks.length || sheetWebhooks.some((node) => node.parameters?.authentication !== "headerAuth" || !node.credentials?.httpHeaderAuth)) failures.push("Every realtime Sheets webhook must use Header Auth");
if (/peiway-realtime-sync-2026/.test(photoText + sheetText)) failures.push("Hard-coded legacy N8N secret detected");
if (!sheet.nodes?.some((node) => /Respond/i.test(String(node.name)))) failures.push("Realtime Sheets workflow must return an acknowledgement");

if (failures.length) throw new Error(`Integration contract audit failed:\n${failures.join("\n")}`);
console.log(`Integration contract audit passed: ${photo.nodes.length} photo nodes and ${sheet.nodes.length} realtime nodes checked.`);
