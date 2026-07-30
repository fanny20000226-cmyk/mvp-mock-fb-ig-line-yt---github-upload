# PEIWAY 系統自動測試使用說明

## 目的

這套測試只檢查資料傳送鏈路，不修改既有報價、PDF、人資、財務、預約或 N8N 每日 09:00 Google Sheets 同步流程。

測試流程：

1. 建立測試客戶資料。
2. 建立測試車輛資料。
3. 建立測試預約資料。
4. 建立測試報價單。
5. 逐欄比對姓名、電話、車牌、車型、預約時間、方案金額。
6. 呼叫 N8N Webhook，觸發一次 `system_test` 同步測試。
7. 自動刪除測試產生的 customers、cars、reservations、quotations 資料。
8. 保留測試報告在 `system_test_runs`。

## Supabase SQL

先到 Supabase SQL Editor 執行：

```text
supabase-step16-system-tests.sql
```

這只會新增 `system_test_runs` 測試報告表，不會改舊資料表。

## 後台入口

登入系統後進入：

```text
N8N 聯動 -> 系統自動測試
```

手動按鈕：

```text
執行資料庫傳送測試
```

## 自動巡檢

Vercel Cron 會每 2 小時呼叫：

```text
/api/system-test/cron
```

這個 Cron 只執行輕量資料寫入與清理測試，不會影響 N8N 每日 09:00 排程同步。

## N8N 設定

可以匯入範本：

```text
docs/system-test-n8n-workflow.json
```

必要環境變數：

```text
SUPABASE_URL=https://qhbdjeiieeiynuvlrltp.supabase.co
SUPABASE_ANON_KEY=你的 Supabase anon key
```

匯入後，複製該 Webhook 的 Production URL，貼到系統：

```text
N8N 聯動 -> N8N 連線設定 -> N8N 接收 Webhook URL
```

回呼網址使用系統自動顯示的：

```text
https://car-shop-manage.vercel.app/api/n8n/callback
```

## 測試資料規則

測試資料會帶有：

```text
TEST-AUTO-
```

正常情況下測試完成會自動清除。如果有清除失敗，報告頁會顯示失敗的資料表與 id。
