# PEIWAY N8N Google Sheets Realtime Sync

This realtime workflow is separate from the existing daily 09:00 report workflow.
Do not delete or edit the existing workflow that syncs these five report tabs:

- 客戶主檔
- 車輛檔案
- 報價施工工單
- 預約紀錄
- 交易財務明細

## What This Adds

The web system already sends realtime events after these records are saved:

- Customer / vehicle archive data
- Finance payment records

The send is non-blocking. If N8N or Google Sheets fails, the system still saves the business record normally.

## Import The N8N Workflow

Import this file into N8N as a new workflow:

```text
next-carcare/docs/n8n-realtime-google-sheets-workflow-template.json
```

After import, open both Google Sheets nodes and choose the existing Google Sheets OAuth credential:

- `Upsert Customer Sheet`
- `Upsert Finance Sheet`

Then publish/activate the workflow.

## Required N8N Variables

Set these in N8N Variables:

```text
GOOGLE_REPORT_SHEET_ID=your_google_sheet_id
PEIWAY_REALTIME_SYNC_KEY=your_shared_secret
```

`PEIWAY_REALTIME_SYNC_KEY` must be the same value as the Vercel environment variable below.

## Required Vercel Environment Variable

Set this in Vercel:

```text
N8N_WEBHOOK_SECRET=your_shared_secret
```

After changing Vercel environment variables, redeploy production.

## Webhook URL

The imported N8N workflow creates this production webhook path:

```text
/webhook/peiway-realtime-sheets
```

Copy the full production URL from the N8N Webhook node, then paste it into the system page:

```text
N8N 聯動 -> N8N 連線設定 -> N8N Webhook網址
```

Use the production `/webhook/` URL.
Do not use the temporary `/webhook-test/` URL.

## Payload Contract

The system sends this shape:

```json
{
  "event_type": "sheet_sync",
  "channel": "google_sheets",
  "content_params": {
    "sync_type": "customer",
    "source_table": "customers",
    "operation": "upsert",
    "unique_key": "record-id",
    "sheet_name": "客戶主檔",
    "record": {},
    "security_key": "same-as-N8N_WEBHOOK_SECRET"
  }
}
```

`sync_type` values:

- `customer`: upsert into `客戶主檔`
- `finance`: upsert into `交易財務明細`

The Google Sheets nodes use `id` as the matching column.
If the same record is sent again, the existing row is updated instead of duplicated.

## Test Page

Open this page in the system:

```text
/settings/n8n-realtime
```

Use:

- `測試客戶即時同步`
- `測試財務即時同步`

Each test creates a temporary Supabase row, calls N8N, then cleans up the temporary database row.

## Troubleshooting

- If the N8N test says `invalid security key`, make sure `PEIWAY_REALTIME_SYNC_KEY` and `N8N_WEBHOOK_SECRET` are identical.
- If Google Sheets nodes fail, reselect the Google Sheets credential in both upsert nodes.
- If the website saves data but Google Sheets does not update, check N8N executions first. The website intentionally does not block business saving when sync fails.
