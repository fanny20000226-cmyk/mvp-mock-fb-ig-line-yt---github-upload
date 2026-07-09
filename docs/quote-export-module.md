# 報價單 PDF / 圖片匯出增量模組

## 新增內容
- 前端新增 `quote-export.js`、`quote-export.css`，在營運/訂單區增加「報價單匯出」與「工單追溯」入口。
- 後端範例新增 `backend/modules/quote/routes.js`，提供 `/api/quote/export-pdf/:quote_id`、`/api/quote/export-image/:quote_id`。
- SQL 新增 `docs/sql/quote_export_incremental.sql`，只追加 `pdf_file_path`、`img_file_path` 欄位。

## 權限規則
- 總部管理員、門店店長、業務接待可匯出。
- 技師與員工角色隱藏匯出功能。
- 後端範例保留 `assertQuotePermission` 入口，可串接現有 token 使用者資料。

## 測試流程
1. 進入後台營運管理。
2. 點「報價單匯出」。
3. 點「下載PDF報價單」或「匯出圖片傳送客戶」。
4. 點「轉工單」後，到「工單追溯」點「查看原始報價單」。

## 備註
- GitHub Pages 版本為純前端 PWA，因此先使用本地資料產生可下載 PDF/PNG。
- 正式後端部署時，請安裝 `pdfkit`、`sharp`，並掛載 `backend/modules/quote/routes.js`。
