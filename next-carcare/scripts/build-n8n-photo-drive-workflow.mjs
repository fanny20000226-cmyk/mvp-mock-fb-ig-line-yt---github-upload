import { writeFile } from "node:fs/promises";

const outputPath = process.argv[2] || new URL("../docs/n8n-photo-drive-workflow.json", import.meta.url);
const driveCredential = {
  googleDriveOAuth2Api: {
    id: process.env.N8N_GOOGLE_DRIVE_CREDENTIAL_ID || "cajZJafxP1SsZT4B",
    name: "Google Drive account",
  },
};

const retrySettings = {
  retryOnFail: true,
  maxTries: 3,
  waitBetweenTries: 1000,
};

function codeNode(id, name, jsCode, position) {
  return {
    parameters: { jsCode },
    id,
    name,
    type: "n8n-nodes-base.code",
    typeVersion: 2,
    position,
  };
}

function ifNode(id, name, leftValue, position) {
  return {
    parameters: {
      conditions: {
        options: { caseSensitive: true, leftValue: "", typeValidation: "strict", version: 1 },
        conditions: [{
          id: `${id}-condition`,
          leftValue,
          rightValue: true,
          operator: { type: "boolean", operation: "true", singleValue: true },
        }],
        combinator: "and",
      },
      options: {},
    },
    id,
    name,
    type: "n8n-nodes-base.if",
    typeVersion: 2,
    position,
  };
}

function driveSearchNode(id, name, queryString, position) {
  return {
    parameters: {
      resource: "fileFolder",
      operation: "search",
      searchMethod: "query",
      queryString,
      returnAll: false,
      limit: 1,
      filter: {},
      options: {},
    },
    id,
    name,
    type: "n8n-nodes-base.googleDrive",
    typeVersion: 3,
    position,
    credentials: driveCredential,
    alwaysOutputData: true,
    ...retrySettings,
  };
}

function driveFolderNode(id, name, folderName, parentFolderId, position) {
  return {
    parameters: {
      resource: "folder",
      operation: "create",
      name: folderName,
      driveId: { __rl: true, value: "My Drive", mode: "list", cachedResultName: "My Drive" },
      folderId: { __rl: true, value: parentFolderId, mode: "id" },
      options: {},
    },
    id,
    name,
    type: "n8n-nodes-base.googleDrive",
    typeVersion: 3,
    position,
    credentials: driveCredential,
    ...retrySettings,
  };
}

function connect(node) {
  return { node, type: "main", index: 0 };
}

const normalizeCode = String.raw`const incoming = $input.first().json || {};
const payload = incoming.body || incoming;
const params = payload.content_params || {};
const clean = (value, fallback = '') => {
  const text = String(value || fallback).trim().replace(/[\\/<>:*?|"'#%{}~&]/g, '_').replace(/\s+/g, ' ');
  return text.slice(0, 120) || fallback;
};
const suppliedKey = String(params.security_key || payload.security_key || '').trim();
const shopName = clean(params.shop_name || payload.store_name || payload.shop_name, '未分類');
const supportedBranches = ['三重', '桃園', '新竹', '台南'];
const branchName = supportedBranches.find((name) => shopName.includes(name)) || shopName;
const customerId = clean(params.customer_id, 'unknown-customer');
const carId = clean(params.car_id, 'unknown-car');
const orderId = clean(params.construction_order_id || payload.work_order_id, 'unknown-order');
const phase = String(params.phase || 'before') === 'after' ? 'after' : 'before';
const phaseName = phase === 'after' ? '施工後' : '施工前';
const uploadedAt = String(params.uploaded_at || new Date().toISOString());
const stamp = uploadedAt.replace(/[^0-9]/g, '').slice(0, 14) || Date.now().toString();
const originalFileName = clean(params.file_name, 'photo.jpg');

return [{ json: {
  ok: suppliedKey === 'peiway-realtime-sync-2026' && Boolean(params.image_url),
  error: suppliedKey !== 'peiway-realtime-sync-2026' ? 'invalid security key' : (!params.image_url ? 'missing image_url' : ''),
  event_no: payload.event_no || '',
  annotation_id: params.annotation_id || '',
  image_url: params.image_url || '',
  storage_path: params.storage_path || '',
  content_type: params.content_type || 'image/jpeg',
  uploaded_at: uploadedAt,
  shop_id: params.shop_id || payload.store_id || '',
  shop_name: shopName,
  branch_folder_name: clean(branchName, '未分類'),
  customer_id: params.customer_id || '',
  customer_folder_name: clean((params.customer_name || '未命名客戶') + '__' + customerId),
  car_id: params.car_id || '',
  vehicle_folder_name: clean((params.plate || params.model || '未填車牌') + '__' + carId),
  construction_order_id: params.construction_order_id || payload.work_order_id || '',
  order_no: params.order_no || params.construction_order_id || payload.work_order_id || '',
  order_folder_name: clean((params.order_no || orderId) + '__' + orderId),
  phase,
  phase_folder_name: clean(phaseName + '__' + orderId),
  drive_file_name: clean(stamp + '__' + originalFileName, stamp + '__photo.jpg'),
  google_drive_root_folder_id: params.google_drive_root_folder_id || '1r3-xJbC5OHkgo2ZbSY_NHCzWEEzRqmGJ'
}}];`;

const folderMime = "application/vnd.google-apps.folder";
const workflow = {
  name: "PEIWAY 施工照片同步到 Google Drive",
  nodes: [
    {
      parameters: { httpMethod: "POST", path: "peiway-photo-drive", responseMode: "responseNode", options: {} },
      id: "photo-webhook",
      name: "Photo Webhook",
      type: "n8n-nodes-base.webhook",
      typeVersion: 2,
      position: [-1400, 0],
      webhookId: "peiway-photo-drive",
    },
    codeNode("normalize-photo", "Normalize Photo", normalizeCode, [-1180, 0]),
    ifNode("photo-security-valid", "Photo Security Is Valid", "={{ $json.ok }}", [-960, 0]),
    driveSearchNode(
      "search-branch",
      "Search Branch",
      `={{ "name = '" + $json.branch_folder_name + "' and '" + $json.google_drive_root_folder_id + "' in parents and mimeType = '${folderMime}' and trashed = false" }}`,
      [-720, -180],
    ),
    ifNode("branch-exists", "Branch Exists", "={{ Boolean($json.id) }}", [-500, -180]),
    driveFolderNode("create-branch", "Create Branch", "={{ $('Normalize Photo').first().json.branch_folder_name }}", "={{ $('Normalize Photo').first().json.google_drive_root_folder_id }}", [-280, -20]),
    codeNode("set-branch", "Set Branch Context", "const base = $('Normalize Photo').first().json; return [{ json: { ...base, branch_folder_id: $json.id } }];", [-40, -180]),
    driveSearchNode(
      "search-customer",
      "Search Customer",
      `={{ "name = '" + $json.customer_folder_name + "' and '" + $json.branch_folder_id + "' in parents and mimeType = '${folderMime}' and trashed = false" }}`,
      [180, -180],
    ),
    ifNode("customer-exists", "Customer Exists", "={{ Boolean($json.id) }}", [400, -180]),
    driveFolderNode("create-customer", "Create Customer", "={{ $('Set Branch Context').first().json.customer_folder_name }}", "={{ $('Set Branch Context').first().json.branch_folder_id }}", [620, -20]),
    codeNode("set-customer", "Set Customer Context", "const base = $('Set Branch Context').first().json; return [{ json: { ...base, customer_folder_id: $json.id } }];", [860, -180]),
    driveSearchNode(
      "search-vehicle",
      "Search Vehicle",
      `={{ "name = '" + $json.vehicle_folder_name + "' and '" + $json.customer_folder_id + "' in parents and mimeType = '${folderMime}' and trashed = false" }}`,
      [1080, -180],
    ),
    ifNode("vehicle-exists", "Vehicle Exists", "={{ Boolean($json.id) }}", [1300, -180]),
    driveFolderNode("create-vehicle", "Create Vehicle", "={{ $('Set Customer Context').first().json.vehicle_folder_name }}", "={{ $('Set Customer Context').first().json.customer_folder_id }}", [1520, -20]),
    codeNode("set-vehicle", "Set Vehicle Context", "const base = $('Set Customer Context').first().json; return [{ json: { ...base, vehicle_folder_id: $json.id } }];", [1760, -180]),
    driveSearchNode(
      "search-order",
      "Search Work Order",
      `={{ "name = '" + $json.order_folder_name + "' and '" + $json.vehicle_folder_id + "' in parents and mimeType = '${folderMime}' and trashed = false" }}`,
      [1980, -180],
    ),
    ifNode("order-exists", "Work Order Exists", "={{ Boolean($json.id) }}", [2200, -180]),
    driveFolderNode("create-order", "Create Work Order", "={{ $('Set Vehicle Context').first().json.order_folder_name }}", "={{ $('Set Vehicle Context').first().json.vehicle_folder_id }}", [2420, -20]),
    codeNode("set-order", "Set Work Order Context", "const base = $('Set Vehicle Context').first().json; return [{ json: { ...base, work_order_folder_id: $json.id } }];", [2660, -180]),
    driveSearchNode(
      "search-phase",
      "Search Photo Phase",
      `={{ "name = '" + $json.phase_folder_name + "' and '" + $json.work_order_folder_id + "' in parents and mimeType = '${folderMime}' and trashed = false" }}`,
      [2880, -180],
    ),
    ifNode("phase-exists", "Photo Phase Exists", "={{ Boolean($json.id) }}", [3100, -180]),
    driveFolderNode("create-phase", "Create Photo Phase", "={{ $('Set Work Order Context').first().json.phase_folder_name }}", "={{ $('Set Work Order Context').first().json.work_order_folder_id }}", [3320, -20]),
    codeNode("set-phase", "Set Photo Phase Context", "const base = $('Set Work Order Context').first().json; return [{ json: { ...base, phase_folder_id: $json.id } }];", [3560, -180]),
    driveSearchNode(
      "search-existing-photo",
      "Search Existing Photo",
      `={{ "name = '" + $json.drive_file_name + "' and '" + $json.phase_folder_id + "' in parents and trashed = false" }}`,
      [3780, -180],
    ),
    ifNode("photo-already-synced", "Photo Already Synced", "={{ Boolean($json.id) }}", [4000, -180]),
    {
      parameters: {
        url: "={{ $('Set Photo Phase Context').first().json.image_url }}",
        options: { response: { response: { responseFormat: "file", outputPropertyName: "data" } } },
      },
      id: "download-supabase-photo",
      name: "Download Supabase Photo",
      type: "n8n-nodes-base.httpRequest",
      typeVersion: 4.2,
      position: [4220, -20],
      ...retrySettings,
    },
    {
      parameters: {
        resource: "file",
        operation: "upload",
        inputDataFieldName: "data",
        name: "={{ $('Set Photo Phase Context').first().json.drive_file_name }}",
        driveId: { __rl: true, value: "My Drive", mode: "list", cachedResultName: "My Drive" },
        folderId: { __rl: true, value: "={{ $('Set Photo Phase Context').first().json.phase_folder_id }}", mode: "id" },
        options: {},
      },
      id: "upload-drive-photo",
      name: "Upload Photo To Drive",
      type: "n8n-nodes-base.googleDrive",
      typeVersion: 3,
      position: [4440, -20],
      credentials: driveCredential,
      ...retrySettings,
    },
    {
      parameters: {
        respondWith: "json",
        responseBody: "={{ { ok: true, status: 'synced', sync_type: 'photo', event_no: $('Normalize Photo').first().json.event_no, annotation_id: $('Normalize Photo').first().json.annotation_id, file_id: $json.id || '', folder_id: $('Set Photo Phase Context').first().json.phase_folder_id, web_url: $json.webViewLink || ($json.id ? 'https://drive.google.com/file/d/' + $json.id + '/view' : ''), execution_id: $execution.id } }}",
        options: {},
      },
      id: "respond-photo-success",
      name: "Respond Photo Success",
      type: "n8n-nodes-base.respondToWebhook",
      typeVersion: 1,
      position: [4660, -180],
    },
    {
      parameters: {
        respondWith: "json",
        responseCode: 401,
        responseBody: "={{ { ok: false, status: 'rejected', error: $json.error || 'invalid photo sync payload', execution_id: $execution.id } }}",
        options: {},
      },
      id: "respond-photo-invalid",
      name: "Respond Photo Invalid",
      type: "n8n-nodes-base.respondToWebhook",
      typeVersion: 1,
      position: [-720, 180],
    },
  ],
  connections: {
    "Photo Webhook": { main: [[connect("Normalize Photo")]] },
    "Normalize Photo": { main: [[connect("Photo Security Is Valid")]] },
    "Photo Security Is Valid": { main: [[connect("Search Branch")], [connect("Respond Photo Invalid")]] },
    "Search Branch": { main: [[connect("Branch Exists")]] },
    "Branch Exists": { main: [[connect("Set Branch Context")], [connect("Create Branch")]] },
    "Create Branch": { main: [[connect("Set Branch Context")]] },
    "Set Branch Context": { main: [[connect("Search Customer")]] },
    "Search Customer": { main: [[connect("Customer Exists")]] },
    "Customer Exists": { main: [[connect("Set Customer Context")], [connect("Create Customer")]] },
    "Create Customer": { main: [[connect("Set Customer Context")]] },
    "Set Customer Context": { main: [[connect("Search Vehicle")]] },
    "Search Vehicle": { main: [[connect("Vehicle Exists")]] },
    "Vehicle Exists": { main: [[connect("Set Vehicle Context")], [connect("Create Vehicle")]] },
    "Create Vehicle": { main: [[connect("Set Vehicle Context")]] },
    "Set Vehicle Context": { main: [[connect("Search Work Order")]] },
    "Search Work Order": { main: [[connect("Work Order Exists")]] },
    "Work Order Exists": { main: [[connect("Set Work Order Context")], [connect("Create Work Order")]] },
    "Create Work Order": { main: [[connect("Set Work Order Context")]] },
    "Set Work Order Context": { main: [[connect("Search Photo Phase")]] },
    "Search Photo Phase": { main: [[connect("Photo Phase Exists")]] },
    "Photo Phase Exists": { main: [[connect("Set Photo Phase Context")], [connect("Create Photo Phase")]] },
    "Create Photo Phase": { main: [[connect("Set Photo Phase Context")]] },
    "Set Photo Phase Context": { main: [[connect("Search Existing Photo")]] },
    "Search Existing Photo": { main: [[connect("Photo Already Synced")]] },
    "Photo Already Synced": { main: [[connect("Respond Photo Success")], [connect("Download Supabase Photo")]] },
    "Download Supabase Photo": { main: [[connect("Upload Photo To Drive")]] },
    "Upload Photo To Drive": { main: [[connect("Respond Photo Success")]] },
  },
  pinData: {},
  settings: { executionOrder: "v1", timezone: "Asia/Taipei" },
  active: false,
  versionId: "peiway-photo-drive-v1",
  meta: { templateCredsSetupCompleted: true },
  tags: [],
};

await writeFile(outputPath, `${JSON.stringify(workflow, null, 2)}\n`, "utf8");
console.log(`Photo workflow written to ${outputPath}`);
