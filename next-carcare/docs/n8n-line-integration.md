# PEIWAY N8N / LINE Notify Integration

本功能採增量方式加入。主系統只負責：

- 儲存 N8N Webhook 設定
- 送出業務事件 JSON 給 N8N
- 接收 N8N 發送結果回呼
- 留存 LINE 通知紀錄

LINE Notify API 的實際呼叫全部在 N8N 工作流內完成，主系統不直接呼叫 LINE API。

## 1. Supabase SQL

先在 Supabase SQL Editor 執行：

```text
supabase-step15-n8n-line-integration.sql
```

新增資料表：

- `n8n_connection_settings`
- `line_notify_settings`
- `line_notify_logs`
- `n8n_event_dispatch_logs`
- `n8n_event_dedup`

## 2. 後台頁面

- `/settings/n8n`：N8N 連線設定、啟用開關、連線測試
- `/settings/line-notify`：員工 LINE Notify Token 與事件開關
- `/settings/line-notify-logs`：N8N 回呼通知紀錄查詢與 CSV 匯出

## 3. 系統送出事件 API

Endpoint:

```http
POST /api/n8n/dispatch
Content-Type: application/json
```

Payload:

```json
{
  "event_no": "TODO-20260727090000-A12BC",
  "event_type": "todo",
  "store_id": "store-uuid",
  "store_name": "桃園門市",
  "staff_info": {
    "staff_id": "T001",
    "employee_name": "王技師",
    "line_notify_token": "LINE_NOTIFY_TOKEN"
  },
  "work_order_id": "WO-20260727-001",
  "quotation_id": "quote-uuid",
  "plate": "ABC-1234",
  "model": "Toyota Altis",
  "receiver": "王技師",
  "message_template": "明日施工提醒",
  "content_params": {
    "title": "明日施工車輛",
    "detail": "09:30 ABC-1234 內裝清潔",
    "line_notify_token": "LINE_NOTIFY_TOKEN"
  }
}
```

`event_type` 可用值：

- `todo`：待辦事項通知
- `abnormal`：缺失異常通知
- `broadcast`：群組廣播
- `connection_test`：連線測試

防轟炸規則：

- `event_type = abnormal` 且有 `work_order_id` 時，同一工單同一異常類型一天只會送一次。

Token 規則：

- 如果 `content_params.line_notify_token` 已存在，系統會直接送給 N8N。
- 如果沒有 Token，系統會用 `staff_info.staff_id` 或 `receiver` 對照 `line_notify_settings`。
- 若該員工對應事件開關已關閉，事件會記錄為 `skipped`，不會送到 N8N。

## 4. N8N 回呼 API

Endpoint:

```http
POST /api/n8n/callback
Content-Type: application/json
```

Payload:

```json
{
  "event_no": "TODO-20260727090000-A12BC",
  "event_type": "todo",
  "send_time": "2026-07-27T09:00:00.000Z",
  "receiver": "王技師",
  "message_content": "【PEIWAY待辦】明日施工車輛...",
  "send_status": "success",
  "error_note": "",
  "store_id": "store-uuid",
  "work_order_id": "WO-20260727-001",
  "plate": "ABC-1234",
  "model": "Toyota Altis",
  "n8n_execution_id": "12345",
  "raw_payload": {}
}
```

`send_status` 建議值：

- `success`
- `failed`
- `pending`
- `skipped`

## 5. N8N Workflow 匯入

匯入檔案：

```text
n8n-peiway-line-notify-workflow.json
```

工作流節點：

1. Webhook 接收門店系統事件
2. Switch 判斷事件種類：待辦、缺失異常、群組廣播
3. Code 組裝 LINE 訊息與 Token
4. HTTP Request 呼叫 LINE Notify API
5. Code 打包成功/失敗結果
6. HTTP Request 回呼門店系統 `/api/n8n/callback`
7. Respond to Webhook 回應主系統

## 6. N8N 聯動開關

當 `/settings/n8n` 的「啟用 N8N 聯動」關閉時：

- 主系統不會 POST 到 N8N
- 事件只會寫入 `n8n_event_dispatch_logs`
- 原本報價、工單、財務、人資功能不受影響

## 7. 事件範例

### 待辦事項

```json
{
  "event_type": "todo",
  "store_name": "三重門市",
  "receiver": "接待人員",
  "plate": "ABC-1234",
  "content_params": {
    "title": "有待處理評估報價單",
    "detail": "新報價單已建立，請協助追蹤客戶確認。"
  }
}
```

### 缺失異常

```json
{
  "event_type": "abnormal",
  "store_name": "桃園門市",
  "work_order_id": "WO-001",
  "plate": "DEF-5678",
  "content_params": {
    "title": "工單已完工但尚未上傳施工照片",
    "detail": "請負責技師於今日內補齊施工前後照片。"
  }
}
```

### 群組廣播

```json
{
  "event_type": "broadcast",
  "store_name": "新竹門市",
  "content_params": {
    "title": "當日門市預約總覽",
    "detail": "今日共 12 台車，2 台待分配施工人員。"
  }
}
```
