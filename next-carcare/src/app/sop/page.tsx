"use client";

import { useState } from "react";
import RequireAuth from "@/components/RequireAuth";

const docs = [
  { title: "正式系統架構與資料來源", tag: "架構", body: "Vercel 提供主系統與 Monitor 介面，Supabase Auth、Database、Storage 是正式資料來源，N8N 負責核准事件與增量資料同步到 Google Sheets。同步失敗不影響 Supabase 已完成的營運寫入。" },
  { title: "帳號、角色、RLS 與多門市隔離", tag: "資安", body: "users 綁定 tenant_id、shop_id、role 與 active。前端選單只負責引導，真正權限由 API 驗證、Supabase RLS 與 Storage Policy 執行。跨門市操作前須確認帳號所屬門市，不得共用 Service Role Key。" },
  { title: "施工照片依客戶與施工單歸檔", tag: "照片", body: "標準路徑為「門市 ID / customers / 客戶 ID / vehicles / 車輛 ID / work-orders / 施工單 ID / before 或 after」。施工頁與技師現場模式會直接上傳到對應資料夾，並在 image_annotations 留下完整關聯。" },
  { title: "舊施工照片整理 SOP", tag: "照片", body: "進入系統設定與治理中心的備份與還原頁籤，先按「掃描待整理照片」核對客戶、施工單、照片、無法比對與錯誤數；確認後按「執行照片歸檔」。原檔保留，無法精確判定施工單者不得強制搬移。" },
  { title: "N8N → Google Sheets 同步與 Retry", tag: "同步", body: "系統送出既有 webhook payload；失敗依設定自動重試，最終失敗回寫 sync_status 並通知。員工頁僅顯示已同步、待同步或同步失敗；錯誤堆疊、Webhook 與憑證資訊只能在 Monitor 或管理後台查看。" },
  { title: "Audit Log 查詢與匯出", tag: "稽核", body: "報價、客戶、薪資、預約、收款、刪除單據及權限異動由資料庫 trigger 留存操作人、時間與修改前後內容。管理員可在治理中心搜尋並匯出 CSV；不得直接修改或刪除 Audit Log。" },
  { title: "資料庫與照片備份／還原", tag: "備份", body: "確認最近備份狀態為 completed 並記錄影響範圍；還原前由管理員核對工作編號與照片清單，輸入指定確認文字後執行。完成後驗證主要資料表、施工照片、登入權限與 N8N 增量同步。" },
  { title: "Vercel 正式部署 SOP", tag: "部署", body: "先完成 TypeScript、build、RLS 與 Storage 回歸測試，再合併主分支並確認 Vercel Production Ready。SUPABASE_SERVICE_ROLE_KEY、CRON_SECRET 與 Webhook 密鑰只能放在平台環境變數，禁止使用 NEXT_PUBLIC_ 前綴。" },
  { title: "BI 管理儀表板驗證", tag: "BI", body: "確認各門市營收、客單價、預約達成率、報價成交率、毛利、客源與門市排名皆能依日期及門市篩選；點擊卡片後應帶入對應清單條件，金額與財務報表抽樣核對。" },
  { title: "常見錯誤與故障排除", tag: "排錯", body: "缺少客戶先回客戶頁建檔；Storage 失敗確認 bucket 與路徑第一層門市 UUID；權限不足檢查 users.active、role、shop_id、tenant_id；同步失敗依事件編號查看 Retry；正式頁未更新則確認 Vercel 目前部署版本。" },
];

export default function SopPage() {
  const [query, setQuery] = useState("");
  const normalized = query.trim().toLowerCase();
  const visible = docs.filter((doc) => `${doc.tag} ${doc.title} ${doc.body}`.toLowerCase().includes(normalized));

  return (
    <RequireAuth>
      <section className="space-y-5">
        <div className="card">
          <p className="text-sm font-black text-carcare-yellow">PEIWAY Knowledge Base</p>
          <h1 className="text-2xl font-black">線上 SOP 文件中心</h1>
          <p className="mt-1 text-sm text-neutral-500">正式架構、照片歸檔、同步、資安、備份與故障排除的一致操作依據。</p>
          <p className="mt-1 text-xs font-bold text-neutral-500">內容版本：2026-08-19</p>
          <label className="mt-4 block">
            <span className="field-label">搜尋文件</span>
            <input className="form-input" placeholder="例如：照片、同步、備份、權限" value={query} onChange={(event) => setQuery(event.target.value)} />
          </label>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {visible.map((doc) => (
            <article key={doc.title} className="card">
              <span className="rounded-full bg-neutral-900 px-2.5 py-1 text-xs font-black text-white">{doc.tag}</span>
              <h2 className="mt-3 text-lg font-black">{doc.title}</h2>
              <p className="mt-3 leading-7 text-neutral-700">{doc.body}</p>
            </article>
          ))}
        </div>
        {!visible.length ? <div className="card text-sm text-neutral-500">找不到相符文件，請改用「照片、同步、備份、權限」等關鍵字。</div> : null}
      </section>
    </RequireAuth>
  );
}
