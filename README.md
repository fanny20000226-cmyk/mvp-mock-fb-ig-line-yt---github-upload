# 汽車美容門店管理 PWA

這是一套可部署到 GitHub Pages 的汽車美容門店管理漸進式網頁 App，支援 Android、iPhone、iPad 與電腦瀏覽器直接開啟，也可加入手機桌面捷徑，以接近 App 的方式使用。

## 目前功能

- 前台預約與複製貼上快速填單
- 後台管理登入
- 圖片菜單管理：上傳、預覽、替換、上下架、排序
- 前台圖片價目菜單：客戶只可瀏覽與勾選
- 訂單管理、行事曆、客戶資料
- 店長 / 副店長 / 普通店員 / 超級管理員人員格式
- 我的預約：申請改期、申請取消
- 後台取消預約列表與改期紀錄
- CSV 匯出，可用 Excel 或 Google Sheets 開啟
- PWA manifest 與 service worker 離線快取

## 離線資料

GitHub Pages 是靜態網站，沒有伺服器端 SQLite 可直接運行；目前公開版使用瀏覽器本地資料庫 `localStorage` 保存資料，可在同一台裝置上離線使用。  
若未來要改為真正雲端同步或 SQLite 後端，需要另外部署 API 伺服器與資料庫。

## GitHub Pages 部署

本專案已包含自動部署設定：

```text
.github/workflows/pages.yml
```

推送到 `main` 分支後，GitHub Actions 會自動部署到 GitHub Pages。

公開網址格式：

```text
https://fanny20000226-cmyk.github.io/mvp-mock-fb-ig-line-yt---github-upload/
```

## 手機 / 平板使用

### Android Chrome

1. 用 Chrome 開啟公開網址。
2. 點右上角選單。
3. 選擇「加入主畫面」或「安裝應用程式」。
4. 桌面會出現「汽美工作台」圖示。

### iPhone / iPad Safari 或 Chrome

1. 用瀏覽器開啟公開網址。
2. 點分享按鈕。
3. 選擇「加入主畫面」。
4. 桌面會出現「汽美工作台」圖示。

## 後台入口

進入系統後點右上角「後台」即可登入管理端。

目前示範版資料保存在使用者自己的瀏覽器內；換手機或清除瀏覽器資料後，本地資料會重新開始。

## PWA 檔案

- `manifest.json`：手機桌面捷徑與 App 顯示名稱設定
- `service-worker.js`：離線快取
- `pwa-init.js`：註冊 service worker 與快捷入口
- `index.html`：PWA 入口

