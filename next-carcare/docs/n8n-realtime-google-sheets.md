# PEIWAY N8N Google Sheets Realtime Sync

This realtime workflow is separate from the existing daily 09:00 report workflow.
Do not delete or edit the existing workflow that syncs the five report tabs:

- 客戶主檔
- 車輛檔案
- 報價施工工單
- 預約紀錄
- 交易財務明細

## What This Adds

The web system sends realtime events after these records are saved:

- Customer / vehicle archive data
- Finance payment records
- Staff salary records

The send is non-blocking. If N8N or Google Sheets fails, the system still saves the business record normally and records an error log.

## Required N8N Variables

Set these in N8N Variables:

```text
GOOGLE_REPORT_SHEET_ID=your_report_google_sheet_id
GOOGLE_SALARY_SHEET_ID=1b8bM9hQxrFR-wbCc9PQMHJFBpvK4amqIp0AYp5rI-O0
PEIWAY_REALTIME_SYNC_KEY=your_shared_secret
```

`PEIWAY_REALTIME_SYNC_KEY` must be the same value as the Vercel environment variable below.

## Required Vercel Environment Variables

Set these in Vercel:

```text
N8N_WEBHOOK_SECRET=your_shared_secret
GOOGLE_REPORT_SHEET_ID=your_report_google_sheet_id
GOOGLE_SALARY_SHEET_ID=1b8bM9hQxrFR-wbCc9PQMHJFBpvK4amqIp0AYp5rI-O0
```

After changing Vercel environment variables, redeploy production.

## Salary Cloud Sheet

Salary records are sent to:

```text
Spreadsheet title: PEIWAY 員工薪資明細表（雲端建檔）
Spreadsheet ID: 1b8bM9hQxrFR-wbCc9PQMHJFBpvK4amqIp0AYp5rI-O0
Sheet tab name: 員工薪資明細表（雲端建檔）
```

The first row headers are:

```text
薪資年/月, 員工編號, 員工姓名, 職稱, 門市, 本薪, 職務津貼, 伙食津貼, 全勤獎金, 加班費, 交通津貼, 激勵獎金, 外派支援津貼, 應休未休, 帶人金, 績效獎金, 業績獎金, 勞保費(自付), 健保費(自付), 勞退自提, 事病假扣款, 預支, kip未達標扣款, 應給總額, 應扣總額, 實領金額, 建檔時間, 建立人, 系統薪資紀錄ID
```

## Payload Contract

The system sends this shape:

```json
{
  "event_type": "sheet_sync",
  "channel": "google_sheets",
  "content_params": {
    "sync_type": "salary",
    "source_table": "salary_records",
    "operation": "insert",
    "unique_key": "salary-record-id",
    "sheet_name": "員工薪資明細表（雲端建檔）",
    "target_sheet_id": "1b8bM9hQxrFR-wbCc9PQMHJFBpvK4amqIp0AYp5rI-O0",
    "record": {},
    "security_key": "same-as-N8N_WEBHOOK_SECRET"
  }
}
```

`sync_type` values:

- `customer`: upsert into `客戶主檔`
- `finance`: upsert into `交易財務明細`
- `salary`: append or upsert into `員工薪資明細表（雲端建檔）`

Use the payload `target_sheet_id` when present. If it is empty, fall back to the matching N8N variable.

## Test Page

Open this page in the system:

```text
/settings/n8n-realtime
```

Use the realtime sync test buttons for customer and finance. Salary sync is triggered from the HR payroll page when a salary record is saved.

## Troubleshooting

- If the N8N test says `invalid security key`, make sure `PEIWAY_REALTIME_SYNC_KEY` and `N8N_WEBHOOK_SECRET` are identical.
- If Google Sheets nodes fail, reselect the Google Sheets credential in the N8N Google Sheets nodes.
- If salary records save in the system but do not appear in Google Sheets, check that `GOOGLE_SALARY_SHEET_ID` points to `1b8bM9hQxrFR-wbCc9PQMHJFBpvK4amqIp0AYp5rI-O0`.
- If the website saves data but Google Sheets does not update, check N8N executions first. The website intentionally does not block business saving when sync fails.
