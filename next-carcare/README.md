# car-shop-manage

黑黃白多門店汽車內裝管理系統前端。

## 安裝

```bash
npm install
cp .env.example .env.local
```

將 Supabase anon key 填入 `.env.local`。

需要使用「權限管理 → 新增使用者」時，還要在 Vercel 填入：

```text
SUPABASE_SERVICE_ROLE_KEY
```

## 開發

```bash
npm run dev
```

## 檢查與打包

```bash
npm run lint
npm run typecheck
npm run build
```

## Vercel

專案 Root Directory 設定為：

```text
next-carcare
```

## Supabase Storage

圖片標註上傳前，請到 Supabase SQL Editor 執行：

```text
supabase-storage.sql
```

會建立公開讀取、登入後可上傳的 `car-images` bucket。
