import { readFile, writeFile } from "node:fs/promises";

const [sourcePath, realtimeTemplatePath, outputPath] = process.argv.slice(2);
if (!sourcePath || !realtimeTemplatePath || !outputPath) {
  throw new Error("Usage: node fix-n8n-production-workflow.mjs <live-export.json> <realtime-template.json> <output.json>");
}

const workflow = JSON.parse(await readFile(sourcePath, "utf8"));
const template = JSON.parse(await readFile(realtimeTemplatePath, "utf8"));
const byName = (name) => workflow.nodes.find((node) => node.name === name);
const templateNode = (name) => template.nodes.find((node) => node.name === name);

const customerSheet = byName("Upsert Customer Sheet");
const financeSheet = byName("Upsert Finance Sheet");
const salarySheet = byName("Upsert Salary Sheet");
const googleCredential = customerSheet?.credentials || financeSheet?.credentials || salarySheet?.credentials;

if (!customerSheet || !financeSheet || !salarySheet || !googleCredential) {
  throw new Error("The production export is missing one of the required Google Sheets nodes or its credential reference.");
}

function configureGoogleNode(node, { documentId, sheetName, matchingColumn }) {
  node.parameters.documentId.value = documentId;
  node.parameters.sheetName.value = sheetName;
  node.parameters.columns.matchingColumns = [matchingColumn];
  node.credentials = googleCredential;
  node.retryOnFail = true;
  node.maxTries = 3;
  node.waitBetweenTries = 1000;
}

const reportDocument = "={{ $('Validate And Normalize').first().json.target_sheet_id || $vars.GOOGLE_REPORT_SHEET_ID }}";
const salaryDocument = "={{ $('Validate And Normalize').first().json.target_sheet_id || $vars.GOOGLE_SALARY_SHEET_ID || $vars.GOOGLE_REPORT_SHEET_ID }}";

configureGoogleNode(customerSheet, { documentId: reportDocument, sheetName: "客戶主檔", matchingColumn: "id" });
configureGoogleNode(financeSheet, { documentId: reportDocument, sheetName: "交易財務明細", matchingColumn: "id" });
configureGoogleNode(salarySheet, {
  documentId: salaryDocument,
  sheetName: "={{ $('Validate And Normalize').first().json.sheet_name || '每月薪資紀錄' }}",
  matchingColumn: "系統薪資紀錄ID"
});

for (const node of workflow.nodes.filter((item) => item.type === "n8n-nodes-base.googleSheets")) {
  node.retryOnFail = true;
  node.maxTries = 3;
  node.waitBetweenTries = 1000;
}

const switchNode = byName("Route Sync Type");
if (!switchNode) throw new Error("Route Sync Type node is missing.");

const extraKinds = [
  { kind: "employee", map: "Map Employee Row", upsert: "Upsert Employee Sheet", sheet: "員工人事檔", key: "系統員工ID", document: salaryDocument },
  { kind: "attendance", map: "Map Attendance Row", upsert: "Upsert Attendance Sheet", sheet: "出勤紀錄", key: "出勤紀錄ID", document: salaryDocument },
  { kind: "appointment", map: "Map Appointment Row", upsert: "Upsert Appointment Sheet", sheet: "預約紀錄", key: "id", document: reportDocument }
];

for (const entry of extraKinds) {
  const hasRule = switchNode.parameters.rules.values.some((rule) => rule.outputKey === entry.kind);
  if (!hasRule) {
    switchNode.parameters.rules.values.push({
      conditions: {
        options: { caseSensitive: true, leftValue: "", typeValidation: "strict" },
        conditions: [{
          id: `${entry.kind}-sync`,
          leftValue: "={{ $json.sync_type }}",
          rightValue: entry.kind,
          operator: { type: "string", operation: "equals" }
        }],
        combinator: "and"
      },
      renameOutput: true,
      outputKey: entry.kind
    });
  }
}

for (const name of ["Map Employee Row", "Map Attendance Row", "Upsert Employee Sheet", "Upsert Attendance Sheet"]) {
  if (!byName(name)) {
    const source = templateNode(name);
    if (!source) throw new Error(`Realtime template node is missing: ${name}`);
    workflow.nodes.push(structuredClone(source));
  }
}

byName("Map Attendance Row").parameters.jsCode = `const row = $json.row || {};
const attendanceId = $json.unique_key || row.id || row.attendance_id || '';
return [{ json: {
  "出勤紀錄ID": attendanceId,
  "員工編號": row.employee_no || row.staff_no || row.staff_code || '',
  "日期": row.work_date || row.log_date || row.attendance_date || row.date || '',
  "類型": row.type || row.attendance_type || '出勤',
  "上班時間": row.clock_in_at || row.clock_in || row.start_time || '',
  "下班時間": row.clock_out_at || row.clock_out || row.end_time || '',
  "遲到次數": row.late_count || 0,
  "遲到分鐘": row.late_minutes || 0,
  "加班時數": row.overtime_hour || row.overtime_hours || 0,
  "請假天數": row.leave_days || 0,
  "備註": row.note || row.remark || '',
  "建立時間": row.created_at || '',
  "更新時間": row.updated_at || $json.received_at || ''
}}];`;

configureGoogleNode(byName("Upsert Employee Sheet"), {
  documentId: salaryDocument,
  sheetName: "={{ $('Validate And Normalize').first().json.sheet_name || '員工人事檔' }}",
  matchingColumn: "系統員工ID"
});
configureGoogleNode(byName("Upsert Attendance Sheet"), {
  documentId: salaryDocument,
  sheetName: "={{ $('Validate And Normalize').first().json.sheet_name || '出勤紀錄' }}",
  matchingColumn: "出勤紀錄ID"
});

if (!byName("Map Appointment Row")) {
  workflow.nodes.push({
    parameters: {
      jsCode: "const row = $json.row || {};\nreturn [{ json: {\n  id: $json.unique_key || row.id || '',\n  appointment_no: row.appointment_no || '',\n  customer_name: row.customer_name || row.name || '',\n  customer_phone: row.customer_phone || row.phone || '',\n  license_plate: row.license_plate || row.plate || '',\n  appoint_date: row.appoint_date || row.appointment_date || '',\n  appoint_time: row.appoint_time || row.appointment_time || '',\n  service_content: row.service_content || row.service || '',\n  status: row.status || '',\n  store_id: row.store_id || row.shop_id || '',\n  created_at: row.created_at || '',\n  updated_at: row.updated_at || $json.received_at || ''\n}}];"
    },
    id: "map-appointment-row",
    name: "Map Appointment Row",
    type: "n8n-nodes-base.code",
    typeVersion: 2,
    position: [220, 940]
  });
}

if (!byName("Upsert Appointment Sheet")) {
  const cloned = structuredClone(customerSheet);
  cloned.id = "upsert-appointment-sheet";
  cloned.name = "Upsert Appointment Sheet";
  cloned.position = [480, 940];
  workflow.nodes.push(cloned);
}
configureGoogleNode(byName("Upsert Appointment Sheet"), {
  documentId: reportDocument,
  sheetName: "={{ $('Validate And Normalize').first().json.sheet_name || '預約紀錄' }}",
  matchingColumn: "id"
});

workflow.connections["Route Sync Type"].main = switchNode.parameters.rules.values.map((rule) => {
  const target = extraKinds.find((entry) => entry.kind === rule.outputKey)?.map ||
    ({ customer: "Map Customer Row", finance: "Map Finance Row", salary: "Map Salary Row" })[rule.outputKey];
  return target ? [{ node: target, type: "main", index: 0 }] : [];
});

for (const entry of extraKinds) {
  workflow.connections[entry.map] = { main: [[{ node: entry.upsert, type: "main", index: 0 }]] };
  workflow.connections[entry.upsert] = { main: [[{ node: "Respond Success", type: "main", index: 0 }]] };
}

await writeFile(outputPath, `${JSON.stringify(workflow, null, 2)}\n`, "utf8");
console.log(`Fixed workflow written to ${outputPath}`);
