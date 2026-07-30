# PEIWAY N8N Google Sheets Realtime Sync

This addition keeps the existing N8N manual trigger and daily 09:00 Google Sheets workflow intact.
It only adds a realtime single-record path from the web system to the same N8N workflow.

## System Side

When the system finishes saving data to Supabase, it sends a non-blocking POST to:

```text
/api/n8n/realtime-sync
```

The API reads the existing N8N webhook URL from `n8n_connection_settings`.
If N8N is disabled or fails, the system still saves the business data normally and writes the dispatch result to `n8n_event_dispatch_logs`.

Realtime events:

```json
{
  "event_type": "sheet_sync",
  "channel": "google_sheets",
  "content_params": {
    "sync_type": "customer",
    "source_table": "customers",
    "operation": "upsert",
    "unique_key": "customer-uuid",
    "sheet_name": "客戶主檔",
    "record": {},
    "security_key": "same-as-n8n-secret"
  }
}
```

`sync_type` values:

- `customer`: write to Google Sheets tab `客戶主檔`
- `finance`: write to Google Sheets tab `交易財務明細`

## N8N Required Variables

Set these in N8N Variables or credentials:

```text
GOOGLE_REPORT_SHEET_ID=your-google-sheet-id
PEIWAY_REALTIME_SYNC_KEY=same-value-as-vercel-N8N_WEBHOOK_SECRET
```

Set this in Vercel project environment variables:

```text
N8N_WEBHOOK_SECRET=same-value-as-n8n-PEIWAY_REALTIME_SYNC_KEY
```

The app already stores the N8N production webhook URL in:

```text
N8N 聯動 -> N8N 連線設定
```

Use the production `/webhook/` URL, not the temporary `/webhook-test/` URL.

## N8N Workflow Change

Do not delete the existing manual trigger or daily 09:00 schedule.
Add one parallel Webhook trigger node to the same workflow.

Recommended logic:

1. Webhook trigger receives POST payload.
2. IF node checks `{{$json.content_params.security_key}}` equals `{{$vars.PEIWAY_REALTIME_SYNC_KEY}}`.
3. Switch node checks `{{$json.content_params.sync_type}}`.
4. Customer branch:
   - Read tab `客戶主檔`.
   - Search the unique ID column for `{{$json.content_params.unique_key}}`.
   - If found, update that row.
   - If not found, append a new row.
5. Finance branch:
   - Read tab `交易財務明細`.
   - Search the unique ID column for `{{$json.content_params.unique_key}}`.
   - If found, update that row.
   - If not found, append a new row.
6. Respond to webhook with success or failure.
7. Optional: POST callback to `{{$json.callback_webhook_url}}`.

## Test Page

Open:

```text
/settings/n8n-realtime
```

Buttons:

- `測試客戶即時同步`
- `測試財務即時同步`

Each button creates one test Supabase row, calls N8N, then deletes the test row.
The old Google Sheets data is not overwritten or deleted by the app.

## Upsert Keys

N8N should use:

- Customer tab unique key: `content_params.unique_key`
- Finance tab unique key: `content_params.unique_key`

This prevents duplicate rows when the same record is sent more than once.
